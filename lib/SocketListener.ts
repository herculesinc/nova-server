// IMPORTS
// =================================================================================================
import * as SocketIO from 'socket.io';
import * as toobusy from 'toobusy-js'
import * as nova from 'nova-base';

// MODULE VARIABLES
// =================================================================================================
export const symSocketAuthInputs = Symbol();
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

    rateLimits  : nova.RateOptions;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name?: string) {
        this.name = name;
        this.handlers = new Map();
    }

    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    on<V,T>(event: string, config: HandlerConfig<V,T>) {
        if (!event) throw new Error('Event cannot be undefined');
        if (!config) throw new Error('Handler configuration cannot be undefined');
        if (this.handlers.has(event))
            throw new Error(`Event {${event}} has already been bound to a handler`);
        this.handlers.set(event, config);
    }

    attach(topic: string, io: SocketIO.Server, context: nova.ExecutorContext, onerror: (error: Error) => void) {
        // check if the listener has already been attached
        if (this.topic) throw new Error(`Listener has alread been bound to ${this.topic} topic`);

        // initialize listener variables
        this.topic = topic;
        this.context = context;

        this.rateLimits = undefined; // TODO: set to something

        // attach event handlers to the socket
        io.of(topic).on(CONNECT_EVENT, (socket) => {
            // attach event handlers handlers
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
                return callback(error);
            }
            
            // build inputs and run the executor
            const inputs = Object.assign({}, config.defaults, data); 
            const authInputs: nova.AuthInputs = socket[symSocketAuthInputs];
            executor.execute(inputs, authInputs)
                .then((result) => callback(undefined))
                .catch((error) => {
                    setImmediate(onerror, error);
                    callback(error);
                });
        }
    }
}