// IMPORTS
// =================================================================================================
import * as http from 'http';
import { createApp, Router } from './../index';

import * as actions from './actions';
import * as adapters from './adapters';
import * as views from './views';
import { MockDatabase } from './mocks/Database';
import { MockCache } from './mocks/Cache';
import { authenticator } from './mocks/Authenticator';
import { MockDispatcher } from './mocks/Dispatcher';
import { MockLogger } from './mocks/Logger';

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

// APP
// =================================================================================================
const app = createApp({
    name            : 'API Server',
    version         : '0.0.1',
    webServer       : server,
    ioServer        : undefined,
    database        : new MockDatabase(),
    cache           : new MockCache(),
    dispatcher      : new MockDispatcher(),
    logger          : new MockLogger(),
    authenticator   : authenticator,
    settings        : undefined
});

// attach routers
app.register('/', router);

// start the server
server.listen(3000, function () {
    console.log('Server started');
});

