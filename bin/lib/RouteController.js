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
const accepts = require('accepts');
const typeIs = require('type-is');
const bodyParser = require('body-parser');
const multer = require('multer');
const toobusy = require('toobusy-js');
const index_1 = require('./../index');
const util_1 = require('./util');
// MODULE VARIABLES
// =================================================================================================
const DEFAULT_JSON_PARSER = bodyParser.json();
const BODY_TYPE_CHECKERS = {
    json: function (request, response, next) {
        return !request.headers['content-type'] || typeIs(request, ['json']) !== false
            ? next()
            : next(new nova_base_1.Exception(`Only JSON body is supported for this request`, 415 /* UnsupportedContent */));
    },
    files: function (request, response, next) {
        return typeIs(request, ['multipart'])
            ? next()
            : next(new nova_base_1.Exception(`Only multipart body is supported for this request`, 415 /* UnsupportedContent */));
    }
};
const ACCPET_TYPE_CHECKER = {
    json: function (request, response, next) {
        const checker = accepts(request);
        return checker.type(['json'])
            ? next()
            : next(new nova_base_1.Exception(`Only JSON response can be returned from this endpoint`, 406 /* NotAcceptable */));
    }
};
// CLASS DEFINITION
// =================================================================================================
class RouteController {
    // CONSTRUCTOR
    // --------------------------------------------------------------------------------------------
    constructor(name) {
        this.name = name;
        this.routes = new Map();
    }
    // PUBLIC METHODS
    // --------------------------------------------------------------------------------------------
    set(path, config) {
        // check path parameter
        if (!path)
            throw new TypeError(`Route path '${path}' is not valid`);
        if (typeof path !== 'string')
            throw new TypeError(`Route path must be a string`);
        if (path.charAt(0) === '/')
            path = path.substring(1);
        if (this.routes.has(path))
            throw new Error(`Route path {${path}} has already been bound to a handler`);
        // check config parameter
        if (!config)
            throw new TypeError('Route configuration cannot be undefined');
        // register the route
        this.routes.set(path, config);
    }
    attach(root, router, context) {
        // check if the controller can be attached to this root
        if (!root)
            throw new TypeError(`Cannot attach route controller to '${root}' root`);
        if (typeof root !== 'string')
            throw new TypeError(`Route controller root must be a string`);
        if (this.root)
            throw new TypeError(`Route controller has alread been bound to '${this.root}'`);
        if (!context)
            throw new TypeError(`Route controller cannot be attached to an undefined context`);
        // initialize controller variables
        this.root = (root.charAt(root.length - 1) !== '/') ? root + '/' : root;
        this.context = context;
        // get the logger from context
        const logger = context.logger;
        // attach route handlers to the router
        for (let [subpath, config] of this.routes) {
            const methods = ['OPTIONS'];
            const route = router.route(this.root + subpath);
            const corsOptions = Object.assign({}, index_1.defaults.CORS, config.cors);
            route.all(function (request, response, next) {
                // add CORS response headers for all requests
                response.setHeader('Access-Control-Allow-Methods', allowedMethods);
                response.setHeader('Access-Control-Allow-Origin', corsOptions.origin);
                response.setHeader('Access-Control-Allow-Headers', allowedHeaders);
                response.setHeader('Access-Control-Allow-Credentials', corsOptions.credentials);
                response.setHeader('Access-Control-Max-Age', corsOptions.maxAge);
                if (request.method === 'OPTIONS') {
                    // immediately end OPTION requests
                    response.statusCode = 200 /* OK */;
                    response.end();
                }
                else {
                    // log the request
                    logger && logger.request(request, response);
                    // check for server load
                    return toobusy() ? next(new nova_base_1.TooBusyError()) : next();
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
            route.all(function (request, response, next) {
                next(new nova_base_1.UnsupportedMethodError(request.method, request.path));
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
        // make sure transactions are started for non-readonly handlers
        const options = {
            daoOptions: Object.assign({ startTransaction: !readonly }, config.dao),
            rateLimits: config.rate,
            authOptions: config.auth
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
                    let requestor;
                    const authHeader = request.headers['authorization'] || request.headers['Authorization'];
                    if (authHeader) {
                        // if header is present, build auth inputs
                        requestor = util_1.parseAuthHeader(authHeader);
                    }
                    else {
                        // otherwise, set requestor to the IP address of the request
                        requestor = request.ip;
                    }
                    // execute the action
                    const result = yield executor.execute(inputs, requestor);
                    // build response
                    if (config.response) {
                        let view;
                        if (typeof config.response === 'function') {
                            view = config.response(result);
                        }
                        else {
                            const viewBuilderOptions = (typeof config.response.options === 'function')
                                ? config.response.options(inputs, result)
                                : config.response.options;
                            view = config.response.view(result, viewBuilderOptions);
                        }
                        if (!view)
                            throw new nova_base_1.Exception('Resource not found', 404 /* NotFound */);
                        switch (typeof view) {
                            case 'string':
                            case 'number':
                            case 'boolean':
                            case 'function':
                            case 'symbol':
                                throw new nova_base_1.Exception(`View for ${request.method} ${request.path} returned invalid value`);
                        }
                        response.statusCode = 200 /* OK */;
                        response.setHeader('Content-Type', 'application/json; charset=utf-8');
                        response.end(JSON.stringify(view), 'utf8');
                    }
                    else {
                        response.statusCode = 204 /* NoContent */;
                        response.end();
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
exports.RouteController = RouteController;
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
        throw new TypeError(`Body type '${config.type}' is not supported`);
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
            throw new TypeError(`'field' is undefined in file body options`);
        if (!fConfig.limits)
            throw new TypeError(`'limits' are undefined in file body options`);
        if (typeof fConfig.limits.size !== 'number' || typeof fConfig.limits.count !== 'number')
            throw new TypeError(`'limits' are invalid in file body options`);
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
        throw new TypeError(`Body type '${config.type}' is not supported`);
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
    else {
        throw new TypeError('Cannot create an executor: no endpoint actions provided');
    }
    return executorMap;
}
//# sourceMappingURL=RouteController.js.map