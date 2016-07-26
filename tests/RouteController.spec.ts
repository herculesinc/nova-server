///<reference path='../typings/tsd.d.ts'/>
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { Authenticator, Database, Dao, DaoOptions, validate } from 'nova-base';
import { createApp } from './../index';
import { Application, AppConfig } from '../lib/Application';
import { RouteController, RouteConfig, EndpointConfig } from '../lib/RouteController';
import { MockDao } from './mocks/Database';

let app: Application;
let router: RouteController;
let authenticator: Authenticator;
let dao: Dao;
let database: Database;

let appConfig: AppConfig;
let routeConfig: RouteConfig;
let endpointConfig: EndpointConfig<any, any>;

let fakeRequest: any;

const daoOptions: DaoOptions = { startTransaction: true };
const authResult: any = { results: 'auth results' };
const actionResult: any = { results: 'action results' };
const adapterResult: any = { results: 'adapter results' };
const viewResult: any = { results: 'view results' };
const defaultsData: any = {
    bar: 'foo',
    foo: 'bar'
};
const defaultQuery: any = {
    param1: '1',
    param2: 'bar'
};
const defaultBody: any = {
    bodyParam1: 1,
    bodyParam2: true
};
const authOptions: any = { isRequired: false };
const routeDaoOptions: DaoOptions = { startTransaction: true };
const authToken: string = 'testAuthToken';

