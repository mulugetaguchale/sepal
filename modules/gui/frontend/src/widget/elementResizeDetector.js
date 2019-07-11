import {Subject} from 'rxjs'
import {compose} from 'compose'
import {debounceTime, distinctUntilChanged} from 'rxjs/operators'
import PropTypes from 'prop-types'
import React from 'react'
import ReactResizeDetector from 'react-resize-detector'
import withSubscriptions from 'subscription'

const UPDATE_DEBOUNCE_MS = 250

const resize$ = new Subject()

export class _ElementResizeDetector extends React.Component {
    render() {
        const {children} = this.props
        return (
            <ReactResizeDetector
                handleHeight
                handleWidth
                onResize={(width, height) => resize$.next({width, height})}>
                {children || null}
            </ReactResizeDetector>
        )
    }

    componentDidMount() {
        const {debounce, onResize, addSubscription} = this.props
        addSubscription(
            resize$.pipe(
                debounceTime(debounce),
                distinctUntilChanged()
            ).subscribe(
                ({width, height}) => onResize({width, height})
            )
        )
    }
}

export const ElementResizeDetector = compose(
    _ElementResizeDetector,
    withSubscriptions()
)

ElementResizeDetector.propTypes = {
    onResize: PropTypes.func.isRequired,
    children: PropTypes.any,
    debounce: PropTypes.number
}

ElementResizeDetector.defaultProps = {
    debounce: UPDATE_DEBOUNCE_MS
}