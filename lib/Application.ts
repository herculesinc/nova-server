// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as https from 'https';
import { EventEmitter } from 'events';

import * as socketio from 'socket.io';
import * as responseTime from 'response-time';
import * as toobusy from 'toobusy-js';
import {
    Database, Cache, Dispatcher, Authenticator, RateLimiter, Logger, Exception, HttpStatusCode,
    Executor, ExecutorContext, ActionContext, TooBusyError, RateOptions
} from 'nova-base';

import { Router } from './Router';
import { SocketListener, symSocketAuthInputs } from './SocketListener';
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
    limiter?        : RateLimiter;
    rateLimits?     : RateOptions;
    logger?         : Logger;
    settings?       : any;
}

export interface WebServerConfig {
    server          : http.Server | https.Server;
    trustProxy?     : boolean | string | number;
}

// CLASS DEFINITION
// =================================================================================================
export class Application extends EventEmitter {
    
    name            : string;
    version         : string;
    context         : ExecutorContext;

    webServer       : http.Server | https.Server;
    ioServer        : socketio.Server;

    endpointRouters : Map<string, Router>;
    socketListeners : Map<string, SocketListener>;

    eServer         : express.Application;
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
    register(topic: string, listener: SocketListener)
    register(path: string, routerOrListener: Router | SocketListener) {
        if (!path) throw new Error('Cannot register router or listener: path is undefined');
        if (!routerOrListener) throw new Error('Cannot register router or listener: router or listener is undefined');

        if (routerOrListener instanceof Router) {
            if (this.endpointRouters.has(path)) throw Error(`Path {${path}} has already been attached to a router`);
            routerOrListener.attach(path, this.eServer, this.context);
            this.endpointRouters.set(path, routerOrListener);
        }
        else if (routerOrListener instanceof SocketListener) {
            if (this.socketListeners.has(path)) throw Error(`Topic {${path}} has been already attached to a listener`);
            routerOrListener.attach(path, this.ioServer, this.context, (error: Error) => {
                this.emit(ERROR_EVENT, error);
            });
            this.socketListeners.set(path, routerOrListener);
        }    
    }

    start() {
        // chatch all unresolved requests
        this.eServer.use(function (request: express.Request, response: express.Response, next: Function) {
            next(new Exception(`Endpoint ${request.path} does not exist`, HttpStatusCode.NotFound));
        });

        // attach error handler
        this.eServer.use((error: any, request: express.Request, response: express.Response, next: Function) => {
            
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
        this.webServer = options.server;
        this.eServer = express();

        // configure express app
        this.eServer.set('trust proxy', options.trustProxy); 
        this.eServer.set('x-powered-by', false);
        this.eServer.set('etag', false);

        // calculate response time
        this.eServer.use(responseTime({ digits: 0, suffix: false, header: headers.RSPONSE_TIME }));

        // set version header
        this.eServer.use((request: express.Request, response: express.Response, next: Function) => {
            response.set({
                [headers.SERVER_NAME]: this.name,
                [headers.API_VERSION]: this.version
            });
            next();
        });

        // bind express app to the server
        this.webServer.on('request', this.eServer);
    }

    private setIoServer(options?: socketio.ServerOptions) {
        // create the socket IO server
        this.ioServer = socketio(this.webServer, options);

        // attach socket authentication middleware
        this.ioServer.use((socket: socketio.Socket, next: Function) => {
            try {
                // reject new connections if the server is too busy
                if (toobusy()) throw new TooBusyError();

                // get and parse auth data from handshake
                const query = socket.handshake.query;
                const authInputs = parseAuthHeader(query['authorization'] || query['Authorization']);

                // run authentication executor and mark socket as authenticated
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
            rateLimits      : options.rateLimits,
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