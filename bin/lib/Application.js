"use strict";
// IMPORTS
// =================================================================================================
const http = require('http');
const events = require('events');
const Router = require('router');
const socketio = require('socket.io');
const toobusy = require('toobusy-js');
const nova = require('nova-base');
const RouteController_1 = require('./RouteController');
const SocketListener_1 = require('./SocketListener');
const SocketNotifier_1 = require('./SocketNotifier');
const util_1 = require('./util');
const firsthandler_1 = require('./routing/firsthandler');
const finalhandler_1 = require('./routing/finalhandler');
// MODULE VARIABLES
// =================================================================================================
const ERROR_EVENT = 'error';
const LAG_EVENT = 'lag';
const DEFAULT_WEB_SERVER_CONFIG = {
    trustProxy: true
};
const DEFAULT_AUTH_EXEC_OPTIONS = {
    daoOptions: {
        startTransaction: false
    }
};
// CLASS DEFINITION
// =================================================================================================
class Application extends events.EventEmitter {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
        super();
        // make sure options are valid
        options = validateOptions(options);
        // initialize basic instance variables
        this.name = options.name;
        this.version = options.version;
        this.logger = options.logger;
        // initialize servers
        this.setWebServer(options.webServer);
        this.setIoServer(options.ioServer);
        // initlize context
        this.setExecutorContext(options);
        // create router and listener maps
        this.routeControllers = new Map();
        this.socketListeners = new Map();
        // initialize auth executor
        this.authExecutor = new nova.Executor(this.context, authenticateSocket, socketAuthAdapter, DEFAULT_AUTH_EXEC_OPTIONS);
        // set up lag handling
        toobusy.onLag((lag) => {
            this.emit(LAG_EVENT, lag);
        });
    }
    register(path, controllerOrListener) {
        if (!controllerOrListener)
            throw new TypeError('Cannot register controller or listener: router or listener is undefined');
        if (controllerOrListener instanceof RouteController_1.RouteController) {
            if (this.routeControllers.has(path))
                throw TypeError(`Path '${path}' has already been attached to a router`);
            controllerOrListener.attach(path, this.router, this.context);
            this.routeControllers.set(path, controllerOrListener);
        }
        else if (controllerOrListener instanceof SocketListener_1.SocketListener) {
            if (this.socketListeners.has(path))
                throw TypeError(`Topic ${path}' has been already attached to a listener`);
            controllerOrListener.attach(path, this.ioServer, this.context, (error) => {
                this.emit(ERROR_EVENT, error);
            });
            this.socketListeners.set(path, controllerOrListener);
        }
        else {
            throw TypeError(`Controller or listener type is invalid`);
        }
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    setWebServer(options) {
        options = Object.assign({}, DEFAULT_WEB_SERVER_CONFIG, options);
        // create express app
        this.webServer = options.server || http.createServer();
        this.router = Router();
        // attache the first handler
        this.router.use(firsthandler_1.firsthandler(this.name, this.version, options, this.logger));
        // bind express app to the server
        this.webServer.on('request', (request, response) => {
            // use custom final handler with express
            this.router(request, response, finalhandler_1.finalhandler(request, response, (error) => {
                this.emit(ERROR_EVENT, error);
            }));
        });
    }
    setIoServer(options) {
        // create the socket IO server
        this.ioServer = socketio(this.webServer, options);
        // attach socket authentication middleware
        this.ioServer.use((socket, next) => {
            try {
                // reject new connections if the server is too busy
                if (toobusy())
                    throw new nova.TooBusyError();
                // get and parse auth data from handshake
                const query = socket.handshake.query;
                const authInputs = util_1.parseAuthHeader(query['authorization'] || query['Authorization']);
                const authData = this.authExecutor.authenticator.decode(authInputs);
                // run authentication executor and mark socket as authenticated
                this.authExecutor.execute({ authenticator: this.context.authenticator }, authData)
                    .then((socketOwnerId) => {
                    socket.join(socketOwnerId, function () {
                        socket[SocketListener_1.symSocketAuthData] = authData;
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
    setExecutorContext(options) {
        // build notifier
        const notifier = new SocketNotifier_1.SocketNotifier(this.ioServer, options.logger);
        // initialize the context
        this.context = {
            authenticator: options.authenticator,
            database: options.database,
            cache: options.cache,
            dispatcher: options.dispatcher,
            notifier: notifier,
            limiter: options.limiter,
            rateLimits: options.rateLimits,
            logger: options.logger,
            settings: options.settings
        };
    }
}
exports.Application = Application;
// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options) {
    if (!options)
        throw new TypeError('Cannot create an app: options are undefined');
    options = Object.assign({}, options);
    if (!options.name)
        throw new TypeError('Cannot create an app: name is undefined');
    if (typeof options.name !== 'string' || options.name.trim().length === 0)
        throw new TypeError('Cannot create an app: name must be a non-empty string');
    if (!options.version)
        throw new TypeError('Cannot create an app: version is undefined');
    if (typeof options.version !== 'string' || options.version.trim().length === 0)
        throw new TypeError('Cannot create an app: version must be a non-empty string');
    return options;
}
function socketAuthAdapter(inputs, authInfo) {
    // convert auth info to the owner string
    return Promise.resolve(inputs.authenticator.toOwner(authInfo));
}
function authenticateSocket(inputs) {
    // just a pass-through action
    return Promise.resolve(inputs);
}
//# sourceMappingURL=Application.js.map