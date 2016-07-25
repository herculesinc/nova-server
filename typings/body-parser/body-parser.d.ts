// Type definitions for body-parser
// Project: http://expressjs.com
// Definitions by: Santi Albo <https://github.com/santialbo/>, VILIC VANE <https://vilic.info>, Jonathan Häberle <https://github.com/dreampulse/>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

declare module "body-parser" {
    import * as router from "router";

    /**
     * bodyParser: use individual json/urlencoded middlewares
     * @deprecated
     */

    function bodyParser(options?: {
        /**
         * if deflated bodies will be inflated. (default: true)
         */
        inflate?: boolean;
        /**
         * maximum request body size. (default: '100kb')
         */
        limit?: any;
        /**
         * function to verify body content, the parsing can be aborted by throwing an error.
         */
        verify?: (req: router.Request, res: router.Response, buf: Buffer, encoding: string) => void;
        /**
         * only parse objects and arrays. (default: true)
         */
        strict?: boolean;
        /**
         * passed to JSON.parse().
         */
        reviver?: (key: string, value: any) => any;
        /**
         * parse extended syntax with the qs module. (default: true)
         */
        extended?: boolean;
    }): router.RequestHandler;

    namespace bodyParser {
        export function json(options?: {
            /**
             * if deflated bodies will be inflated. (default: true)
             */
            inflate?: boolean;
            /**
             * maximum request body size. (default: '100kb')
             */
            limit?: any;
            /**
             * request content-type to parse, passed directly to the type-is library. (default: 'json')
             */
            type?: any;
            /**
             * function to verify body content, the parsing can be aborted by throwing an error.
             */
            verify?: (req: router.Request, res: router.Response, buf: Buffer, encoding: string) => void;
            /**
             * only parse objects and arrays. (default: true)
             */
            strict?: boolean;
            /**
             * passed to JSON.parse().
             */
            reviver?: (key: string, value: any) => any;
        }): router.RequestHandler;

        export function raw(options?: {
            /**
             * if deflated bodies will be inflated. (default: true)
             */
            inflate?: boolean;
            /**
             * maximum request body size. (default: '100kb')
             */
            limit?: any;
            /**
             * request content-type to parse, passed directly to the type-is library. (default: 'application/octet-stream')
             */
            type?: any;
            /**
             * function to verify body content, the parsing can be aborted by throwing an error.
             */
            verify?: (req: router.Request, res: router.Response, buf: Buffer, encoding: string) => void;
        }): router.RequestHandler;

        export function text(options?: {
            /**
             * if deflated bodies will be inflated. (default: true)
             */
            inflate?: boolean;
            /**
             * maximum request body size. (default: '100kb')
             */
            limit?: any;
            /**
             * request content-type to parse, passed directly to the type-is library. (default: 'text/plain')
             */
            type?: any;
            /**
             * function to verify body content, the parsing can be aborted by throwing an error.
             */
            verify?: (req: router.Request, res: router.Response, buf: Buffer, encoding: string) => void;
            /**
             * the default charset to parse as, if not specified in content-type. (default: 'utf-8')
             */
            defaultCharset?: string;
        }): router.RequestHandler;

        export function urlencoded(options: {
            /**
             * if deflated bodies will be inflated. (default: true)
             */
            inflate?: boolean;
            /**
             * maximum request body size. (default: '100kb')
             */
            limit?: any;
            /**
             * request content-type to parse, passed directly to the type-is library. (default: 'urlencoded')
             */
            type?: any;
            /**
             * function to verify body content, the parsing can be aborted by throwing an error.
             */
            verify?: (req: router.Request, res: router.Response, buf: Buffer, encoding: string) => void;
            /**
             * parse extended syntax with the qs module.
             */
            extended: boolean;
        }): router.RequestHandler;
    }

    export = bodyParser;
}
