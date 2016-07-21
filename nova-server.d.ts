declare module "nova-server" {

    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------    
    import * as http from 'http';
    import * as events from 'events';
    import * as socketio from 'socket.io';
    import { RequestHandler } from 'express';
    import * as nova from 'nova-base';

    export * from 'nova-base';

    // APPLICATION
    // --------------------------------------------------------------------------------------------
    export interface AppConfig extends events.EventEmitter {
        name            : string;
        version         : string;
        server          : http.Server;
        sockets         : socketio.Server;
        authenticator   : nova.Authenticator;
        database        : nova.Database;
        cache           : nova.Cache;
        dispatcher      : nova.Dispatcher;
        logger?         : nova.Logger;
        limiter?        : nova.RateLimiter;
        settings?       : any;

        options?: {
            trustProxy      : boolean;
            versionHeader   : boolean;
            socketAuthEvent : string;
            tooBusyParams   : string;
            errorsToLog     : any;
            reateLimits     : any;
        }
    }

    export interface Application {
        name    : string;
        version : string;

        register(root: string, router: Router);
        register(nsps: string, listener: Listener);

        on(event: 'error', callback: (error: Error) => void);
    }

    // ROUTER
    // --------------------------------------------------------------------------------------------
    export class Router {
        constructor(name?: string);
        set<V,T>(path: string, config: RouteConfig);
    }

    export interface RouteConfig {
        name?   : string;
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
        body?           : JsonBodyOptions | FileBodyOptions;
        rate?           : nova.RateOptions;
        dao?            : nova.DaoOptions;
        auth?           : any;
    }

    export interface ViewBuilder<T> {
        (result: T, options?: any): any;
    }

    export interface ResponseOptions<T> {
        view        : ViewBuilder<T>,
        options?    : any;
    }

    export interface RequestBodyOptions {
        type        : 'json' | 'files';
    }

    export interface JsonBodyOptions {
        type        : 'json';
        limit?      : number;
    }

    export interface FileBodyOptions {
        type        : 'files';
        field       : string;
        limits?: {
            count   : number;
            size    : number;
        };
    }

    export interface CorsOptions {
        origin      : string;
        headers     : string[];
        credentials : string;
        maxAge      : string;
    }

    // LISTENER
    // --------------------------------------------------------------------------------------------
    export class Listener {
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

    // PUBLIC FUNCTIONS
    // --------------------------------------------------------------------------------------------
    export function createApp(config: AppConfig): Application;
}