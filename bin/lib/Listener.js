"use strict";
const nova_base_1 = require('nova-base');
// CLASS DEFINITION
// =================================================================================================
class Listener {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name) {
        this.name = name;
        this.handlers = new Map();
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    on(event, config) {
    }
    bind(server, context) {
        this.context = context;
        server.on('connection', (socket) => {
            socket.on('authenticate', this.buildAuthHandler(socket));
            for (let [event, config] of this.handlers) {
                socket.on(event, this.buildEventHandler(config, socket));
            }
        });
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildAuthHandler(socket) {
        if (!socket)
            return;
    }
    buildEventHandler(config, socket) {
        if (!config || !socket)
            return;
        // build execution options
        const options = {
            daoOptions: config.dao,
            rateOptions: config.rate,
            authOptions: config.auth
        };
        // build executor
        const executor = new nova_base_1.Executor(this.context, config.action, config.adapter, options);
        // build and return the handler
        return function (data, callback) {
            const inputs = Object.assign({}, config.defaults, data);
            const authInputs = undefined; // TODO: get auth data from socket
            executor.execute(inputs, authInputs)
                .then((result) => callback(undefined))
                .catch((error) => {
                // TODO: log the error
                callback(error);
            });
        };
    }
}
exports.Listener = Listener;
//# sourceMappingURL=Listener.js.map