describe('NOVA-SERVER -> RouteController;', () => {
    beforeEach(() => {
        dao = new MockDao(daoOptions);
        database = { connect: sinon.stub().returns(Promise.resolve(dao)) };
        authenticator = sinon.stub().returns(Promise.resolve(authResult));
    });

    describe('should create app;', () => {
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
            fakeRequest = request(app.webServer)
                .get('/');

            app.on('error', () => undefined);
        });

        it('should return 404', done => {
            fakeRequest
                .expect(404, done);
        });

        it('should emmit error with \'does not exist\' message', done => {
            fakeRequest.end(() => {
            });

            app.on('error', err => {
                expect(err.message).to.equal('Endpoint for / does not exist');
                done();
            });
        });

        it('should emmit error with 404 status', done => {
            fakeRequest.end(() => {
            });

            app.on('error', err => {
                expect(err.status).to.equal(404);
                done();
            });
        });
    });

    describe('should run app server with one attached routes;', () => {
        beforeEach(() => {
            appConfig = {
                name    : 'Test API Server',
                version : '0.0.1',
                database: database
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

        describe('should return status 204 and empty body when view function was not provided;', () => {
            beforeEach(() => {
                delete endpointConfig.response;
                routeConfig = { get: endpointConfig };
                router.set('/', routeConfig);
                app.register('/', router);
                app.on('error', () => undefined);
                fakeRequest = request(app.webServer)
                    .get('/')
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

        describe('should return status 200 and result object when view function was provided;', () => {
            beforeEach(() => {
                router.set('/', routeConfig);
                app.register('/', router);
                app.on('error', () => undefined);
                fakeRequest = request(app.webServer)
                    .get('/');
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

    describe('should create different api endpoints;', () => {
        beforeEach(() => {
            appConfig = {
                name    : 'Test API Server',
                version : '0.0.1',
                database: database
            };

            app = createApp(appConfig);
            router = new RouteController();
            endpointConfig = {
                action: sinon.stub().returns(Promise.resolve({ results: 'action results' }))
            };
        });

        it('should create GET \'/\' with root \'/\'', done => {
            router.set('/', { get: endpointConfig });
            app.register('/', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .get('/')
                .expect(204, done);
        });

        it('should create GET \'/\' with root \'/users\'', done => {
            router.set('/', { get: endpointConfig });
            app.register('/users', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .get('/users')
                .expect(204, done);
        });

        it('should create POST \'/:id\' with root \'/\'', done => {
            router.set('/:id', { post: endpointConfig });
            app.register('/', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .post('/12345')
                .expect(204, done);
        });

        it('should create POST \':id\' with root \'/\'', done => {
            router.set(':id', { post: endpointConfig });
            app.register('/', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .post('/12345')
                .expect(204, done);
        });

        it('should create PUT \'/:id\' with root \'/user\'', done => {
            router.set('/:id', { put: endpointConfig });
            app.register('/user', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .put('/user/12345')
                .expect(204, done);
        });

        it('should create PUT \':id\' with root \'/user\'', done => {
            router.set(':id', { put: endpointConfig });
            app.register('/user', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .put('/user/12345')
                .expect(204, done);
        });

        it('should create PATCH \'/:section/:id\' with root \'/post\'', done => {
            router.set('/:section/:id', { patch: endpointConfig });
            app.register('/post', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .patch('/post/all/qwerty')
                .expect(204, done);
        });

        it('should create PATCH \':section/:id\' with root \'/post\'', done => {
            router.set(':section/:id', { patch: endpointConfig });
            app.register('/post', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .patch('/post/all/qwerty')
                .expect(204, done);
        });

        it('should create DELETE \'/:userId\' with root \'/users\'', done => {
            router.set('/:userId', { delete: endpointConfig });
            app.register('/users', router);
            app.on('error', () => undefined);

            request(app.webServer)
                .del('/users/31')
                .expect(204, done);
        });
    });

    describe('should run app and call all functions with right arguments;', () => {
        beforeEach(() => {
            appConfig = {
                name         : 'Test API Server',
                version      : '0.0.1',
                database     : { connect: sinon.stub().returns(Promise.resolve(dao)) },
                authenticator: authenticator
            };
            endpointConfig = {
                defaults: defaultsData,
                action  : sinon.stub().returns(Promise.resolve(actionResult)),
                adapter : sinon.stub().returns(Promise.resolve(adapterResult)),
                response: sinon.stub().returns(viewResult)
            };
            routeConfig = { get: endpointConfig };

            app = createApp(appConfig);
            router = new RouteController();
            router.set('/', routeConfig);
            router.set(':id', { post: endpointConfig });
            router.set(':name/:status', { put: endpointConfig });
            app.register('/', router);
            app.on('error', () => undefined);
        });

        describe('when auth token was not provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should not be called', () => {
                expect((authenticator as any).called).to.be.false;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(defaultsData, undefined)).to.be.true;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });

            it('action should be called with right arguments', () => {
                expect((endpointConfig.action as any).firstCall.calledWithExactly(adapterResult)).to.be.true;
            });

            it('response should be called once', () => {
                expect((endpointConfig.response as any).calledOnce).to.be.true;
            });

            it('response should be called with right arguments', () => {
                expect((endpointConfig.response as any).firstCall.calledWithExactly(actionResult)).to.be.true;
            });
        });

        describe('when auth token was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .set('Authorization', `token ${authToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called with right arguments', () => {
                expect((authenticator as any).firstCall.calledWithExactly({
                    scheme     : 'token',
                    credentials: authToken
                }, undefined)).to.be.true;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(defaultsData, authResult)).to.be.true;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });

            it('action should be called with right arguments', () => {
                expect((endpointConfig.action as any).firstCall.calledWithExactly(adapterResult)).to.be.true;
            });

            it('response should be called once', () => {
                expect((endpointConfig.response as any).calledOnce).to.be.true;
            });

            it('response should be called with right arguments', () => {
                expect((endpointConfig.response as any).firstCall.calledWithExactly(actionResult)).to.be.true;
            });
        });

        describe('when only query was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .query(defaultQuery)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should not be called', () => {
                expect((authenticator as any).called).to.be.false;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                let inputData = Object.assign({}, defaultsData, defaultQuery);

                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(inputData, undefined)).to.be.true;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });

            it('action should be called with right arguments', () => {
                expect((endpointConfig.action as any).firstCall.calledWithExactly(adapterResult)).to.be.true;
            });

            it('response should be called once', () => {
                expect((endpointConfig.response as any).calledOnce).to.be.true;
            });

            it('response should be called with right arguments', () => {
                expect((endpointConfig.response as any).firstCall.calledWithExactly(actionResult)).to.be.true;
            });
        });

        describe('when auth token and query was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .set('Authorization', `token ${authToken}`)
                    .query(defaultQuery)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called with right arguments', () => {
                expect((authenticator as any).firstCall.calledWithExactly({
                    scheme     : 'token',
                    credentials: authToken
                }, undefined)).to.be.true;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                let inputData = Object.assign({}, defaultsData, defaultQuery);

                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(inputData, authResult)).to.be.true;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });

            it('action should be called with right arguments', () => {
                expect((endpointConfig.action as any).firstCall.calledWithExactly(adapterResult)).to.be.true;
            });

            it('response should be called once', () => {
                expect((endpointConfig.response as any).calledOnce).to.be.true;
            });

            it('response should be called with right arguments', () => {
                expect((endpointConfig.response as any).firstCall.calledWithExactly(actionResult)).to.be.true;
            });
        });

        describe('when one param was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .post('/test')
                    .set('Content-Type', 'application/json')
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).called).to.be.false;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                let inputData = Object.assign({}, defaultsData, { id: 'test' });

                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(inputData, undefined)).to.be.true;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });

            it('action should be called with right arguments', () => {
                expect((endpointConfig.action as any).firstCall.calledWithExactly(adapterResult)).to.be.true;
            });

            it('response should be called once', () => {
                expect((endpointConfig.response as any).calledOnce).to.be.true;
            });

            it('response should be called with right arguments', () => {
                expect((endpointConfig.response as any).firstCall.calledWithExactly(actionResult)).to.be.true;
            });
        });

        describe('when auth token, params, query and payloads was provided;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .put('/user/logged')
                    .set('Authorization', `token ${authToken}`)
                    .set('Content-Type', 'application/json')
                    .query(defaultQuery)
                    .send(defaultBody)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called with right arguments', () => {
                expect((authenticator as any).firstCall.calledWithExactly({
                    scheme     : 'token',
                    credentials: authToken
                }, undefined)).to.be.true;
            });

            it('adapter should be called once', () => {
                expect((endpointConfig.adapter as any).calledOnce).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                let inputData = Object.assign({}, defaultsData, defaultQuery, {
                    name  : 'user',
                    status: 'logged'
                }, defaultBody);

                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(inputData, authResult)).to.be.true;
            });

            it('action should be called once', () => {
                expect((endpointConfig.action as any).calledOnce).to.be.true;
            });

            it('action should be called with right arguments', () => {
                expect((endpointConfig.action as any).firstCall.calledWithExactly(adapterResult)).to.be.true;
            });

            it('response should be called once', () => {
                expect((endpointConfig.response as any).calledOnce).to.be.true;
            });

            it('response should be called with right arguments', () => {
                expect((endpointConfig.response as any).firstCall.calledWithExactly(actionResult)).to.be.true;
            });
        });

        describe('when auth options was provided in route config;', () => {
            beforeEach(done => {
                endpointConfig.auth = authOptions;
                routeConfig = { get: endpointConfig };
                app = createApp(appConfig);
                router = new RouteController();
                router.set('/', routeConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                request(app.webServer)
                    .get('/')
                    .set('Authorization', `token ${authToken}`)
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('authenticator should be called once', () => {
                expect((authenticator as any).calledOnce).to.be.true;
            });

            it('authenticator should be called with right arguments', () => {
                expect((authenticator as any).firstCall.calledWithExactly({
                    scheme     : 'token',
                    credentials: authToken
                }, authOptions)).to.be.true;
            });

            it('adapter should be called with right arguments', () => {
                expect((endpointConfig.adapter as any).firstCall.calledWithExactly(defaultsData, authResult)).to.be.true;
            });
        });

        describe('when dao options was not provided in route config;', () => {
            beforeEach(done => {
                request(app.webServer)
                    .get('/')
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('database.connect should be called once', () => {
                expect((appConfig.database.connect as any).calledOnce).to.be.true;
            });

            it('database.connect should be called with right arguments', () => {
                expect((appConfig.database.connect as any).firstCall.calledWithExactly({ startTransaction: false })).to.be.true;
            });
        });

        describe('when dao options was provided in route config;', () => {
            beforeEach(done => {
                endpointConfig.dao = routeDaoOptions;
                routeConfig = { get: endpointConfig };
                app = createApp(appConfig);
                router = new RouteController();
                router.set('/', routeConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                request(app.webServer)
                    .get('/')
                    .expect(200)
                    .end((err, res) => {
                        if (err) {
                            return done(err);
                        }

                        expect(res.body).to.deep.equal(viewResult);
                        done();
                    });
            });

            it('database.connect should be called once', () => {
                expect((appConfig.database.connect as any).calledOnce).to.be.true;
            });

            it('database.connect should be called with right arguments', () => {
                expect((appConfig.database.connect as any).firstCall.calledWithExactly(routeDaoOptions)).to.be.true;
            });
        });
    });

    describe('should emmit and return error', () => {
        beforeEach(() => {
            appConfig = {
                name         : 'Test API Server',
                version      : '0.0.1',
                database     : database,
                authenticator: authenticator
            };
            endpointConfig = {
                defaults: defaultsData,
                action  : sinon.stub().returns(Promise.resolve(actionResult)),
                adapter : sinon.stub().returns(Promise.resolve(adapterResult)),
                response: sinon.stub().returns(viewResult)
            };
            routeConfig = { get: endpointConfig };
        });

        describe('if route does not exist;', () => {
            beforeEach(() => {
                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = request(app.webServer)
                    .get('/user');
            });

            it('should return 404', done => {
                fakeRequest
                    .expect(404, done);
            });

            it('should emmit error with \'does not exist\' message', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.message).to.equal('Endpoint for /user does not exist');
                    done();
                });
            });

            it('should emmit error with 404 status', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.status).to.equal(404);
                    done();
                });
            });
        });

        describe('if method is not supported;', () => {
            beforeEach(() => {
                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = request(app.webServer)
                    .post('/')
                    .set('Content-Type', 'application/json');
            });

            it('should return 405', done => {
                fakeRequest
                    .expect(405, done);
            });

            it('should emmit error with \'is not supported\' message', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.message).to.equal('Method POST is not supported for / endpoint');
                    done();
                });
            });

            it('should emmit error with 404 status', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.status).to.equal(405);
                    done();
                });
            });
        });

        describe('if request content type is not \'json\';', () => {
            beforeEach(() => {
                routeConfig = { put: endpointConfig };
                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = (request(app.webServer) as any)
                    .put('/')
                    .set('Content-Type', 'html');
            });

            it('should return 415', done => {
                fakeRequest
                    .expect(415, done);
            });

            it('should emmit error with \'Only JSON body is supported\' message', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.message).to.equal('Only JSON body is supported for this request');
                    done()
                });
            });

            it('should emmit error with 415 status', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.status).to.equal(415);
                    done();
                });
            });
        });

        describe('if view returns not json object;', () => {
            beforeEach(() => {
                endpointConfig.response = sinon.stub().returns('plain text');
                routeConfig = { get: endpointConfig };
                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = request(app.webServer)
                    .get('/');
            });

            it('should return 415', done => {
                fakeRequest
                    .expect(415, done);
            });
        });

        describe('if view returns undefined;', () => {
            beforeEach(() => {
                endpointConfig.response = sinon.stub().returns(undefined);
                routeConfig = { get: endpointConfig };
                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = request(app.webServer)
                    .get('/');
            });

            it('should return 404', done => {
                fakeRequest
                    .expect(404, done);
            });

            it('should emmit error with \'not found\' message', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.message).to.equal('Resource not found');
                    done()
                });
            });

            it('should emmit error with 404 status', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.status).to.equal(404);
                    done();
                });
            });
        });

        describe('if authenticator was rejected;', () => {
            beforeEach(() => {
                appConfig = {
                    name         : 'Test API Server',
                    version      : '0.0.1',
                    database     : database,
                    authenticator: function (inputs) {
                        try {
                            validate.authorized(false, 'Invalid token');
                        } catch (e) {
                            return Promise.reject(e);
                        }
                    }
                };

                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = request(app.webServer)
                    .get('/')
                    .set('Authorization', `token ${authToken}`);
            });

            it('should return 401', done => {
                fakeRequest
                    .expect(401, done);
            });

            it('should emmit error with \'Invalid token\' message', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.message).to.match(/Invalid token/);
                    done()
                });
            });

            it('should emmit error with 401 status', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.status).to.equal(401);
                    done();
                });
            });
        });

        describe('if authenticator return error;', () => {
            beforeEach(() => {
                appConfig = {
                    name         : 'Test API Server',
                    version      : '0.0.1',
                    database     : database,
                    authenticator: sinon.stub().throws('TypeError')
                };

                router = new RouteController();
                router.set('/', routeConfig);
                app = createApp(appConfig);
                app.register('/', router);
                app.on('error', () => undefined);

                fakeRequest = request(app.webServer)
                    .get('/')
                    .set('Authorization', `token ${authToken}`);
            });

            it('should return 500', done => {
                fakeRequest
                    .expect(500, done);
            });

            it('should emmit error with \'Failed to execute\' message', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.message).to.match(/Failed to execute/);
                    done()
                });
            });

            it('should emmit error with 500 status', done => {
                fakeRequest.end(() => undefined);

                app.on('error', err => {
                    expect(err.status).to.be.undefined;
                    done();
                });
            });
        });
    });
});
