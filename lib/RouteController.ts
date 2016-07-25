// IMPORTS
// =================================================================================================
import { 
    Action, ActionAdapter, Executor, ExecutorContext, ExecutionOptions, AuthInputs, RateOptions,
    DaoOptions, HttpStatusCode, Exception, validate, TooBusyError, UnsupportedMethodError
} from 'nova-base';
import { Router, RequestHandler, Request, Response } from 'router';
import * as accepts from 'accepts';
import * as typeIs from 'type-is';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';
import * as toobusy from 'toobusy-js';

import { defaults } from './../index';
import { parseAuthHeader } from './util';

// MODULE VARIABLES
// =================================================================================================
const DEFAULT_JSON_PARSER: RequestHandler = bodyParser.json();

const BODY_TYPE_CHECKERS = {
    json: function(request: Request, response: Response, next: Function) {
        return !request.headers['content-type'] || typeIs(request, ['json']) !== false
            ? next()
            : next(new Exception(`Only JSON body is supported for this request`, HttpStatusCode.UnsupportedContent));
    },
    files: function(request: Request, response: Response, next: Function) {
        return typeIs(request, ['multipart'])
            ? next()
            : next(new Exception(`Only multipart body is supported for this request`, HttpStatusCode.UnsupportedContent));
    }
};

const ACCPET_TYPE_CHECKER = {
    json: function(request: Request, response: Response, next: Function) {
        const checker = accepts(request);
        return checker.type(['json'])
            ? next()
            : next(new Exception(`Only JSON response can be returned from this endpoint`, HttpStatusCode.NotAcceptable));
    }
};

// INTERFACES
// =================================================================================================
type EndpointConfigOrHandler = EndpointConfig<any,any> | RequestHandler;

export interface RouteConfig {
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
export class RouteController {
    
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
        if (!path) throw new Error('Path cannot be undefined');
        if (!config) throw new Error('Route configuration cannot be undefined');
        if (this.routes.has(path))
            throw new Error(`Path {${path}} has already been bound to a handler`);
        this.routes.set(path, config);
    }

    attach(root: string, router: Router, context: ExecutorContext) {
        // check if the controller has already been attached
        if (this.root) throw new Error(`Controller has alread been bound to ${this.root} root`);

        // initialize controller variables
        this.root = root;
        this.context = context;

        // get the logger from context
        const logger = context.logger;

        // attach route handlers to the router
        for (let [subpath, config] of this.routes) {
            const methods = ['OPTIONS'];
            const route = router.route(this.root + subpath);
            const corsOptions: CorsOptions = Object.assign({}, defaults.CORS, config.cors);

            route.all(function(request: Request, response: Response, next: Function) {
                // add CORS response headers for all requests
                response.setHeader('Access-Control-Allow-Methods', allowedMethods);
                response.setHeader('Access-Control-Allow-Origin', corsOptions.origin);
                response.setHeader('Access-Control-Allow-Headers', allowedHeaders);
                response.setHeader('Access-Control-Allow-Credentials', corsOptions.credentials);
                response.setHeader('Access-Control-Max-Age', corsOptions.maxAge);
                
                if (request.method === 'OPTIONS') {
                    // immediately end OPTION requests
                    response.statusCode = HttpStatusCode.OK;
                    response.end();
                }
                else {
                    // log the request
                    logger && logger.request(request, response);

                    // check for server load
                    return toobusy() ? next(new TooBusyError()) : next();
                }
            });

            if (config.get) {
                route.get(...this.buildEndpointHandlers(config.get, true));
                methods.push('GET');
            }

            if (config.post) {
                route.post(...this.buildEndpointHandlers(config.post));
                methods.push('POST');
            }

            if (config.put) {
                route.put(...this.buildEndpointHandlers(config.put));
                methods.push('PUT');
            }

            if (config.patch) {
                route.patch(...this.buildEndpointHandlers(config.patch));
                methods.push('PATCH');
            }

            if (config.delete) {
                route.delete(...this.buildEndpointHandlers(config.delete));
                methods.push('DELETE');
            }

            // these variables are used in the server.all() handler above
            var allowedMethods = methods.join(',');
            var allowedHeaders = corsOptions.headers.join(',');

            // catch unsupported method requests
            route.all(function(request: Request, response: Response, next: Function) {
                next(new UnsupportedMethodError(request.method, request.path));
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
            rateLimits  : config.rate,
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
                // TODO: convert to regular (not asnyc) function

                // build inputs object
                const inputs = config.body && config.body.type === 'files' 
                    ? Object.assign({}, config.defaults, request.query, request.params, { files: request.files })
                    : Object.assign({}, config.defaults, request.query, request.params, request.body)

                // get the executor
                const executor = executorMap.get(inputs[selector]);
                validate.inputs(!selector || executor, `No actions found for the specified ${selector}`);

                // check authorization header
                let requestor: AuthInputs | string;
                const authHeader = request.headers['authorization'] || request.headers['Authorization'];
                if (authHeader) {
                    // if header is present, build auth inputs
                    requestor = parseAuthHeader(authHeader);
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

                    response.statusCode = HttpStatusCode.OK;
                    response.setHeader('Content-Type', 'application/json; charset=utf-8');
                    response.end(JSON.stringify(view), 'utf8')
                }
                else {
                    response.statusCode = HttpStatusCode.NoContent;
                    response.end();
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
    else {
        throw new Error('Cannot create an executor: no endpoint actions provided');
    }

    return executorMap;
}