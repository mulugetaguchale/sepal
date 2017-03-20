package org.openforis.sepal.component.sandboxwebproxy

import io.undertow.server.HttpServerExchange
import io.undertow.server.handlers.ResponseCodeHandler
import io.undertow.server.handlers.proxy.LoadBalancingProxyClient
import org.openforis.sepal.undertow.PatchedProxyHandler
import org.slf4j.Logger
import org.slf4j.LoggerFactory

class Endpoint {
    private final static Logger LOG = LoggerFactory.getLogger(this)
    final String username
    final String name
    final URI uri
    final String sandboxSessionId
    final PatchedProxyHandler proxyHandler
    final LoadBalancingProxyClient proxyClient

    Endpoint(String name, String username, URI uri, String sandboxSessionId) {
        this.name = name
        this.username = username
        this.uri = uri
        this.sandboxSessionId = sandboxSessionId
        proxyClient = new LoadBalancingProxyClient()
        proxyClient.addHost(uri)
        proxyHandler = new PatchedProxyHandler(proxyClient, ResponseCodeHandler.HANDLE_404)
    }

    void forward(HttpServerExchange exchange) {
        proxyHandler.handleRequest(exchange)
    }

    void close() {
        proxyClient.removeHost(uri)
    }

    String getSandboxHost() {
        uri.host
    }

    String toString() {
        return "Endpoint{" +
                "username='" + username + '\'' +
                ", name='" + name + '\'' +
                ", uri=" + uri +
                ", sandboxSessionId='" + sandboxSessionId + '\'' +
                '}'
    }
}