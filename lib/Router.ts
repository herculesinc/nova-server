// IMPORTS
// =================================================================================================
import { 
    Action, ActionAdapter, Executor, ExecutorContext, ExecutionOptions, AuthInputs, RateOptions,
    DaoOptions, HttpStatusCode, Exception, validate
} from 'nova-base';
import { Application as ExpressApp, RequestHandler, Request, Response } from 'express';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';

import { defaults } from './../index';

// MODULE VARIABLES
// =================================================================================================
const DEFAULT_JSON_PARSER: RequestHandler = bodyParser.json();

const BODY_TYPE_CHECKERS = {
    json: function(request: Request, response: Response, next: Function) {
        return !request.headers['content-type'] || request.is('json') !== false
            ? next()
            : next(new Exception(`Only JSON body is supported for this request`, HttpStatusCode.UnsupportedContent));
    },
    files: function(request: Request, response: Response, next: Function) {
        return request.is('multipart')
            ? next()
            : next(new Exception(`Only multipart body is supported for this request`, HttpStatusCode.UnsupportedContent));
    }
};

const ACCPET_TYPE_CHECKER = {
    json: function(request: Request, response: Response, next: Function) {
        return request.accepts('json')
            ? next()
            : next(new Exception(`Only JSON response can be returned from this endpoint`, HttpStatusCode.NotAcceptable));
    } 
};

// INTERFACES
// =================================================================================================
type EndpointConfigOrHandler = EndpointConfig<any,any> | RequestHandler;

export interface RouteConfig {
    name?   : string;
    get?    : EndpointConfigOrHandler;
    post?   : EndpointConfigOrHandler;
    put?    : EndpointConfigOrHandler;
    patch?  : EndpointConfigOrHandler;
    delete? : EndpointConfigOrHandler;
    cors?   : CorsOptions;
}

export interface EndpointConfig<V,T> {
    defaults?       : any;
    adapter?        : ActionAdapter<V>,
    action?         : Action<V,T>;
    actions?: {
        selector    : string;
        actionMap   : Iterable<[string, Action<V,T>]>;
    };
    response?       : ResponseOptions<T> | ViewBuilder<T>;
    body?           : JsonBodyOptions | FileBodyOptions;
    rate?           : RateOptions;
    dao?            : DaoOptions;
    auth?           : any;
}

interface RequestBodyOptions {
    type        : 'json' | 'files';
}

interface JsonBodyOptions extends RequestBodyOptions {
    limit?      : number;
}

interface FileBodyOptions extends RequestBodyOptions {
    field       : string;
    limits?: {
        count   : number;
        size    : number;
    };
}

export interface ViewBuilder<T> {
    (result: T, options?: any): any;
}

export interface ResponseOptions<T> {
    view        : ViewBuilder<T>,
    options?    : any;
}

interface CorsOptions {
    origin      : string;
    headers     : string[];
    credentials : string;
    maxAge      : string;
}

// CLASS DEFINITION
// =================================================================================================
export class Router {
    
