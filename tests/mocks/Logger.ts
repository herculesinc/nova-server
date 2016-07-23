// IMPORTS
// =================================================================================================
import * as http from 'http';
import { Logger } from 'nova-base';

// LOGGER CLASS
// =================================================================================================
export class MockLogger {

    debug(message: string) { console.log(message); }
    info (message: string) { console.info(message); }
    warn(message: string) { console.warn(message); }

    error(error: Error) { console.error(error); };

    log(event: string, properties?: { [key: string]: any }) {
         console.info(`${event}: ${JSON.stringify(properties)}`);
    }

    track(metric: string, value: number) {
        console.log(`[${metric}=${value}]`);
    }

    trace(service: string, command: string, time: number, success?: boolean) {
        console.log(`[${service}]: executed {${command}} in ${time} ms`);
    }

    request(request: http.IncomingMessage, response: http.ServerResponse) {
        
        const method    = request.method;
        const url       = request.url;
        const version   = request.httpVersion;
        const status    = response.statusCode;
        const length    = response.getHeader('content-length');

        console.log(`${method} ${url} ${status} - ${length}`);
    }
}
