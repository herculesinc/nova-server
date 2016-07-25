"use strict";
// IMPORTS
// =================================================================================================
const http = require('http');
const events_1 = require('events');
const Router = require('router');
const socketio = require('socket.io');
const toobusy = require('toobusy-js');
const nova_base_1 = require('nova-base');
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
// CLASS DEFINITION
// =================================================================================================
class Application extends events_1.EventEmitter {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
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
        this.authExecutor = new nova_base_1.Executor(this.context, authenticateSocket, socketAuthAdapter);
        // set up lag handling
        toobusy.onLag((lag) => {
            this.emit(LAG_EVENT, lag);
        });
    }
    register(path, controllerOrListener) {
        if (!path)
            throw new Error('Cannot register controller or listener: path is undefined');
        if (!controllerOrListener)
            throw new Error('Cannot register controller or listener: router or listener is undefined');
        if (controllerOrListener instanceof RouteController_1.RouteController) {
            if (this.routeControllers.has(path))
                throw Error(`Path {${path}} has already been attached to a router`);
            controllerOrListener.attach(path, this.router, this.context);
            this.routeControllers.set(path, controllerOrListener);
        }
        else if (controllerOrListener instanceof SocketListener_1.SocketListener) {
            if (this.socketListeners.has(path))
                throw Error(`Topic {${path}} has been already attached to a listener`);
            controllerOrListener.attach(path, this.ioServer, this.context, (error) => {
                this.emit(ERROR_EVENT, error);
            });
            this.socketListeners.set(path, controllerOrListener);
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
        this.router.use(firsthandler_1.firsthandler(this.name, this.version, options));
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
                    throw new nova_base_1.TooBusyError();
                // get and parse auth data from handshake
                const query = socket.handshake.query;
                const authInputs = util_1.parseAuthHeader(query['authorization'] || query['Authorization']);
                // run authentication executor and mark socket as authenticated
                this.authExecutor.execute({ authenticator: this.context.authenticator }, authInputs)
                    .then((socketOwnerId) => {
                    socket.join(socketOwnerId, function () {
                        socket[SocketListener_1.symSocketAuthInputs] = authInputs;
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
    if (!options.version)
        throw new TypeError('Cannot create an app: version is undefined');
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