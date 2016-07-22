"use strict";
// IMPORTS
// ================================================================================================
const Application_1 = require('./lib/Application');
// MODULE VARIABLES
// =================================================================================================
exports.defaults = {
    CORS: {
        origin: '*',
        headers: ['authorization', 'content-type', 'accept', 'x-requested-with', 'cache-control'],
        credentials: 'true',
        maxAge: '1000000000'
    },
    rateLimits: {
        // TODO: find better names?
        anonymous: undefined,
        identified: undefined
    }
};
// PUBLIC FUNCTIONS
// ================================================================================================
function createApp(options) {
    const app = new Application_1.Application(options);
    return app;
}
exports.createApp = createApp;
// RE-EXPORTS
// =================================================================================================
var Router_1 = require('./lib/Router');
exports.Router = Router_1.Router;
var Listener_1 = require('./lib/Listener');
exports.Listener = Listener_1.Listener;
//# sourceMappingURL=index.js.map