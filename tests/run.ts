// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as socketio from 'socket.io';
import { createApp, Router, SocketListener } from './../index';

import * as actions from './actions';
import * as adapters from './adapters';
import * as views from './views';
import { users } from './data/users';
import { MockDatabase } from './mocks/Database';
import { MockCache } from './mocks/Cache';
import { authenticator } from './mocks/Authenticator';
import { MockDispatcher } from './mocks/Dispatcher';
import { MockLogger } from './mocks/Logger';
import { MockRateLimiter } from './mocks/RateLimiter';

// PERPARATIONS
// =================================================================================================
const server = http.createServer();

const router = new Router();
router.set('/', {
    name            : 'root',
    get: {
        adapter     : adapters.helloWorldAdapter,
        action      : actions.helloWorldAction,
        response    : views.generateHelloWorldView
    }
});

const listener = new SocketListener();
listener.on('hello', {
    adapter     : adapters.helloWorldAdapter,
    action      : actions.helloWorldAction
});

// APP
// =================================================================================================
const app = createApp({
    name            : 'API Server',
    version         : '0.0.1',
    webServer: {
        server      : server,
        trustProxy  : true
    },
    ioServer        : undefined, // will create a default socket.io server
    authenticator   : authenticator,
    database        : new MockDatabase(),
    cache           : new MockCache(),
    dispatcher      : new MockDispatcher(),
    limiter         : new MockRateLimiter([users[1].id]),
    rateLimits: {
        window      : 250,
        limit       : 10
    },
    logger          : new MockLogger(),
    settings        : undefined
});

// attach routers
app.register('/', router);
app.register('/', listener);
app.start();

// start the server
server.listen(3000, function () {
    console.log('Server started');
});

app.on('error', function(error) {
    console.log(error.stack);
});