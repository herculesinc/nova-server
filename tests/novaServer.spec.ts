///<reference path='../typings/tsd.d.ts'/>
import * as http from 'http';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { ActionContext, Authenticator, Database, Dao, DaoOptions, Cache, Dispatcher } from 'nova-base';
import { createApp } from './../index';
import { Application, AppConfig } from '../lib/Application';
import { RouteController, RouteConfig, EndpointConfig, ViewBuilder } from '../lib/RouteController';
import { MockDao } from './mocks/Database';

interface AdapterFunc {
    (this: ActionContext, inputs: any, authInfo: any): Promise<any>;
}
interface ActionFunc {
    (this: ActionContext, inputs: any): Promise<any>;
}

let app: Application;
let router: RouteController;
let authenticator: Authenticator;
let dao: Dao;
let database: Database;
let cache: Cache;
let dispatcher: Dispatcher;

let appConfig: AppConfig;
let routeConfig: RouteConfig;
let endpointConfig: EndpointConfig<any, any>;

let adapter: AdapterFunc;
let action: ActionFunc;
let view: ViewBuilder<any>;
let fakeRequest: any;

const daoOptions: DaoOptions = { startTransaction: true };

describe('NOVA-SERVER -> tests;', () => {
    beforeEach(() => {
        dao = new MockDao(daoOptions);
        database = { connect: sinon.stub().returns(Promise.resolve(dao)) };
        dispatcher = { dispatch: sinon.stub() };
    });

    describe('creating app;', () => {
        beforeEach(() => {
            appConfig = {
                name    : 'Test API Server',
                version : '0.0.1',
                database: database
            };
        });

        it('app object should be instance of Application', () => {
            app = createApp(appConfig);

            expect(app).to.be.instanceof(Application);
        });

        it('should return error if database was not provided', done => {
            delete appConfig.database;

            try {
                app = createApp(appConfig);
                done('should return error');
            } catch (err) {
                expect(err).to.match(/Database is undefined/);
                done();
            }
        });

        it('should return error if server name was not provided', done => {
            delete appConfig.name;

            try {
                app = createApp(appConfig);
                done('should return error');
            } catch (err) {
                expect(err).to.match(/name is undefined/);
                done();
            }
        });

        it('should return error if server version was not provided', done => {
            delete appConfig.version;

            try {
                app = createApp(appConfig);
                done('should return error');
            } catch (err) {
                expect(err).to.match(/version is undefined/);
                done();
            }
        });
    });

    describe('should run app server without any attached routes;', () => {
        beforeEach(() => {
            appConfig = {
                name    : 'Test API Server',
                version : '0.0.1',
                database: database
            };

            app = createApp(appConfig);
            fakeRequest = request(app.webServer).get('/');

            app.on('error', () => undefined);
        });

        it('should return 404', done => {
            fakeRequest
                .expect(404, done);
        });

        it('should emmit error with \'does not exist\' message', done => {
            fakeRequest
                .end(done);

            app.on('error', err => {
                expect(err.message).to.equal('Endpoint for / does not exist');
            });
        });

        it('should emmit error with 404 status', done => {
            fakeRequest
                .end(done);

            app.on('error', err => {
                expect(err.status).to.equal(404);
            });
        });
    });

    describe('should create GET \'\\\' API endpoint;', () => {
        beforeEach(() => {
            appConfig = {
                name      : 'Test API Server',
                version   : '0.0.1',
                database  : database,
                dispatcher: dispatcher
            };

            app = createApp(appConfig);
            router = new RouteController();
            endpointConfig = {
                action: sinon.stub().returns(Promise.resolve())
            };

            routeConfig = {
                get: endpointConfig
            };
        });

        it('should return 204 if view was not provided', done => {
            router.set('/', routeConfig);
            app.register('/', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .get('/')
                .expect(204, done);
        });

        it('should return 200 if view was provided', done => {
            endpointConfig.response = sinon.stub().returns(Promise.resolve());
            routeConfig = { get: endpointConfig };
            router.set('/', routeConfig);
            app.register('/', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .get('/')
                .expect(200, done);
        });
    });
});