    name    : string;
    root    : string;
    context : ExecutorContext;
    routes  : Map<string, RouteConfig>;
    
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name?: string) {
        this.name = name;
        this.routes = new Map<string, RouteConfig>();
    }
    
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    set(path: string, config: RouteConfig) {
        if (this.routes.has(path))
            throw new Error(`Path {${path}} has already been bound to a handler`);
        this.routes.set(path, config);
    }

    bind(root: string, server: ExpressApp, context: ExecutorContext) {
        // check if the router has already been bound
        if (this.root) throw new Error(`Router has alread been bound to ${this.root} root`);

        // initialize router variables
        this.root = root;
        this.context = context;

        // bind route handlers to the server
        for (let [subpath, config] of this.routes) {
            const methods = ['OPTIONS'];
            const fullpath = this.root + subpath;
            const corsOptions: CorsOptions = Object.assign({}, defaults.CORS, config.cors);

            server.all(this.root, function(request: Request, response: Response, next: Function) {
                response.header('Access-Control-Allow-Methods', allowedMethods);
                response.header('Access-Control-Allow-Origin', corsOptions.origin);
                response.header('Access-Control-Allow-Headers', allowedHeaders);
                response.header('Access-Control-Allow-Credentials', corsOptions.credentials);
                response.header('Access-Control-Max-Age', corsOptions.maxAge);
                
                return (request.method === 'OPTIONS') ? response.sendStatus(200) : next();
            });

            if (config.get) {
                server.get(fullpath, ...this.buildEndpointHandlers(config.get, true));
                methods.push('GET');
            }

            if (config.post) {
                server.post(fullpath, ...this.buildEndpointHandlers(config.post));
                methods.push('POST');
            }

            if (config.put) {
                server.put(fullpath, ...this.buildEndpointHandlers(config.put));
                methods.push('PUT');
            }

            if (config.patch) {
                server.patch(fullpath, ...this.buildEndpointHandlers(config.patch));
                methods.push('PATCH');
            }

            if (config.delete) {
                server.delete(fullpath, ...this.buildEndpointHandlers(config.delete));
                methods.push('DELETE');
            }

            // these variables are used in the server.all() handler above
            var allowedMethods = methods.join(',');
            var allowedHeaders = corsOptions.headers.join(',');

            // catch unsupported method requests
            server.all(this.root, function(request: Request, response: Response, next: Function) {
                const message = `Method ${request.method} is not allowed for ${request.baseUrl}`;
                next(new Exception(message, HttpStatusCode.NotAllowed));
            });
        }
    }

    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    private buildEndpointHandlers(configOrHandler: EndpointConfigOrHandler, readonly?: boolean): RequestHandler[] {
        if (!configOrHandler) return;
        if (typeof configOrHandler === 'function') return [configOrHandler];

        const config = configOrHandler;

        // make sure transactions are started for non-readonly handlers
        const options: ExecutionOptions = {
            daoOptions  : Object.assign({}, config.dao, { startTransaction: !readonly }),
            rateOptions : config.rate,  // TODO: get default options from somewhere?
            authOptions : config.auth
        };

        // attach type checkers and body parser
        const expectsResponse = (config.response != undefined);
        const handlers = [...getTypeCheckers(config.body, expectsResponse), getBodyParser(config.body)];

        // build executor map
        const selector = config.actions ? config.actions.selector : undefined;
        const executorMap = buildExecutorMap(config, this.context, options);

        // build endpoint handler
        handlers.push(async function(request: Request, response: Response, next: Function) {
            try {
                // build inputs object
                const inputs = config.body && config.body.type === 'files' 
                    ? Object.assign({}, config.defaults, request.query, request.params, { files: request.files })
                    : Object.assign({}, config.defaults, request.query, request.params, request.body)

                // get the executor
                const executor = executorMap.get(inputs[selector]);
                validate.inputs(!selector || executor, `No actions found for the specified ${selector}`);

                // check authorization header
                let requestor: AuthInputs | string;
                const authHeader = request.headers['authorization'];
                if (authHeader) {
                    // if header is present, build auth inputs
                    const authParts = authHeader.split(' ');
                    validate.inputs(authParts.length === 2, 'Invalid authorization header');
                    requestor = {
                        scheme      : authParts[0],
                        credentials : authParts[1]
                    };
                }
                else {
                    // otherwise, set requestor to the IP address of the request
                    requestor = request.ip;
                }

                // execute the action
                const result = await executor.execute(inputs, requestor);

                // build response
                if (config.response) {
                    const view = typeof config.response === 'function'
                        ? config.response(result)
                        : config.response.view(result, config.response.options);
                    if (!view) throw new Exception('Resource not found', HttpStatusCode.NotFound);
                    response.json(view);
                }
                else {
                    response.sendStatus(HttpStatusCode.NoContent);
                }
            }
            catch (error) {
                next(error);
            }
        });

        // return handlers
        return handlers;
    };
}

// HELPER FUNCTIONS
// =================================================================================================
function getTypeCheckers(config: JsonBodyOptions | FileBodyOptions, expectsResponse: boolean): RequestHandler[] {
    const checkers = [];

    // check body type
    if (!config || config.type === 'json') {
        checkers.push(BODY_TYPE_CHECKERS.json);
    }
    else if (config.type === 'files') {
        checkers.push(BODY_TYPE_CHECKERS.files);
    }
    else {
        throw new Error(`Body type ${config.type} is not supported`);
    }
    
    // check accepts
    if (expectsResponse) {
        checkers.push(ACCPET_TYPE_CHECKER.json);
    }

    return checkers;
}

function getBodyParser(config: JsonBodyOptions | FileBodyOptions): RequestHandler {
    if (!config) return DEFAULT_JSON_PARSER;

    if (config.type === 'json') {
        return bodyParser.json(config);
    }
    else if (config.type == 'files') {
        const fConfig = config as FileBodyOptions;

        // validate config object
        if (typeof fConfig.field !== 'string') throw new Error(`'field' is undefined in file body options`);
        if (!fConfig.limits) throw new Error(`'limits' are undefined in file body options`);
        if (typeof fConfig.limits.size !== 'number' || typeof fConfig.limits.count !== 'number') 
            throw new Error(`'limits' are invalid in file body options`);

        // build middleware
        return multer({
            storage: multer.memoryStorage(),
            limits: { 
                files   : fConfig.limits.count, 
                fileSize: fConfig.limits.size 
            }
        }).array(fConfig.field);
    }
    else {
        throw new Error(`Body type ${config.type} is not supported`);
    }
}

function buildExecutorMap<V,T>(config: EndpointConfig<V,T>, context: ExecutorContext, options: any): Map<string, Executor<V,T>> {

    const executorMap = new Map<string, Executor<V,T>>();

    if (config.actions) {
        const actionMap = new Map(config.actions.actionMap);
        for (let [key, action] of actionMap) {
            executorMap.set(key, new Executor(context, action, config.adapter, options));
        }
    }
    else if (config.action) {
        const executor = new Executor(context, config.action, config.adapter, options);
        executorMap.set(undefined, executor);
    }
    
    return executorMap;
}