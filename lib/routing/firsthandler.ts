// IMPORTS
// =================================================================================================
import * as url from 'url';
import * as qs from 'querystring';
import { RequestHandler, Request, Response } from 'router';
import * as proxyaddr from 'proxy-addr';
import * as onHeaders from 'on-headers';
import { Logger, util } from 'nova-base';
import { WebServerConfig } from './../Application';
import { compileTrust, matchIpV4 } from './../util';

// MODULE VARIABLES
// =================================================================================================
const headers = {
    SERVER_NAME     : 'X-Server-Name',
    API_VERSION     : 'X-Api-Version',
    RESPONSE_TIME   : 'X-Response-Time'
};

const since = util.since;

// FIRST HANDLER
// =================================================================================================
export function firsthandler(name: string, version: string, options: WebServerConfig, logger: Logger) {

    // set up trust function for proxy address
    const trustFunction = compileTrust(options.trustProxy);

    return function (request: Request, response: Response, next: (error?: Error) => void) {

        const start = process.hrtime();

        // log the request
        logger && logger.request(request, response);

        // set basic headers
        onHeaders(response, function(this: Response) {
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
        const ip: string = proxyaddr(request, trustFunction);
        if (typeof ip === 'string') {
            if (ip === '::1') {
                // localhost
                request.ip = '127.0.0.1';
            }
            else {
                const ipV4 = matchIpV4(ip);
                request.ip = ipV4 ? ipV4 : ip;
            }
        }

        // continue to the next handler
        next();
    }
}