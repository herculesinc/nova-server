"use strict";
const toobusy = require('toobusy-js');
const nova_base_1 = require('nova-base');
// MODULE VARIABLES
// =================================================================================================
exports.symSocketAuthInputs = Symbol();
const CONNECT_EVENT = 'connection';
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
        if (!event)
            throw new Error('Event cannot be undefined');
        if (!config)
            throw new Error('Handler configuration cannot be undefined');
        if (this.handlers.has(event))
            throw new Error(`Event {${event}} has already been bound to a handler`);
        this.handlers.set(event, config);
    }
    attach(topic, io, context, errorHandler) {
        // check if the listener has already been attached
        if (this.topic)
            throw new Error(`Listener has alread been bound to ${this.topic} topic`);
        // initialize listener variables
        this.topic = topic;
        this.context = context;
        // attach event handlers to the socket
        io.of(topic).on(CONNECT_EVENT, (socket) => {
            // attach event handlers handlers
            for (let [event, config] of this.handlers) {
                socket.on(event, this.buildEventHandler(config, socket, errorHandler));
            }
        });
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildEventHandler(config, socket, errorHandler) {
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
            // check if the server is too busy
            if (toobusy()) {
                const error = new nova_base_1.Exception('The server is too busy', 503 /* ServiceUnavailable */);
                errorHandler(error);
                return callback(error);
            }
            // build inputs and run the executor
            const inputs = Object.assign({}, config.defaults, data);
            const authInputs = socket[exports.symSocketAuthInputs];
            executor.execute(inputs, authInputs)
                .then((result) => callback(undefined))
                .catch((error) => {
                errorHandler(error);
                callback(error);
            });
        };
    }
}
exports.Listener = Listener;
//# sourceMappingURL=Listener.js.map