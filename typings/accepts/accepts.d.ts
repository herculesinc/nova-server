/// <reference path="../node/node.d.ts" />

declare module "accepts" {
    import http = require("http");

    module accepts { 
        export interface Accepts {
            type(types: string[]): string | boolean;
            encoding(encodings: string[]): string | boolean;
            charset(charsets: string[]): string | boolean;
            language(languages: string[]): string | boolean;
        }
    }

    function accepts(request: http.IncomingMessage): accepts.Accepts;

    export = accepts;
}