// IMPORTS
// ================================================================================================
import * as toobusy from 'toobusy-js';
import { Application, AppConfig } from './lib/Application'

// INTERFACES
// ================================================================================================
export interface LoadControllerConfig {
    interval: number;
    maxLag  : number;
}

// MODULE VARIABLES
// =================================================================================================
export const defaults = {
    CORS: {
        origin      : '*',
        headers     : ['authorization', 'content-type', 'accept', 'x-requested-with', 'cache-control'],
        // TODO: add expose headers?
        credentials : 'true',
        maxAge      : '1000000000'
    }
};

// PUBLIC FUNCTIONS
// ================================================================================================
export function createApp(options: AppConfig): Application {
    const app = new Application(options);
    return app;
}

export function configure(setting: 'load controller', config: LoadControllerConfig);
export function configure(setting: string, config: any) {
    if (!config) throw new TypeError('Config object must be provided');

    if (setting === 'load controller') {
        if (config.maxLag <= 0) throw new TypeError('Max lag must be > 0');
        if (config.interval <= 0) throw new TypeError('Interval must be > 0');

        toobusy.maxLag(config.maxLag);
        toobusy.interval(config.interval);
    }
}

// RE-EXPORTS
// =================================================================================================
export { RouteController } from './lib/RouteController';
export { SocketListener } from './lib/SocketListener';
export { validate, Exception, util } from 'nova-base';