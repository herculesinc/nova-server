// IMPORTS
// =================================================================================================
import * as SocketIO from 'socket.io';
import { 
    Action, ActionAdapter, ActionContext, Executor, ExecutorContext, ExecutionOptions, AuthInputs, 
    RateOptions, DaoOptions, Exception, validate, Authenticator
} from 'nova-base';

// MODULE VARIABLES
// =================================================================================================
const symSocketAuthInputs = Symbol();

// INTERFACES
// =================================================================================================
export interface HandlerConfig<V,T> {
    defaults?       : any;
    adapter?        : ActionAdapter<V>;
    action          : Action<V,T>;
    rate?           : RateOptions;
    dao?            : DaoOptions;
    auth?           : any;
}

export interface SocketEventHandler {
    (data: any, callback: (response) => void)
}

// CLASS DEFINITION
// =================================================================================================
export class Listener {

    name        : string;
    topic       : string;
    context     : ExecutorContext;
    handlers    : Map<string, HandlerConfig<any,any>>;

    authExecutor: Executor<string, string>;

    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name?: string) {
        this.name = name;
        this.handlers = new Map<string, HandlerConfig<any,any>>();
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

    attach(topic: string, server: SocketIO.Server, context: ExecutorContext) {
        // check if the listener has already been attached
        if (this.topic) throw new Error(`Listener has alread been bound to ${this.topic} topic`);

        // initialize listener variables
        this.topic = topic;
        this.context = context;
        this.authExecutor = new Executor(this.context, authenticateSocket, socketAuthAdapter);

        // attach event handlers to the socket
        // TODO: get the right namespace based on topic
        server.on('connection', (socket) => {
            
            // attach the authenticator handler
            socket.on('authenticate', this.buildAuthHandler(socket));

            // attach all other handlers
            for (let [event, config] of this.handlers) {
                socket.on(event, this.buildEventHandler(config, socket));
            }
        });
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private buildAuthHandler(socket: SocketIO.Socket): SocketEventHandler {
        if (!socket) return;

        // set up variables
        const executor = this.authExecutor;
        const authenticator = this.context.authenticator;

        // build authentication handler for the socket
        return function (data: AuthInputs, callback: (response) => void) {
            executor.execute({ authenticator: authenticator }, data)
                .then((socketOwnerId) => {
                    socket.join(socketOwnerId, function() {
                        socket[symSocketAuthInputs] = data;
                        callback(undefined);
                    })
                })
                .catch((error) => {
                    // TODO: log the error
                    callback(error);
                });
        }
    }

    private buildEventHandler(config: HandlerConfig<any,any>, socket: SocketIO.Socket): SocketEventHandler {
        if (!config || !socket) return;

        // build execution options
        const options: ExecutionOptions = {
            daoOptions  : config.dao,
            rateOptions : config.rate,  // TODO: get default options from somewhere?
            authOptions : config.auth
        };

        // build executor
        const executor = new Executor(this.context, config.action, config.adapter, options);

        // build and return the handler
        return function(data: any, callback: (response) => void) {
            const inputs = Object.assign({}, config.defaults, data); 
            const authInputs: AuthInputs = undefined; // TODO: get auth data from socket
            executor.execute(inputs, authInputs)
                .then((result) => callback(undefined))
                .catch((error) => {
                    // TODO: log the error
                    callback(error);
                });
        }
    }
}

// AUTHENTICATOR ACTION
// =================================================================================================
interface SocketAuthInputs {
    authenticator: Authenticator
}

function socketAuthAdapter(this: ActionContext, inputs: SocketAuthInputs, authInfo: any): Promise<string> {
    // convert auth info to the owner string
    return Promise.resolve(inputs.authenticator.toOwner(authInfo));
}

function authenticateSocket(this: ActionContext, inputs: string): Promise<string> {
    // just a pass-through action
    return Promise.resolve(inputs);
}