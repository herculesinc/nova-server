declare module "router" {
    
    import { IncomingMessage, ServerResponse } from 'http';

    module router {}
    
    interface Request extends IncomingMessage {
        query   : any;
        params  : any;
        path    : string;
        ip      : string;
        body    : any;
        files   : any;
    }

    interface Response extends ServerResponse {
        json(body: any);
        sendStatus(status: number);
    }

    interface RequestHandler {
        (req: Request, res: Response): any;
    }

    interface Middleware {
        (req: Request, res: Response, next: (err?: any) => void): any;
    }

    interface Router {
        use(path: string, ...handlers: Middleware[]);
        use(...handlers: Middleware[]);

        get(path: string, handler: RequestHandler);
        post(path: string, handler: RequestHandler);
        put(path: string, handler: RequestHandler);
        delete(path: string, handler: RequestHandler);
        patch(path: string, handler: RequestHandler);
        options(path: string, handler: RequestHandler);
        head(path: string, handler: RequestHandler);

        route(path: string): Route;
    }

    interface Route {
        all(handler: RequestHandler);
        get(handler: RequestHandler);
        post(handler: RequestHandler);
        put(handler: RequestHandler);
        delete(handler: RequestHandler);
        patch(handler: RequestHandler);
        options(handler: RequestHandler);
        head(handler: RequestHandler);
    }

    function router(options?: {
        strict          : boolean;
        caseSensitive   : boolean;
        mergeParams     : boolean;
    }): Router;
    
    export = router;
}