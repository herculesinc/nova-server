// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as https from 'https';
import { EventEmitter } from 'events';
import * as Router from 'router';
import * as socketio from 'socket.io';
import * as toobusy from 'toobusy-js';
import {
    Database, Cache, Dispatcher, Authenticator, RateLimiter, Logger, Exception, HttpStatusCode,
    Executor, ExecutorContext, ActionContext, TooBusyError, RateOptions
} from 'nova-base';

import { RouteController } from './RouteController';
import { SocketListener, symSocketAuthInputs } from './SocketListener';
import { SocketNotifier } from './SocketNotifier';
import { parseAuthHeader } from './util';
import { firsthandler } from './routing/firsthandler';
import { finalhandler } from './routing/finalhandler';

// MODULE VARIABLES
// =================================================================================================
const ERROR_EVENT = 'error';
const LAG_EVENT = 'lag';

const DEFAULT_WEB_SERVER_CONFIG: WebServerConfig = {
    trustProxy  : true
};

// INTERFACES
// =================================================================================================
export interface AppConfig {
    name            : string;
    version         : string;
    webServer?      : WebServerConfig;
    ioServer?       : socketio.ServerOptions;
    authenticator?  : Authenticator;
    database        : Database;
    cache?          : Cache;
    dispatcher?     : Dispatcher;
    limiter?        : RateLimiter;
    rateLimits?     : RateOptions;
    logger?         : Logger;
    settings?       : any;
}

export interface WebServerConfig {
    server?         : http.Server | https.Server;
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

    routeControllers: Map<string, RouteController>;
    socketListeners : Map<string, SocketListener>;

    router          : Router.Router;
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
        this.routeControllers = new Map();
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
    register(root: string, controller: RouteController);
    register(topic: string, listener: SocketListener)
    register(path: string, controllerOrListener: RouteController | SocketListener) {
        if (!path) throw new Error('Cannot register controller or listener: path is undefined');
        if (!controllerOrListener) throw new Error('Cannot register controller or listener: router or listener is undefined');

        if (controllerOrListener instanceof RouteController) {
            if (this.routeControllers.has(path)) throw Error(`Path {${path}} has already been attached to a router`);
            controllerOrListener.attach(path, this.router, this.context);
            this.routeControllers.set(path, controllerOrListener);
        }
        else if (controllerOrListener instanceof SocketListener) {
            if (this.socketListeners.has(path)) throw Error(`Topic {${path}} has been already attached to a listener`);
            controllerOrListener.attach(path, this.ioServer, this.context, (error: Error) => {
                this.emit(ERROR_EVENT, error);
            });
            this.socketListeners.set(path, controllerOrListener);
        }    
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private setWebServer(options: WebServerConfig) {
        options = Object.assign({}, DEFAULT_WEB_SERVER_CONFIG, options);

        // create express app
        this.webServer = options.server || http.createServer();
        this.router = Router();

        // attache the first handler
        this.router.use(firsthandler(this.name, this.version, options)); 

        // bind express app to the server
        this.webServer.on('request', (request, response) => {
            // use custom final handler with express
            this.router(request, response, finalhandler(request, response, (error) => {
                this.emit(ERROR_EVENT, error);
            }));
        });
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
    if (!options) throw new TypeError('Cannot create an app: options are undefined');
    options = Object.assign({}, options);

    if (!options.name) throw new TypeError('Cannot create an app: name is undefined');
    if (!options.version) throw new TypeError('Cannot create an app: version is undefined');

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