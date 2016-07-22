"use strict";
const nova_base_1 = require('nova-base');
// MODULE VARIABLES
// =================================================================================================
const symSocketAuthInputs = Symbol();
const CONNECT_EVENT = 'connection';
const AUTH_EVENT = 'authenticate';
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
    attach(topic, server, context) {
        // check if the listener has already been attached
        if (this.topic)
            throw new Error(`Listener has alread been bound to ${this.topic} topic`);
        // initialize listener variables
        this.topic = topic;
        this.context = context;
        this.authExecutor = new nova_base_1.Executor(this.context, authenticateSocket, socketAuthAdapter);
        // attach event handlers to the socket
        // TODO: get the right namespace based on topic
        server.on(CONNECT_EVENT, (socket) => {
            // attach the authenticator handler
            socket.on(AUTH_EVENT, this.buildAuthHandler(socket));
            // attach all other handlers
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
        // set up variables
        const executor = this.authExecutor;
        const authenticator = this.context.authenticator;
        // build authentication handler for the socket
        return function (data, callback) {
            executor.execute({ authenticator: authenticator }, data)
                .then((socketOwnerId) => {
                socket.join(socketOwnerId, function () {
                    socket[symSocketAuthInputs] = data;
                    callback(undefined);
                });
            })
                .catch((error) => {
                // TODO: log the error
                callback(error);
            });
        };
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
function socketAuthAdapter(inputs, authInfo) {
    // convert auth info to the owner string
    return Promise.resolve(inputs.authenticator.toOwner(authInfo));
}
function authenticateSocket(inputs) {
    // just a pass-through action
    return Promise.resolve(inputs);
}
//# sourceMappingURL=Listener.js.map