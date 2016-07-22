// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as https from 'https';
import { EventEmitter } from 'events';
import * as express from 'express';
import * as socketio from 'socket.io';
import * as responseTime from 'response-time';
import * as toobusy from 'toobusy-js';
import {
    ExecutorContext, Database, Cache, Dispatcher, Authenticator, RateLimiter, Logger, HttpStatusCode,
    Exception
} from 'nova-base';

import { Router } from './Router';
import { Listener } from './Listener';
import { SocketNotifier } from './SocketNotifier';

// MODULE VARIABLES
// =================================================================================================
const ERROR_EVENT = 'error';
const LAG_EVENT = 'lag';

const headers = {
    SERVER_NAME : 'X-Server-Name',
    API_VERSION : 'X-Api-Version',
    RSPONSE_TIME: 'X-Response-Time'
};

// INTERFACES
// =================================================================================================
export interface AppConfig {
    name            : string;
    version         : string;
    webServer       : WebServerConfig;
    ioServer        : IoServerConfig;
    authenticator   : Authenticator;
    database        : Database;
    cache           : Cache;
    dispatcher      : Dispatcher;
    logger?         : Logger;
    limiter?        : RateLimiter;
    settings?       : any;

    options?: {
        reateLimits?: any;
    }
}

export interface WebServerConfig {
    server      : http.Server | https.Server;
    trustProxy? : boolean | string | number;
}

export interface IoServerConfig {
    server      : socketio.Server;
}

// CLASS DEFINITION
// =================================================================================================
export class Application extends EventEmitter {
    
    name            : string;
    version         : string;
    context         : ExecutorContext;

    webServer       : express.Application;
    ioServer        : socketio.Server;

    endpointRouters : Map<string, Router>;
    socketListeners : Map<string, Listener>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options: AppConfig) {
        super();

        // make sure options are valid
        options = validateOptions(options);

        // initialize basic instance variables
        this.name = options.name;
        this.version = options.version;
        

        // initialize servers
        this.setWebServer(options.webServer);
        this.setIoServer(options.ioServer);

        // initlize context
        this.setExecutorContext(options);

        // create router and listener maps
        this.endpointRouters = new Map();
        this.socketListeners = new Map();
        
        // set up lag handling
        toobusy.onLag((lag) => {
            this.emit(LAG_EVENT, lag);
        });
    }
    
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    register(root: string, router: Router);
    register(topic: string, listener: Listener)
    register(path: string, routerOrListener: Router | Listener) {
        if (!path) throw new Error('Cannot register router or listener: path is undefined');
        if (!routerOrListener) throw new Error('Cannot register router or listener: router or listener is undefined');

        if (routerOrListener instanceof Router) {
            if (this.endpointRouters.has(path)) throw Error(`Path {${path}} has already been attached to a router`);
            routerOrListener.attach(path, this.webServer, this.context);
            this.endpointRouters.set(path, routerOrListener);
        }
        else if (routerOrListener instanceof Listener) {
            if (this.socketListeners.has(path)) throw Error(`Topic {${path}} has been already attached to a listener`);
            routerOrListener.attach(path, this.ioServer, this.context);
            this.socketListeners.set(path, routerOrListener);
        }    
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private setWebServer(options: WebServerConfig) {

        // create express app
        this.webServer = express();

        // configure express app
        this.webServer.set('trust proxy', options.trustProxy); 
        this.webServer.set('x-powered-by', false);
        this.webServer.set('etag', false);

        // calculate response time
        this.webServer.use(responseTime({ digits: 0, suffix: false, header: headers.RSPONSE_TIME }));

        // set version header
        this.webServer.use((request: express.Request, response: express.Response, next: Function) => {
            response.set({
                [headers.SERVER_NAME]: this.name,
                [headers.API_VERSION]: this.version
            });
            next();
        });

        // attach error handler
        this.webServer.use((error: any, request: express.Request, response: express.Response, next: Function) => {
            
            // fire error event
            this.emit(ERROR_EVENT, error);

            // end response
            response.status(error.status || HttpStatusCode.InternalServerError);
            response.json( (error instanceof Exception) 
                ? error 
                : { name: error.name, message: error.message }
            );
        });

        // bind express app to the server
        options.server.on('request', this.webServer);
    }

    private setIoServer(options: IoServerConfig) {
        // not much to do here - yet
        this.ioServer = options.server;
    }

    private setExecutorContext(options: AppConfig) {
        // build notifier
        const notifier = new SocketNotifier(this.ioServer, options.logger);

        // initialize the context
        this.context = {
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
}

// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options: AppConfig): AppConfig {
    // TODO: validate options
    return options;
}