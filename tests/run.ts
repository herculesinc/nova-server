// IMPORTS
// =================================================================================================
import * as http from 'http';
import * as socketio from 'socket.io';
import { createApp, RouteController, SocketListener } from './../index';

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
const controller = new RouteController();
controller.set('/', {
    get: {
        adapter     : adapters.helloWorldAdapter,
        action      : actions.helloWorldAction,
        response: {
            view    : views.generateHelloWorldView,
            options : function(inputs: any, result: any, viewer: string) {
                console.log(viewer + ': in view option builder');
            } 
        } 
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
app.register('/', controller);
app.register('/', listener);

// start the server
app.webServer.listen(3000, function () {
    console.log('Server started');
});

app.on('error', function(error) {
    console.log(error.stack);
});

app.on('lag', function(lag) {
    console.log('Server lag detected: ' + lag);
});