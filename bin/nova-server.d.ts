declare module "nova-server" {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------    
    import * as http from 'http';
    import * as https from 'https';
    import * as events from 'events';
    import * as socketio from 'socket.io';
    import * as nova from 'nova-base';

    export * from 'nova-base';

    // APPLICATION
    // --------------------------------------------------------------------------------------------
    export interface AppConfig {
        name            : string;
        version         : string;
        webServer?      : WebServerConfig;
        ioServer?       : socketio.ServerOptions;
        authenticator?  : nova.Authenticator<any,any>;
        database        : nova.Database;
        cache?          : nova.Cache;
        dispatcher?     : nova.Dispatcher;
        limiter?        : nova.RateLimiter;
        rateLimits?     : nova.RateOptions;
        logger?         : nova.Logger;
        settings?       : any;
    }

    export interface WebServerConfig {
        server          : http.Server | https.Server;
        trustProxy?     : boolean | string | number;
    }

    export interface Application extends events.EventEmitter {
        name        : string;
        version     : string;

        ioServer    : socketio.Server;
        webServer   : http.Server | https.Server;

        register(root: string, router: RouteController);
        register(topic: string, listener: SocketListener);

        on(event: 'error', callback: (error: Error) => void);
        on(event: 'lag', callback: (lag: number) => void);
    }

    // ROUTE CONTROLLER
    // --------------------------------------------------------------------------------------------
    export class RouteController {
        name?: string;

        constructor(name?: string);
        set<V,T>(path: string, config: RouteConfig);
    }

    export interface RouteConfig {
        get?    : EndpointConfig<any,any> | RequestHandler;
        post?   : EndpointConfig<any,any> | RequestHandler;
        put?    : EndpointConfig<any,any> | RequestHandler;
        patch?  : EndpointConfig<any,any> | RequestHandler;
        delete? : EndpointConfig<any,any> | RequestHandler;
        cors?   : CorsOptions;
    }

    export interface EndpointConfig<V,T> {
        defaults?       : any;
        adapter?        : nova.ActionAdapter<V>;
        action?         : nova.Action<V,T>;
        actions?: {
            selector    : string;
            actionMap   : Iterable<[string, nova.Action<V,T>]>
        };
        response?       : ResponseOptions<T> | ViewBuilder<T>;
        body?           : JsonBodyOptions | FileBodyOptions | MultipartBodyOptions;
        rate?           : nova.RateOptions;
        dao?            : nova.DaoOptions;
        auth?           : any;
    }

    export interface ViewBuilder<T> {
        (result: T, options?: any, viewer?: string, timestamp?: number): any;
    }

    export interface ViewOptionsBuilder {
        (inputs: any, result: any, viewer?: string, timestamp?: number): any;
    }

    export interface ResponseOptions<T> {
        view        : ViewBuilder<T>,
        options?    : ViewOptionsBuilder | any;
    }

    export interface RequestBodyOptions {
        type        : 'json' | 'files' | 'multipart';
    }

    export interface JsonBodyOptions {
        type        : 'json';
        mapTo?      : string;
        limit?      : number;
        verify?     : (request: Request, response: Response, body: Buffer, encoding: string) => void;
    }

    export interface FileBodyOptions {
        type        : 'files';
        field       : string;
        storage?    : any;
        limits?: {
            count   : number;
            size    : number;
        };
    }

    export interface MultipartBodyOptions extends RequestBodyOptions {
        type            : 'multipart';
        mapFilesTo?     : string;
        storage?        : any;
        limits?: {
            fields?     : number;
            fieldSize?  : number;
            files?      : number;
            fileSize?   : number;
        };
    }

    export interface CorsOptions {
        origin      : string;
        headers     : string[];
        credentials : string;
        maxAge      : string;
    }

    // SOCKET LISTENER
    // --------------------------------------------------------------------------------------------
    export class SocketListener {
        name?: string;

        constructor(name?: string);
        on<V,T>(event: string, config: SocketHandlerConfig<V,T>);
    }

    export interface SocketHandlerConfig<V,T> {
        defaults?       : any;
        adapter?        : nova.ActionAdapter<V>;
        action          : nova.Action<V,T>;
        rate?           : nova.RateOptions;
        dao?            : nova.DaoOptions;
        auth?           : any;
    }

    // LOAD CONTROLLER
    // --------------------------------------------------------------------------------------------
    export interface LoadControllerConfig {
        interval: number;
        maxLag  : number;
    }

    // REQUEST HANDLER
    // --------------------------------------------------------------------------------------------
    export interface Request extends http.IncomingMessage {
        query   : { [index: string]: string };
        params  : { [index: string]: string };
        path    : string;
        ip      : string;
        body?   : any;
        files?  : any;
    }

    export interface Response extends http.ServerResponse {
        
    }

    export interface RequestHandler {
        (request: Request, response: Response, next?: (error?: Error) => void): any;
    }

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function createApp(config: AppConfig): Application;

    export function configure(setting: 'load controller', config: LoadControllerConfig);
}