// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as express from 'express';
import * as responseTime from 'response-time';
import {
    Executor, ExecutorContext, Database, Cache, Dispatcher, Authenticator, RateLimiter, Logger
} from 'nova-base';

import { Router } from './Router';

// INTERFACES
// =================================================================================================
export interface AppOptions {
    name            : string;
    version         : string;
    server          : http.Server;
    database        : Database;
    cache           : Cache;
    dispatcher      : Dispatcher;
    logger?         : Logger;
    authenticator?  : Authenticator;
    limiter?        : RateLimiter;
    settings        : any;
    errorHandler?   : ErrorHandler;
}

interface ErrorHandler {
    (error: Error)  : Promise<any>;
}

// CLASS DEFINITION
// =================================================================================================
export class Application {
    
    server  : express.Application;
    options : AppOptions;
    context : ExecutorContext;
    routers : Map<string, Router>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: AppOptions) {

        this.options = validateOptions(options);
        this.server = createExpressServer(this.options);
        this.context = createExecutorContext(this.options);
        this.routers = new Map<string, Router>();

        options.server.on('request', this.server); // TODO: improve
    }
    
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    attach(path: string, router: Router) {
        if (this.routers.has(path)) throw Error(`Path {${path}} has already been bound to a router`);
        router.bind(path, this.server, this.context);        
    }
}

// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options: AppOptions): AppOptions {
    // TODO: validate options
    return options;
}

function createExecutorContext(options: AppOptions): ExecutorContext {

    // TODO: build notifier
    const notifier = {
        send(inputs: any) {
            console.log('Notifier send');
            return Promise.resolve();
        }
    }

    return {
        authenticator   : options.authenticator,
        database        : options.database,
        cache           : options.cache,
        dispatcher      : options.dispatcher,
        notifier        : notifier,
        limiter         : options.limiter,
        logger          : options.logger,
        settings        : options.settings
    };
}

function createExpressServer(options: AppOptions): express.Application {

    const server = express();

    // set trust proxy - TODO: get from options
    server.set('trust proxy', true); 

    // TODO: handle server overload

    // calculate response time
    server.use(responseTime({ digits: 0, suffix: false }));

    // set version header
    server.use(function(request: express.Request, response: express.Response, next: Function) {
        response.set({
            'X-Api-Version': options.version
        });
        next();
    });

    // attach error handler
    server.use(function (error: any, request: express.Request, response: express.Response, next: Function) {

        options.logger && options.logger.error(error); // log only server errors?
        // TODO: run custom error handler
        
        // end response - TODO: convert error to response object
        response.status(error.status || 500);
        response.json({
            message: error.message || 'Unknown error'
        });

        // TODO: shut down server on critical error?
    });

    // TODO: set up not found handler   

    // return the server
    return server;
}