declare module "router" {
    
    import { IncomingMessage, ServerResponse } from 'http';

    module router {
        interface Request extends IncomingMessage {
            query   : { [index: string]: string };
            params  : { [index: string]: string };
            path    : string;
            ip      : string;
            body    : any;
            files   : any;

            _parsedUrl: any;
        }

        interface Response extends ServerResponse {
            
        }

        interface RequestHandler {
            (req: Request, res: Response, next?: (error?: Error) => void): any;
        }

        interface Router extends RequestHandler {
            use     (path: string, ...handlers: RequestHandler[]) : Router;
            use     (...handlers: RequestHandler[]) : Router;

            get     (...handlers: RequestHandler[]) : Router;
            get     (path: string, ...handlers: RequestHandler[]) : Router;

            post    (...handlers: RequestHandler[]) : Router;
            post    (path: string, ...handlers: RequestHandler[]) : Router;

            put     (...handlers: RequestHandler[]) : Router;
            put     (path: string, ...handlers: RequestHandler[]) : Router;

            delete  (...handlers: RequestHandler[]) : Router;
            delete  (path: string, ...handlers: RequestHandler[]) : Router;

            patch   (...handlers: RequestHandler[]) : Router;
            patch   (path: string, ...handlers: RequestHandler[]) : Router;

            options (...handlers: RequestHandler[]) : Router;
            options (path: string, ...handlers: RequestHandler[]) : Router;

            head    (...handlers: RequestHandler[]) : Router;
            head    (path: string, ...handlers: RequestHandler[]) : Router;

            route(path: string): Route;
        }

        interface Route {
            all     (...handlers: RequestHandler[]) : Route;
            get     (...handlers: RequestHandler[]) : Route;
            post    (...handlers: RequestHandler[]) : Route;
            put     (...handlers: RequestHandler[]) : Route;
            delete  (...handlers: RequestHandler[]) : Route;
            patch   (...handlers: RequestHandler[]) : Route;
            options (...handlers: RequestHandler[]) : Route;
            head    (...handlers: RequestHandler[]) : Route;
        }
    }

    function router(options?: {
        strict          : boolean;
        caseSensitive   : boolean;
        mergeParams     : boolean;
    }): router.Router;
    
    export = router;
}