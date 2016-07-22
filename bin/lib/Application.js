"use strict";
const events_1 = require('events');
const express = require('express');
const responseTime = require('response-time');
const toobusy = require('toobusy-js');
const nova_base_1 = require('nova-base');
const Router_1 = require('./Router');
const Listener_1 = require('./Listener');
const SocketNotifier_1 = require('./SocketNotifier');
// MODULE VARIABLES
// =================================================================================================
const ERROR_EVENT = 'error';
const LAG_EVENT = 'lag';
const headers = {
    SERVER_NAME: 'X-Server-Name',
    API_VERSION: 'X-Api-Version',
    RSPONSE_TIME: 'X-Response-Time'
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
        this.endpointRouters = new Map();
        this.socketListeners = new Map();
        // set up lag handling
        toobusy.onLag((lag) => {
            this.emit(LAG_EVENT, lag);
        });
    }
    register(path, routerOrListener) {
        if (!path)
            throw new Error('Cannot register router or listener: path is undefined');
        if (!routerOrListener)
            throw new Error('Cannot register router or listener: router or listener is undefined');
        if (routerOrListener instanceof Router_1.Router) {
            if (this.endpointRouters.has(path))
                throw Error(`Path {${path}} has already been attached to a router`);
            routerOrListener.attach(path, this.webServer, this.context);
            this.endpointRouters.set(path, routerOrListener);
        }
        else if (routerOrListener instanceof Listener_1.Listener) {
            if (this.socketListeners.has(path))
                throw Error(`Topic {${path}} has been already attached to a listener`);
            routerOrListener.attach(path, this.ioServer, this.context);
            this.socketListeners.set(path, routerOrListener);
        }
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    setWebServer(options) {
        // create express app
        this.webServer = express();
        // configure express app
        this.webServer.set('trust proxy', options.trustProxy);
        this.webServer.set('x-powered-by', false);
        this.webServer.set('etag', false);
        // calculate response time
        this.webServer.use(responseTime({ digits: 0, suffix: false, header: headers.RSPONSE_TIME }));
        // set version header
        this.webServer.use((request, response, next) => {
            response.set({
                [headers.SERVER_NAME]: this.name,
                [headers.API_VERSION]: this.version
            });
            next();
        });
        // attach error handler
        this.webServer.use((error, request, response, next) => {
            // fire error event
            this.emit(ERROR_EVENT, error);
            // end response
            response.status(error.status || 500 /* InternalServerError */);
            response.json((error instanceof nova_base_1.Exception)
                ? error
                : { name: error.name, message: error.message });
        });
        // bind express app to the server
        options.server.on('request', this.webServer);
    }
    setIoServer(options) {
        // not much to do here - yet
        this.ioServer = options.server;
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
            logger: options.logger,
            settings: options.settings
        };
    }
}
exports.Application = Application;
// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options) {
    // TODO: validate options
    return options;
}
//# sourceMappingURL=Application.js.map