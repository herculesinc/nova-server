"use strict";
const express = require('express');
const responseTime = require('response-time');
// CLASS DEFINITION
// =================================================================================================
class Application {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(options) {
        this.options = validateOptions(options);
        this.server = createExpressServer(this.options);
        this.context = createExecutorContext(this.options);
        this.routers = new Map();
        options.server.on('request', this.server); // TODO: improve
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    attach(path, router) {
        if (this.routers.has(path))
            throw Error(`Path {${path}} has already been bound to a router`);
        router.bind(path, this.server, this.context);
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