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

    if (setting === 'load controller') {
        toobusy.maxLag(config.maxLag);
        toobusy.interval(config.interval);
    }
}

// RE-EXPORTS
// =================================================================================================
export { Router } from './lib/Router';
export { Listener } from './lib/Listener';