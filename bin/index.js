"use strict";
// IMPORTS
// ================================================================================================
const toobusy = require("toobusy-js");
const Application_1 = require("./lib/Application");
// MODULE VARIABLES
// =================================================================================================
exports.defaults = {
    CORS: {
        origin: '*',
        headers: ['authorization', 'content-type', 'accept', 'x-requested-with', 'cache-control'],
        // TODO: add expose headers?
        credentials: 'true',
        maxAge: '1000000000'
    }
};
// PUBLIC FUNCTIONS
// ================================================================================================
function createApp(options) {
    const app = new Application_1.Application(options);
    return app;
}
exports.createApp = createApp;
function configure(setting, config) {
    if (!config)
        throw new TypeError('Config object must be provided');
    if (setting === 'load controller') {
        if (config.maxLag <= 0)
            throw new TypeError('Max lag must be > 0');
        if (config.interval <= 0)
            throw new TypeError('Interval must be > 0');
        toobusy.maxLag(config.maxLag);
        toobusy.interval(config.interval);
    }
}
exports.configure = configure;
// RE-EXPORTS
// =================================================================================================
var RouteController_1 = require("./lib/RouteController");
exports.RouteController = RouteController_1.RouteController;
var SocketListener_1 = require("./lib/SocketListener");
exports.SocketListener = SocketListener_1.SocketListener;
var nova_base_1 = require("nova-base");
exports.validate = nova_base_1.validate;
exports.Exception = nova_base_1.Exception;
exports.util = nova_base_1.util;
//# sourceMappingURL=index.js.map