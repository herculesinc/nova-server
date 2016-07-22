"use strict";
const express = require('express');
const responseTime = require('response-time');
const Router_1 = require('./Router');
const Listener_1 = require('./Listener');
// CLASS DEFINITION
// =================================================================================================
class Application {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
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
    register(path, routerOrListener) {
        if (!path)
            throw new Error('Cannot register router or listener: path is undefined');
        if (!routerOrListener)
            throw new Error('Cannot register router or listener: router or listener is undefined');
        if (routerOrListener instanceof Router_1.Router) {
            if (this.routers.has(path))
                throw Error(`Path {${path}} has already been attached to a router`);
            routerOrListener.attach(path, this.webServer, this.context);
        }
        else if (routerOrListener instanceof Listener_1.Listener) {
            if (this.listeners.has(path))
                throw Error(`Topic {${path}} has been already attached to a listener`);
            routerOrListener.attach(path, this.ioServer, this.context);
        }
    }
}
exports.Application = Application;
// HELPER FUNCTIONS
// =================================================================================================
function validateOptions(options) {
    // TODO: validate options
    return options;
}
function createExecutorContext(options) {
    // TODO: build notifier
    const notifier = {
        send(inputs) {
            console.log('Notifier send');
            return Promise.resolve();
        }
    };
    return {
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
function createExpressServer(options) {
    const server = express();
    // set trust proxy - TODO: get from options
    server.set('trust proxy', true);
    // TODO: handle server overload
    // calculate response time
    server.use(responseTime({ digits: 0, suffix: false }));
    // set version header
    server.use(function (request, response, next) {
        response.set({
            'X-Api-Version': options.version
        });
        next();
    });
    // attach error handler
    server.use(function (error, request, response, next) {
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
//# sourceMappingURL=Application.js.map