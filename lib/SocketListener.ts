// IMPORTS
// =================================================================================================
import * as SocketIO from 'socket.io';
import * as toobusy from 'toobusy-js'
import * as nova from 'nova-base';

// MODULE VARIABLES
// =================================================================================================
export const symRequestorInfo = Symbol();
const CONNECT_EVENT = 'connection';

// INTERFACES
// =================================================================================================
export interface HandlerConfig<V,T> {
    defaults?       : any;
    adapter?        : nova.ActionAdapter<V>;
    action          : nova.Action<V,T>;
    rate?           : nova.RateOptions;
    dao?            : nova.DaoOptions;
    auth?           : any;
}

export interface SocketEventHandler {
    (data: any, callback: (response) => void)
}

// CLASS DEFINITION
// =================================================================================================
export class SocketListener {

    name?       : string;
    topic       : string;
    context     : nova.ExecutorContext;
    handlers    : Map<string, HandlerConfig<any,any>>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name?: string) {
        this.name = name;
        this.handlers = new Map();
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    on<V,T>(event: string, config: HandlerConfig<V,T>) {
        // check event parameter
        if (!event) throw new TypeError(`Socket event '${event}' is invalid`);
        if (typeof event !== 'string') throw new TypeError('Socket event must be a string');
        if (this.handlers.has(event))
            throw new Error(`Socket Event {${event}} has already been bound to a handler`);

        // check config parameter
        if (!config) throw new TypeError('Socket event handler configuration cannot be undefined');

        // register the event
        this.handlers.set(event, config);
    }

    attach(topic: string, io: SocketIO.Server, context: nova.ExecutorContext, onerror: (error: Error) => void) {
        // check if the listener can be bound to this topic
        if (!topic) throw new TypeError(`Cannot attach socket listener to '${topic}' topic`);
        if (typeof topic !== 'string') throw new TypeError(`Socket listener topic must be a string`);
        if (this.topic) throw new Error(`Socket listener has alread been bound to '${this.topic}' topic`);

        if (!context) throw new TypeError(`Socket listener cannot be attached to an undefined context`);

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
    private buildEventHandler(config: HandlerConfig<any,any>, socket: SocketIO.Socket, onerror: (error: Error) => void): SocketEventHandler {
        if (!config || !socket) return;

        // build execution options
        const options: nova.ExecutionOptions = {
            daoOptions  : Object.assign({ startTransaction: false }, config.dao),
            rateLimits  : config.rate,
            authOptions : config.auth
        };

        // build executor
        const executor = new nova.Executor(this.context, config.action, config.adapter, options);

        // build and return the handler
        return function(data: any, callback: (response) => void) {

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
            const requestor = socket[symRequestorInfo];
            executor.execute(inputs, requestor)
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
        }
    }
}
