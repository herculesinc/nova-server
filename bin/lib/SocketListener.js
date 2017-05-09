"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const toobusy = require("toobusy-js");
const nova = require("nova-base");
// MODULE VARIABLES
// =================================================================================================
exports.symSocketAuthData = Symbol();
const CONNECT_EVENT = 'connection';
// CLASS DEFINITION
// =================================================================================================
class SocketListener {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name) {
        this.name = name;
        this.handlers = new Map();
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    on(event, config) {
        // check event parameter
        if (!event)
            throw new TypeError(`Socket event '${event}' is invalid`);
        if (typeof event !== 'string')
            throw new TypeError('Socket event must be a string');
        if (this.handlers.has(event))
            throw new Error(`Socket Event {${event}} has already been bound to a handler`);
        // check config parameter
        if (!config)
            throw new TypeError('Socket event handler configuration cannot be undefined');
        // register the event
        this.handlers.set(event, config);
    }
    attach(topic, io, context, onerror) {
        // check if the listener can be bound to this topic
        if (!topic)
            throw new TypeError(`Cannot attach socket listener to '${topic}' topic`);
        if (typeof topic !== 'string')
            throw new TypeError(`Socket listener topic must be a string`);
        if (this.topic)
            throw new Error(`Socket listener has alread been bound to '${this.topic}' topic`);
        if (!context)
            throw new TypeError(`Socket listener cannot be attached to an undefined context`);
        // initialize listener variables
        this.topic = topic;
        this.context = context;
        // attach event handlers to the socket
        io.of(topic).on(CONNECT_EVENT, (socket) => {
            for (let [event, config] of this.handlers) {
                socket.on(event, this.buildEventHandler(config, socket, onerror));
            }
        });
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildEventHandler(config, socket, onerror) {
        if (!config || !socket)
            return;
        // build execution options
        const options = {
            daoOptions: Object.assign({ startTransaction: false }, config.dao),
            rateLimits: config.rate,
            authOptions: config.auth
        };
        // build executor
        const executor = new nova.Executor(this.context, config.action, config.adapter, options);
        // build and return the handler
        return function (data, callback) {
            // check if the server is too busy
            if (toobusy()) {
                const error = new nova.TooBusyError();
                setImmediate(onerror, error);
                if (callback) {
                    callback(error);
                }
                return;
            }
            // build inputs and run the executor
            const inputs = Object.assign({}, config.defaults, data);
            const authData = socket[exports.symSocketAuthData];
            executor.execute(inputs, authData)
                .then((result) => {
                if (callback) {
                    callback(undefined);
                }
            })
                .catch((error) => {
                setImmediate(onerror, error);
                if (callback) {
                    callback(error);
                }
            });
        };
    }
}
exports.SocketListener = SocketListener;
//# sourceMappingURL=SocketListener.js.map