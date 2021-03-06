/**
 * Created by GlazedSolutions on 11/03/2015.
 */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import chaiThings from 'chai-things';
import Hapi from 'hapi';
import request from 'request-promise';
import shortid from 'shortid';
import 'mochawait';
import ModelRegister from '../apey-eye/ModelRegister.js';

import ApeyEye from '../apey-eye';


let HapiRouter = ApeyEye.HapiRouter;
let HapiGenericRouter = ApeyEye.HapiGenericRouter;
let KoaRouter = ApeyEye.KoaRouter;
let BaseRouter = ApeyEye.BaseRouter;
let Decorators = ApeyEye.Decorators;
let GenericResource = ApeyEye.GenericResource;
let RethinkDBModel = ApeyEye.RethinkDBModel;
let Input = ApeyEye.Input;
let UserModel = ApeyEye.UserModel;
let RoleModel = ApeyEye.RoleModel;

shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_');

chai.use(chaiAsPromised);
chai.should();
chai.use(chaiThings);

let expect = chai.expect,
    assert = chai.assert,
    should = chai.should;


let server,
    userData;

describe("hapi", () => {
    before((done)=> {
        ModelRegister.empty();

        let restaurantInput = new Input({
            name: {type: "string", required: true},
            dateCreated: {type: "date", default: "now"},
            phone: {type: "number"}
        });

        @Decorators.Input(restaurantInput)
        @Decorators.Name("restaurant")
        @Decorators.Query({
            _sort: ['name', '-address'],
            _page_size: 10
        })
        class RestaurantModel extends RethinkDBModel {
        }

        @Decorators.Model(RestaurantModel)
        @Decorators.Methods(['static.fetch', 'constructor', 'static.fetchOne', 'delete'])
        class RestaurantResource extends GenericResource {
            @Decorators.Action()
            static async get_first() {
                let data = {name: "First Restaurant"};
                return data;
            }

            @Decorators.Action()
            async get_name() {
                let obj = this.obj;
                this.obj = {name: obj.name};
                return this.obj;
            }

            @Decorators.Authentication('basic')
            async delete(options) {
                return await super.delete(options);
            }
            @Decorators.Authentication('local')
            static async delete(options) {
                return true;
            }
        }

        let router = new HapiGenericRouter();
        router.register([{
            path: 'restaurant',
            resource: RestaurantResource
        }
        ]);

        server = new Hapi.Server({
            connections: {
                router: {
                    stripTrailingSlash: true
                }
            }
        });
        server.connection({port: 3001});

        let scheme = function (server, options) {
            return {
                authenticate: function (request, reply) {
                    return router.checkAuthentication(request, reply);
                }
            };
        };

        server.auth.scheme('custom', scheme);
        server.auth.strategy('default', 'custom');

        server.register([
            require('hapi-async-handler')
        ], function (err) {
            if (err) {
                throw err;
            }
            server.route(router.routes());
            server.start(function () {
                //console.log('Server running at:', server.info.uri);
                done();
            });
        });
    });
    after((done)=> {
        server.stop({timeout: 60 * 1000}, function () {
            //console.log('Server stopped');
            done();
        });
    });
    describe('server', ()=> {
        describe('Basic', ()=> {
            before(async () => {
                ModelRegister.register("role", RoleModel);
                ModelRegister.register("user", UserModel);
                try {
                    let role = await RoleModel.fetchOne({id: "admin"});
                }
                catch (e) {
                    let role = await new RoleModel({data: {id: "admin"}});
                }
                userData = {
                    username: "userTest" + shortid.generate(),
                    password: "userPassword",
                    role: "admin"
                };
                await new UserModel({data: userData});
            });
            it("Fetch", async ()=> {
                let list = await request({url: server.info.uri + '/restaurant/', json: true});
                expect(list).to.not.be.undefined;
                expect(list).to.be.instanceof(Array);
            });
            it("POST and Fetch", async ()=> {
                let restaurantData = {name: "restaurantName"};

                let obj = await request.post({
                    url: server.info.uri + '/restaurant/',
                    json: true,
                    body: restaurantData
                });
                expect(obj).to.not.be.undefined;
                expect(obj.id).to.not.be.undefined;
                expect(obj.name).to.equal(restaurantData.name);
                let obj2 = await request.get({
                    url: server.info.uri + '/restaurant/' + obj.id,
                    json: true
                });
                expect(obj).to.deep.equal(obj2);

                expect(request.patch({
                    url: server.info.uri + '/restaurant/' + obj.id,
                    json: true
                })).to.be.rejected;
            });
            it("Test instance action", async ()=> {
                let restaurantData = {name: "restaurantName", phone: 123123};

                let obj = await request.post({
                    url: server.info.uri + '/restaurant/',
                    json: true,
                    body: restaurantData
                });

                let resultAction = await request.get({
                    url: server.info.uri + '/restaurant/' + obj.id + '/name/',
                    json: true,
                    body: restaurantData
                });
                expect(resultAction).to.deep.equal({name: restaurantData.name});
            });
            it("Test autentication basic fails", async ()=> {
                let restaurantData = {name: "restaurantName", phone: 123123};

                let obj = await request.post({
                    url: server.info.uri + '/restaurant/',
                    json: true,
                    body: restaurantData
                }); 

                expect(request.del({
                    url: server.info.uri + '/restaurant/' + obj.id
                })).to.be.rejected;

            });
            it("Test autentication basic succeeds ", async ()=> {

                let restaurantData = {name: "restaurantName", phone: 123123};

                let obj = await request.post({
                    url: server.info.uri + '/restaurant/',
                    json: true,
                    body: restaurantData
                });

                expect(request.del(server.info.uri + '/restaurant/' + obj.id)).to.be.rejected;
                expect(request.del(server.info.uri + '/restaurant/' + obj.id).auth(userData.username, "invalidPassword"+shortid.generate(), true)).to.be.rejected;
                expect(request.del(server.info.uri + '/restaurant/' + obj.id).auth("invalidUsername"+shortid.generate(), userData.password, true)).to.be.rejected;
                expect(request.del(server.info.uri + '/restaurant/' + obj.id).auth(userData.username, userData.password, true)).to.be.fulfilled;

            });

            it("Test autentication local fails", async ()=> {
                let restaurantData = {name: "restaurantName", phone: 123123};

                let obj = await request.post({
                    url: server.info.uri + '/restaurant/',
                    json: true,
                    body: restaurantData
                });

                expect(request.del({
                    url: server.info.uri + '/restaurant/'
                })).to.be.rejected;

            });
            it("Test autentication local succeeds ", async ()=> {

                let restaurantData = {name: "restaurantName", phone: 123123};

                let obj = await request.post({
                    url: server.info.uri + '/restaurant/',
                    json: true,
                    body: restaurantData
                });

                expect(request.del({
                    uri:server.info.uri + '/restaurant/',
                })).to.be.rejected;

                expect(request.del({
                    uri:server.info.uri + '/restaurant/',
                    qs: {
                        username:shortid.generate(),
                        password:userData.password
                    }
                })).to.be.rejected;

                expect(request.del({
                    uri:server.info.uri + '/restaurant/',
                    qs: {
                        username:userData.username,
                        password:shortid.generate()
                    }
                })).to.be.rejected;

                expect(request.del({
                    uri:server.info.uri + '/restaurant/',
                    qs: {
                        username:userData.username,
                        password:userData.password
                    }
                })).to.be.fulfilled;
            });

        });


        describe('No Backend', () => {

            it("Fetch", async ()=> {
                let resourceName = shortid.generate();
                expect(request({url: server.info.uri + `/${resourceName}/`, json: true})).to.be.rejected;
            });
            it("POST and Fetch", async ()=> {
                let resourceName = shortid.generate();
                expect(request({url: server.info.uri + `/${resourceName}/`, json: true})).to.be.rejected;

                let restaurantData = {name: "restaurantName"};

                let obj = await request.post({
                    url: server.info.uri + `/${resourceName}/`,
                    json: true,
                    body: restaurantData
                });

                expect(obj).to.not.be.undefined;
                expect(obj.id).to.not.be.undefined;
                expect(obj.name).to.equal(restaurantData.name);


                let obj2 = await request.get({
                    url: server.info.uri + `/${resourceName}/` + obj.id,
                    json: true
                });

                expect(obj).to.deep.equal(obj2);

                expect(request({url: server.info.uri + `/${resourceName}/`, json: true})).to.be.fulfilled;


            });
        });
    });
});

