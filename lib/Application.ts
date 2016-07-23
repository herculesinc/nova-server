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
    Database, Cache, Dispatcher, Authenticator, RateLimiter, Logger, Exception, HttpStatusCode,
    Executor, ExecutorContext, ActionContext, validate
} from 'nova-base';

import { Router } from './Router';
import { Listener, symSocketAuthInputs } from './Listener';
import { SocketNotifier } from './SocketNotifier';
import { parseAuthHeader } from './util';

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
    ioServer?       : socketio.ServerOptions;
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

// CLASS DEFINITION
// =================================================================================================
export class Application extends EventEmitter {
    
    name            : string;
    version         : string;
    context         : ExecutorContext;

    server          : http.Server | https.Server;
    webServer       : express.Application;
    ioServer        : socketio.Server;

    endpointRouters : Map<string, Router>;
    socketListeners : Map<string, Listener>;

    authExecutor    : Executor<string, string>;

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
        this.server = options.webServer.server;
        this.setWebServer(options.webServer);
        this.setIoServer(options.ioServer);

        // initlize context
        this.setExecutorContext(options);

        // create router and listener maps
        this.endpointRouters = new Map();
        this.socketListeners = new Map();
        
        // initialize auth executor
        this.authExecutor = new Executor(this.context, authenticateSocket, socketAuthAdapter);

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
            routerOrListener.attach(path, this.ioServer, this.context, (error: Error) => {
                this.emit(ERROR_EVENT, error);
            });
            this.socketListeners.set(path, routerOrListener);
        }    
    }

    start() {
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

        // bind express app to the server
        options.server.on('request', this.webServer);
    }

    private setIoServer(options?: socketio.ServerOptions) {
        // create the socket IO server
        this.ioServer = socketio(this.server, options);

        // attach socket authentication middleware
        this.ioServer.use((socket: socketio.Socket, next: Function) => {
            try {
                const query = socket.handshake.query;
                const authInputs = parseAuthHeader(query['authorization'] || query['Authorization']);
                this.authExecutor.execute({ authenticator: this.context.authenticator }, authInputs)
                    .then((socketOwnerId) => {
                        socket.join(socketOwnerId, function() {
                            socket[symSocketAuthInputs] = authInputs;
                            next();
                        });
                    })
                    .catch((error) => {
                        this.emit(ERROR_EVENT, error);
                        next(error);
                    });
            }
            catch (error) {
                this.emit(ERROR_EVENT, error);
                next(error);
            }
        });
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

// SOCKET AUTHENTICATOR ACTION
// =================================================================================================
interface SocketAuthInputs {
    authenticator: Authenticator
}

function socketAuthAdapter(this: ActionContext, inputs: SocketAuthInputs, authInfo: any): Promise<string> {
    // convert auth info to the owner string
    return Promise.resolve(inputs.authenticator.toOwner(authInfo));
}

function authenticateSocket(this: ActionContext, inputs: string): Promise<string> {
    // just a pass-through action
    return Promise.resolve(inputs);
}