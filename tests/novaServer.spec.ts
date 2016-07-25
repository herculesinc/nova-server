///<reference path='../typings/tsd.d.ts'/>
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { Authenticator, Database, Dao, DaoOptions, Dispatcher } from 'nova-base';
import { createApp } from './../index';
import { Application, AppConfig } from '../lib/Application';
import { RouteController, RouteConfig, EndpointConfig } from '../lib/RouteController';
import { MockDao } from './mocks/Database';

let app: Application;
let router: RouteController;
let authenticator: Authenticator;
let dao: Dao;
let database: Database;
let dispatcher: Dispatcher;

let appConfig: AppConfig;
let routeConfig: RouteConfig;
let endpointConfig: EndpointConfig<any, any>;

let fakeRequest: any;

const daoOptions: DaoOptions = { startTransaction: true };

describe('NOVA-SERVER -> tests;', () => {
    beforeEach(() => {
        dao = new MockDao(daoOptions);
        database = { connect: sinon.stub().returns(Promise.resolve(dao)) };
        dispatcher = { dispatch: sinon.stub() };
        authenticator = sinon.stub().returns(Promise.resolve({ results: 'auth results' }));
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
                action  : sinon.stub().returns(Promise.resolve({ results: 'action results' })),
                response: sinon.stub().returns({ results: 'view results' })
            };

            routeConfig = {
                get: endpointConfig
            };
        });

        describe('without view function;', () => {
            beforeEach(() => {
                delete endpointConfig.response;
                routeConfig = { get: endpointConfig };
                router.set('/', routeConfig);
                app.register('/', router);
                app.on('error', () => undefined);
                fakeRequest = request(app.webServer).get('/');
            });

            it('should return status 204', done => {
                fakeRequest
                    .expect(204, done);
            });

            it('should return empty body', done => {
                fakeRequest
                    .expect(204)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.be.empty;
                        done();
                    });
            });
        });

        describe('with view function;', () => {
            beforeEach(() => {
                router.set('/', routeConfig);
                app.register('/', router);
                app.on('error', () => undefined);
                fakeRequest = request(app.webServer).get('/');
            });

            it('should return status 200', done => {
                fakeRequest
                    .expect(200, done);
            });

            it('should return view result in body', done => {
                fakeRequest
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.not.be.empty;
                        expect(res.body).to.deep.equal({ results: 'view results' });
                        done();
                    });
            });
        });
    });

    describe('all functions should be called with right arguments;', () => {
        beforeEach(() => {
            appConfig = {
                name         : 'Test API Server',
                version      : '0.0.1',
                database     : database,
                dispatcher   : dispatcher,
                authenticator: authenticator
            };
            endpointConfig = {
                action : sinon.stub().returns(Promise.resolve({ results: 'action results' })),
                adapter: sinon.stub().returns(Promise.resolve({ results: 'adapter results' }))
            };
            routeConfig = {
                get: endpointConfig
            };

            app = createApp(appConfig);
            router = new RouteController();
            router.set('/', routeConfig);
            app.register('/', router);
            app.on('error', () => undefined);
        });

        describe('when auth token was not provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .expect(204)
                    .end(done);
            });

            it('authenticator should not be called', () => {
                expect((authenticator as any).called).to.be.false;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });
        });

        describe('when auth token was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .set('Authorization', 'token awdfasdfasdasdfa')
                    .expect(204, done);
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called with right arguments', () => {
                expect((authenticator as any).firstCall.calledWithExactly({
                    scheme     : 'token',
                    credentials: 'awdfasdfasdasdfa'
                }, undefined)).to.be.true;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                expect((endpointConfig.adapter as any).firstCall.calledWithExactly({}, { results: 'auth results' })).to.be.true;
            });
        });

        describe('when query was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .query({ some: 'data' })
                    .set('Authorization', 'token awdfasdfasdasdfa')
                    .expect(204, done);
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called with right arguments', () => {
                expect((authenticator as any).firstCall.calledWithExactly({
                    scheme     : 'token',
                    credentials: 'awdfasdfasdasdfa'
                }, undefined)).to.be.true;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                expect((endpointConfig.adapter as any).firstCall.calledWithExactly({ some: 'data'}, { results: 'auth results' })).to.be.true;
            });
        });
    });
});
