const {Subject, ReplaySubject} = require('rxjs')
const {finalize, takeUntil, switchMap, first, map} = require('rxjs/operators')
const {Worker, MessageChannel} = require('worker_threads')
const {deserializeError} = require('serialize-error')
const path = require('path')
const _ = require('lodash')
const log = require('@sepal/log')

const WORKER_PATH = path.join(__dirname, 'worker.js')

const createWorker = () =>
    new Worker(WORKER_PATH)

const createChannels = names =>
    _.transform(names, (data, name) => {
        const {port1: localPort, port2: remotePort} = new MessageChannel()
        data.localPorts[name] = localPort
        data.remotePorts[name] = remotePort
    }, {
        localPorts: {},
        remotePorts: {}
    })

const setupPorts = (worker, ports) =>
    worker.postMessage(ports, _.values(ports))

const bootstrapWorker$ = (jobName, channelNames) => {
    const worker$ = new Subject()
    const worker = createWorker(jobName)
    const {localPorts, remotePorts} = createChannels(channelNames)
    worker.once('message', status => {
        if (status === 'READY') {
            worker$.next({worker, ports: localPorts})
        } else {
            worker$.error('Cannot initialize worker.')
        }
    })
    setupPorts(worker, remotePorts)
    return worker$.pipe(
        first()
    )
}

const initWorker$ = (jobName, jobPath) => {
    const init$ = new ReplaySubject()
    const dispose$ = new Subject()

    const submit$ = args => {
        const result$ = new Subject()
        const stop$ = new Subject()

        const handleValue = value => {
            log.trace(`Job: worker <${jobName}> value: ${value}`)
            result$.next(value)
        }

        const handleError = serializedError => {
            const error = deserializeError(serializedError)
            log.error(`Job: worker <${jobName}> error: ${error.message} (${error.type})`)
            result$.error(error)
            stop$.next()
        }

        const handleComplete = () => {
            log.info(`Job: worker <${jobName}> completed`)
            result$.complete()
            stop$.next()
        }

        const handleWorkerMessage = message => {
            message.value && handleValue(message.value)
            message.error && handleError(message.error)
            message.complete && handleComplete()
        }

        const start = port => {
            port.on('message', handleWorkerMessage)
            port.postMessage({start: {jobName, jobPath, args}})
        }

        const stop = port => {
            port.postMessage({stop: true})
            port.off('message', handleWorkerMessage)
        }

        const run$ = port => {
            start(port)
            return result$.pipe(
                finalize(() => stop(port))
            )
        }

        return init$.pipe(
            switchMap(port => run$(port)),
            takeUntil(stop$)
        )
    }

    // bootstrapWorker$(jobName, ['job', 'rateLimit'])
    return bootstrapWorker$(jobName, ['job']).pipe(
        map(
            ({worker, ports: {job: jobPort, rateLimitPort}}) => {
                init$.next(jobPort)
                // const subscription = rateLimiter(rateLimitPort)
                // jobPort.on('message', handleWorkerMessage)

                dispose$.pipe(
                    first()
                ).subscribe(
                    () => {
                        worker.unref() // is this correct? terminate() probably isn't...
                        // subscription.cleanup()
                        log.info(`Job: worker <${jobName}> disposed`)
                    }
                )
                log.info('Job: worker ready')

                return {submit$, dispose$}
            }
        ))
}

module.exports = {
    initWorker$
}
