// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import * as socketio from 'socket.io';
import * as responseTime from 'response-time';
import * as toobusy from 'toobusy-js';
import {
    Executor, ExecutorContext, Database, Cache, Dispatcher, Authenticator, RateLimiter, Logger
} from 'nova-base';

import { Router } from './Router';
import { Listener } from './Listener';

// INTERFACES
// =================================================================================================
export interface AppOptions {
    name            : string;
    version         : string;
    webServer       : http.Server | https.Server;
    ioServer        : socketio.Server;
    database        : Database;
    cache           : Cache;
    dispatcher      : Dispatcher;
    logger?         : Logger;
    authenticator?  : Authenticator;
    limiter?        : RateLimiter;
    settings        : any;
}

// CLASS DEFINITION
// =================================================================================================
export class Application {
    
    webServer   : express.Application;
    ioServer    : socketio.Server;
    options     : AppOptions;
    context     : ExecutorContext;

    routers     : Map<string, Router>;
    listeners   : Map<string, Listener>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: AppOptions) {

        this.options = validateOptions(options);
        this.context = createExecutorContext(this.options);

        // initialize and bind web server
        this.webServer = createExpressServer(this.options);
        options.webServer.on('request', this.webServer);
        
        // initialize socket.io server
        this.ioServer = undefined;

        // create router and listener maps
        this.routers = new Map();
        this.listeners = new Map();

        // 
        
    }
    
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    register(root: string, router: Router);
    register(topic: string, listener: Listener)
    register(path: string, routerOrListener: Router | Listener) {
        if (!path) throw new Error('Cannot register router or listener: path is undefined');
        if (!routerOrListener) throw new Error('Cannot register router or listener: router or listener is undefined');

        if (routerOrListener instanceof Router) {
            if (this.routers.has(path)) throw Error(`Path {${path}} has already been attached to a router`);
            routerOrListener.attach(path, this.webServer, this.context);
        }
        else if (routerOrListener instanceof Listener) {
            if (this.listeners.has(path)) throw Error(`Topic {${path}} has been already attached to a listener`);
            routerOrListener.attach(path, this.ioServer, this.context);
        }    
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