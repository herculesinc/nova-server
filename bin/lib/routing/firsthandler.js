"use strict";
// IMPORTS
// =================================================================================================
const url = require('url');
const qs = require('querystring');
const proxyaddr = require('proxy-addr');
const onHeaders = require('on-headers');
const nova_base_1 = require('nova-base');
const util_1 = require('./../util');
// MODULE VARIABLES
// =================================================================================================
const headers = {
    SERVER_NAME: 'X-Server-Name',
    API_VERSION: 'X-Api-Version',
    RESPONSE_TIME: 'X-Response-Time'
};
const since = nova_base_1.util.since;
// FIRST HANDLER
// =================================================================================================
function firsthandler(name, version, options, logger) {
    // set up trust function for proxy address
    const trustFunction = util_1.compileTrust(options.trustProxy);
    return function (request, response, next) {
        const start = process.hrtime();
        // log the request
        logger && logger.request(request, response);
        // set basic headers
        onHeaders(response, function () {
            this.setHeader(headers.SERVER_NAME, name);
            this.setHeader(headers.API_VERSION, version);
            this.setHeader(headers.RESPONSE_TIME, Math.round(since(start)).toString());
        });
        // parse URL
        if (request._parsedUrl) {
            request.path = request._parsedUrl.pathname;
            request.query = qs.parse(request._parsedUrl.query);
        }
        else {
            const parsedUrl = url.parse(request.url, true);
            request.path = parsedUrl.pathname;
            request.query = parsedUrl.query;
        }
        // get IP address of the request
        request.ip = proxyaddr(request, trustFunction);
        // continue to the next handler
        next();
    };
}
exports.firsthandler = firsthandler;
//# sourceMappingURL=firsthandler.js.map