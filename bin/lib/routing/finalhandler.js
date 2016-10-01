"use strict";
const onFinished = require('on-finished');
const nova_base_1 = require('nova-base');
// FINAL HANDLER
// =================================================================================================
function finalhandler(request, response, onerror) {
    return function (error) {
        if (!error) {
            // ignore 404 on in-flight response
            if (response.headersSent)
                return;
            // create invalid endpoint error
            error = new nova_base_1.InvalidEndpointError(request['path'] || request.url);
        }
        const status = error.status || 500 /* InternalServerError */;
        const headers = error.headers;
        const body = JSON.stringify((error instanceof nova_base_1.Exception)
            ? error
            : { name: error.name, message: error.message });
        // schedule onerror callback
        if (onerror) {
            setImmediate(onerror, error);
        }
        if (response.headersSent) {
            // cannot actually respond
            request.socket.destroy();
        }
        else {
            // send response
            send(request, response, status, headers, body);
        }
    };
}
exports.finalhandler = finalhandler;
// HELPER FUNCTIONS
// =================================================================================================
function send(request, response, status, headers, body) {
    function write() {
        // response status
        response.statusCode = status;
        // response.statusMessage = STATUS_CODES[status];
        // response headers
        if (headers) {
            for (let key in headers) {
                response.setHeader(key, headers[key]);
            }
        }
        // standard headers
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Content-Length', Buffer.byteLength(body, 'utf8').toString(10));
        if (request.method === 'HEAD') {
            response.end();
        }
        else {
            response.end(body, 'utf8');
        }
    }
    if (onFinished.isFinished(request)) {
        write();
    }
    else {
        // unpipe everything from the request
        request.unpipe();
        // flush the request
        onFinished(request, write);
        request.resume();
    }
}
//# sourceMappingURL=finalhandler.js.map