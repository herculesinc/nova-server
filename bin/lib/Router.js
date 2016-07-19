"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
// IMPORTS
// =================================================================================================
const nova_base_1 = require('nova-base');
const bodyParser = require('body-parser');
const multer = require('multer');
const index_1 = require('./../index');
// MODULE VARIABLES
// =================================================================================================
const DEFAULT_JSON_PARSER = bodyParser.json();
const BODY_TYPE_CHECKERS = {
    json: function (request, response, next) {
        return !request.headers['content-type'] || request.is('json') !== false
            ? next()
            : next(new nova_base_1.ClientError(`Only JSON body is supported for this request`, nova_base_1.HttpStatusCode.UnsupportedContent));
    },
    files: function (request, response, next) {
        return request.is('multipart')
            ? next()
            : next(new nova_base_1.ClientError(`Only multipart body is supported for this request`, nova_base_1.HttpStatusCode.UnsupportedContent));
    }
};
const ACCPET_TYPE_CHECKER = {
    json: function (request, response, next) {
        return request.accepts('json')
            ? next()
            : next(new nova_base_1.ClientError(`Only JSON response can be returned from this endpoint`, nova_base_1.HttpStatusCode.NotAcceptable));
    }
};
// CLASS DEFINITION
// =================================================================================================
class Router {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor() {
        this.routes = new Map();
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    set(path, config) {
        if (this.routes.has(path))
            throw new Error(`Path {${path}} has already been bound to a handler`);
        this.routes.set(path, config);
    }
    bind(root, server, context) {
        // check if the router has already been bound
        if (this.root)
            throw new Error(`Router has alread been bound to ${this.root} root`);
        // initialize router variables
        this.root = root;
        this.context = context;
        // bind route handlers to the server
        for (let [subpath, config] of this.routes) {
            const methods = ['OPTIONS'];
            const fullpath = this.root + subpath;
            const corsOptions = Object.assign({}, index_1.defaults.CORS, config.cors);
            server.all(this.root, function (request, response, next) {
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
            server.all(this.root, function (request, response, next) {
                const message = `Method ${request.method} is not allowed for ${request.baseUrl}`;
                next(new nova_base_1.ClientError(message, nova_base_1.HttpStatusCode.NotAllowed));
            });
        }
    }
    // PRIVATE METHODS
    // --------------------------------------------------------------------------------------------
    buildEndpointHandlers(configOrHandler, readonly) {
        if (!configOrHandler)
            return;
        if (typeof configOrHandler === 'function')
            return [configOrHandler];
        const config = configOrHandler;
        const rateLimiter = this.context.limiter;
        // make sure transactions are started for non-readonly handlers
        const options = {
            daoOptions: Object.assign({}, config.connection, { startTransaction: !readonly }),
            rateOptions: config.rate,
            authOptions: undefined // TODO: add?
        };
        // attach type checkers and body parser
        const expectsResponse = (config.response != undefined);
        const handlers = [...getTypeCheckers(config.body, expectsResponse), getBodyParser(config.body)];
        // build executor map
        const selector = config.actions ? config.actions.selector : undefined;
        const executorMap = buildExecutorMap(config, this.context, options);
        // build endpoint handler
        handlers.push(function (request, response, next) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    // build inputs object
                    const inputs = config.body && config.body.type === 'files'
                        ? Object.assign({}, config.defaults, request.query, request.params, { files: request.files })
                        : Object.assign({}, config.defaults, request.query, request.params, request.body);
                    // get the executor
                    const executor = executorMap.get(inputs[selector]);
                    nova_base_1.validate.inputs(!selector || executor, `No actions found for the specified ${selector}`);
                    // check authorization header
                    let authInputs = undefined;
                    const authHeader = request.headers['authorization'];
                    if (authHeader) {
                        // if header is present, build auth inputs
                        const authParts = authHeader.split(' ');
                        nova_base_1.validate.inputs(authParts.length === 2, 'Invalid authorization header');
                        authInputs = {
                            scheme: authParts[0],
                            credentials: authParts[1]
                        };
                    }
                    else if (rateLimiter && config.rate) {
                    }
                    // execute the action
                    const result = yield executor.execute(inputs, authInputs);
                    // build response
                    if (config.response) {
                        const view = typeof config.response === 'function'
                            ? config.response(result)
                            : config.response.view(result, config.response.options);
                        if (!view)
                            throw new nova_base_1.ClientError('Resource not found', nova_base_1.HttpStatusCode.NotFound);
                        response.json(view);
                    }
                    else {
                        response.sendStatus(nova_base_1.HttpStatusCode.NoContent);
                    }
                }
                catch (error) {
                    next(error);
                }
            });
        });
        // return handlers
        return handlers;
    }
    ;
}
exports.Router = Router;
// HELPER FUNCTIONS
// =================================================================================================
function getTypeCheckers(config, expectsResponse) {
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
function getBodyParser(config) {
    if (!config)
        return DEFAULT_JSON_PARSER;
    if (config.type === 'json') {
        return bodyParser.json(config);
    }
    else if (config.type == 'files') {
        const fConfig = config;
        // validate config object
        if (typeof fConfig.field !== 'string')
            throw new Error(`'field' is undefined in file body options`);
        if (!fConfig.limits)
            throw new Error(`'limits' are undefined in file body options`);
        if (typeof fConfig.limits.size !== 'number' || typeof fConfig.limits.count !== 'number')
            throw new Error(`'limits' are invalid in file body options`);
        // build middleware
        return multer({
            storage: multer.memoryStorage(),
            limits: {
                files: fConfig.limits.count,
                fileSize: fConfig.limits.size
            }
        }).array(fConfig.field);
    }
    else {
        throw new Error(`Body type ${config.type} is not supported`);
    }
}
function buildExecutorMap(config, context, options) {
    const executorMap = new Map();
    if (config.actions) {
        const actionMap = new Map(config.actions.actionMap);
        for (let [key, action] of actionMap) {
            executorMap.set(key, new nova_base_1.Executor(context, action, config.adapter, options));
        }
    }
    else if (config.action) {
        const executor = new nova_base_1.Executor(context, config.action, config.adapter, options);
        executorMap.set(undefined, executor);
    }
    return executorMap;
}
//# sourceMappingURL=Router.js.map