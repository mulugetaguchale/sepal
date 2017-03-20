package org.openforis.sepal.component.sandboxwebproxy

import io.undertow.server.HttpHandler
import io.undertow.server.HttpServerExchange
import org.slf4j.Logger
import org.slf4j.LoggerFactory

class SandboxProxyHandler implements HttpHandler {
    private final static Logger LOG = LoggerFactory.getLogger(this)
    private final EndpointProvider endpointProvider

    SandboxProxyHandler(EndpointProvider endpointProvider) {
        this.endpointProvider = endpointProvider
    }

    void handleRequest(HttpServerExchange exchange) throws Exception {
        endpointProvider.endpointFor(exchange).forward(exchange)
    }
}