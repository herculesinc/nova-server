// Type definitions for socket.io 1.2.0
// Project: http://socket.io/
// Definitions by: PROGRE <https://github.com/progre/>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

///<reference path='../node/node.d.ts' />

declare module 'socket.io' {
    
    function io(): io.Server;
    function io(srv: any, opts?: io.ServerOptions): io.Server;
    function io(port: number, opts?: io.ServerOptions): io.Server;
    function io(opts: any): io.Server;

    module io {
        interface Server {
            serveClient(v: boolean): Server;
            path(v: string): Server;
            adapter(v: any): Server;
            origins(v: string): Server;
            sockets: Namespace;
            attach(srv: any, opts?: any): Server;
            attach(port: number, opts?: any): Server;
            listen(srv: any, opts?: any): Server;
            listen(port: number, opts?: any): Server;
            bind(srv: any): Server;
            onconnection(socket: any): Server;
            of(nsp: string): Namespace;
            emit(name: string, ...args: any[]): Socket;
            use(fn: Function): Namespace;

            on(event: 'connection', listener: (socket: Socket) => void): Namespace;
            on(event: 'connect', listener: (socket: Socket) => void): Namespace;
            on(event: string, listener: Function): Namespace;
        }

        interface ServerOptions {

            /**
             * The path to server the client file to
             * @default '/socket.io'
             */
            path?: string;

            /**
             * Should we serve the client file?
             * @default true
             */
            serveClient?: boolean;

            /**
             * The adapter to use for handling rooms. NOTE: this should be a class,
             * not an object
             * @default typeof Adapter
             */
            adapter?: any;

            /**
             * Accepted origins
             * @default '*:*'
             */
            origins?: string;

            /**
             * How many milliseconds without a pong packed to consider the connection closed (engine.io)
             * @default 60000
             */
            pingTimeout?: number;

            /**
             * How many milliseconds before sending a new ping packet (keep-alive) (engine.io)
             * @default 25000
             */
            pingInterval?: number;

            /**
             * How many bytes or characters a message can be when polling, before closing the session
             * (to avoid Dos) (engine.io)
             * @default 10E7
             */
            maxHttpBufferSize?: number;

            /**
             * A function that receives a given handshake or upgrade request as its first parameter,
             * and can decide whether to continue or not. The second argument is a function that needs
             * to be called with the decided information: fn( err, success ), where success is a boolean
             * value where false means that the request is rejected, and err is an error code (engine.io)
             * @default null
             */
            allowRequest?: (request:any, callback: (err: number, success: boolean) => void) => void;

            /**
             * Transports to allow connections to (engine.io)
             * @default ['polling','websocket']
             */
            transports?: string[];

            /**
             * Whether to allow transport upgrades (engine.io)
             * @default true
             */
            allowUpgrades?: boolean;

            /**
             * parameters of the WebSocket permessage-deflate extension (see ws module).
             * Set to false to disable (engine.io)
             * @default true
             */
            perMessageDeflate?: Object|boolean;

            /**
             * Parameters of the http compression for the polling transports (see zlib).
             * Set to false to disable, or set an object with parameter "threshold:number"
             * to only compress data if the byte size is above this value (1024) (engine.io)
             * @default true|1024
             */
            httpCompression?: Object|boolean;

            /**
             * Name of the HTTP cookie that contains the client sid to send as part of
             * handshake response headers. Set to false to not send one (engine.io)
             * @default "io"
             */
            cookie?: string|boolean;
        }

        interface Namespace extends NodeJS.EventEmitter {
            name: string;
            connected: { [id: string]: Socket };
            use(fn: Function): Namespace;
            in(room: string): Namespace;

            on(event: 'connection', listener: (socket: Socket) => void): this;
            on(event: 'connect', listener: (socket: Socket) => void): this;
            on(event: string, listener: Function): this;
        }

        interface Socket {
            rooms: string[];
            client: Client;
            conn: any;
            request: any;
            id: string;
            handshake: {
                headers: any;
                time: string;
                address: any;
                xdomain: boolean;
                secure: boolean;
                issued: number;
                url: string;
                query: any;
            };
            token: string;

            emit(name: string, ...args: any[]): Socket;
            join(name: string, fn?: Function): Socket;
            leave(name: string, fn?: Function): Socket;
            to(room: string): Socket;
            in(room: string): Socket;
            send(...args: any[]): Socket;
            write(...args: any[]): Socket;

            on(event: string, listener: Function): Socket;
            once(event: string, listener: Function): Socket;
            removeListener(event: string, listener: Function): Socket;
            removeAllListeners(event: string): Socket;
            broadcast: Socket;
            volatile: Socket;
            connected: boolean;
            disconnect(close?: boolean): Socket;
        }

        interface Client {
            conn: any;
            request: any;
        }
    }

    export = io;
}