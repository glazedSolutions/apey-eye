# Apey Eye


### Overview

Apey eye is an Object-Resource Mapping Node.js API framework that uses next-generation JS features that can be used today, like [Classes](http://es6-features.org/#ClassDefinition), [Decorators](https://github.com/wycats/javascript-decorators) and [async/await](https://github.com/lukehoban/ecmascript-asyncawait) for maximum expressiveness.
It can work as a [BAAS]( http://en.wikipedia.org/wiki/Mobile_Backend_as_a_service) out-of-the-box, or be easily configured to match most API needs.

Apey Eye builds on the following classes:

* **Router:**
It is the entity responsible for mapping HTTP requests to _Resources_.

* **Resource:**
A class representing a Resource in the REST sense, that handles all the CRUD operations related to it. Gets the request parameters, possibly interacts with _Models_, and returns an object as a response.

* **Model:**
An ORM-like DB table to JS object wrapper. Our example implementation uses [rethinkDB]( http://rethinkdb.com), but it can be replaced by any DB by implementing a new base model. 

* **Input:**
It is the entity used to build a schema to validate data.
The main goal is to use instances of this entity associated to *Models* or *Resources* to validate data in any point of requests handling.

It’s common having an __object-relational mapping__ to interact with relational database content in an object oriented way. Likewise, **Apey Eye** makes an __object-resource mapping__ where the _Resource_ objects has methods that map to _get_, _post_, _put_, _patch_ and _delete_ methods. for a *resource/* or *resource/:id/* url.
Generally speaking, *static* methods correspond to HTTP methods you’d call on the *resource/* and *instance* methods to HTTP methods you’d call on the *resource/:id*

To make it easier to learn and use **Apey Eye**, the _Model_ objects use the very same methods.

Furthermore, this object oriented approach allow entities like _Model_ and _Resource_ to be used imperatively (e.g. model.delete()), making it easier to use them in other contexts, like unit testing. 


## Index

* [Input](https://github.com/glazedSolutions/apey-eye#input)
* [Models](https://github.com/glazedSolutions/apey-eye#models)
* [Relations](https://github.com/glazedSolutions/apey-eye#relations)
* [Resources](https://github.com/glazedSolutions/apey-eye#resources)
* [GenericResource](https://github.com/glazedSolutions/apey-eye#genericresource)
* [Router](https://github.com/glazedSolutions/apey-eye#router)
* [GenericRouter](https://github.com/glazedSolutions/apey-eye#genericrouter)
* [Requests](https://github.com/glazedSolutions/apey-eye#requests)
* [Installation](https://github.com/glazedSolutions/apey-eye#installation)


## Input

Input instances are the objects that will be used to validate data, so are used to define a data schema, where can be found all fields that are allowed, and some properties for them. 

```javascript
let Input = ApeyEye.Input;

let restaurantInput = new Input({
	name:       {type: "string", required: true},
	year:       {type: "number", valid: yearValidator},
    created:    {type: "date", default: "now"},
    type:       {type: "string", choices: ["grill", "vegetarian", "fast-food", "japanese", (...) ]},
    phone:      {type: "string", regex: /\(?([0-9]{3})\)?([ .-]?)([0-9]{3})\2([0-9]{4})/}
});

let yearValidator = function(value){
  if(value <= 2015)
    return true;
  else
    throw new Error("Invalid year.");  
};
```

For the definition of each field of *Input* can be used the following properties:

* **type**: a string with type of data, "string", "number", "date", "boolean", "reference", "collection", "manyToMany".
* **required:** mandatory existence of data for the field
* **regex:** regular expression that value of the field may match
* **valid:** a function that will validate the value of field
* **choices:** a set of possible values for the field
* **default:** a default value for the field

If the value of the field represents a relation then there are other properties that should be used:

* **model**: a string with the identifier of the related _Model_.
* **inverse**: a string with the name of the field responsible for relationship in related _Model_.
* **through**: a string with the name of the intermediate _Model_ used to make possible a _ManyToMany_ relationship.


## Models

The *Models* are the entities responsible by communication between framework and database and thus the implementation of each *Model* must follow the type of database that it will connect.

This is one of the components that is implemented in an independent way, allowing framework to be agnostic from type of database, so it can implement *Models* for any database system.

### Class Based

*Models* were implemented through classes, allowing to be only needed one compact entity to handle a data model in databases.

```javascript
let Model = ApeyEye.Model;

class MyModel extends Model{
	constructor(){
		super(async function () { (...) });
	}
	static async fetch(){ (...) }
	static async fetchOne(){ (...) }
	async put(){ (...) }
	async patch(){ (...) }
	async delete(){ (...) }
}
```

### Static vs Instance

Attending to an object oriented approach, there are a difference between the meaning of static methods and instance methods.

**Static Methods** intend to be the responsible methods for access and manipulation of data in a collection level, providing methods to insert new data or access data that exists in database.

**Instance Methods** intend to be the responsible ones for operations that change the internal state of one single object in database or even for operations that deletes the objects. 

### Decorators

There are several kinds of decorators that can be used in order to annotate or modify a *Model* class.
Decorators allow to assign properties such as schemas to validate data, query parameters, output properties and also other properties related to which kind of entity you need to annotate, such *Resources* or *Formatters*.

Available decorators in ApeyEye can be accessed through:

```javascript
let Annotations = ApeyEye.Annotations;
```

####@Name

This identifier is used to assign an identifier to the entity and it also represents the name used in database to represent the table that the *Model* will interact.

```javascript
let Name = Annotation.Name;

@Name("myModelIdentifier")
class MyModel extends Model{}
```

####@Input

It receives an _Input_ entity, where is presented the data schema that will be used to validate data received in API.

```javascript
let Name = Annotation.Input;

@Input(inputObject)
class MyModel extends Model{}
```

####@Query

It receives an object with properties that will be used to query database like sort, filter and pagination.

* **_sort**: an array with field names that will be included in sorting and its order.
**example:** ["name", "-description"], sort by name ascending and by description in descending order.
* **_filter**: an object with values to filter results.
* **_page_size**: maximum number of results that will be included in response.

```javascript
let Query = Annotations.Query;

@Query({ 
	_sort: ["-name","address"],
	_filter: {type : "grill"}, 
	_page_size: 15
})
class MyModel extends Model{}
```

####@Output

It receives an object with properties that responses must follow, like the set of fields and related objects that would be included.

* **_fields**: an array with field names that will be included in response.
* **_embedded**: an array with field names which must include related object.

```javascript
let Output = Annotations.Output;

@Output({
	_fields: ["name","categories"],
	_embedded: ["categories"],
})
class MyModel extends Model{}
```

## Relations

Relations can be designed through the properties of *Input* entity.
If the value assigned to type of the *Input* fields represents a relation there are some properties that are mandatory depending of type of relation.

* **model:** a string with name of related model. **Mandatory for all kinds of relations**

### Reference

```javascript
var restaurantInput = new Input({
    (...),
    phone:{type: "reference", model:"phone"}
});
 
var phonesInput = new Input({
    phone: {type: "string", required: true}
});
```

**Creating objects with 'manyToMany'**

```javascript
curl -X POST \
  -d '{ "phone":"phoneID", (...) }'\
  https://api.apey-eye.com/restaurant
 
curl -X POST \
  -d '{ "phone" : "{"phone": "+351 222 222 222"}", (...) }'\
  https://api.apey-eye.com/restaurant
```

### Collection

* **inverse:** a string with name of field that ensure relationship in related model. 

```javascript
var restaurantInput = new Input({
    (...),
    addresses:{type: "collection", model:"address", inverse:"restaurant"}
});
 
var addressesInput = new Input({
    (...),
    restaurant: {type:"reference", model:"restaurant"}
});
```

**Creating objects with 'manyToMany'**

```javascript
//RESTAURANT
 
curl -X POST \
  -d '{ "addresses": ["addressID", ... ], (...) }'\
  https://api.apey-eye.com/restaurant
 
curl -X POST \
  -d '{ "addresses": [ { "address": "restaurantAddress" }, ... ], (...) }'\
  https://api.apey-eye.com/restaurant
 
//ADDRESS
 
curl -X POST \
  -d '{ "restaurant":"restaurantID", (...) }'\
  https://api.apey-eye.com/address
 
curl -X POST \
  -d '{ "restaurant":"{"name": "restaurantName"}", (...) }'\
  https://api.apey-eye.com/address
```

### ManyToMany

* **inverse:** a string with name of field that ensure relationship in related model. 
* **through:**  a string with the name of the intermediate *Model* used to make possible a ManyToMany relationship.

```javascript
var restaurantInput = new Input({
    (...)
    categories:{type: "manyToMany", model:"category", inverse:"restaurant", through:"categoryRestaurant"}
});
var categoryInput = new Input({
    name: {type: "string", required: true},
    restaurants: {type: "manyToMany", model: "restaurant", inverse: "categories", through: "categoryRestaurant"}
});
 
var categoryRestaurantInput = new Input({
    category: {type:"reference", model:"category"},
    restaurant: {type:"reference", model:"restaurant"}
});
```

**Creating objects with 'manyToMany'**

```javascript
//RESTAURANT
 
curl -X POST \
  -d '{ "categories": ["categoryID", ... ],  (...) }'\
  https://api.apey-eye.com/restaurant
 
curl -X POST \
  -d '{ "categories": [ { "name": "category1" }, ... ], (...) }'\
  https://api.apey-eye.com/restaurant
 
//CATEGORY
 
curl -X POST \
  -d '{ "restaurants": ["restaurantID", ... ], (...) }'\
  https://api.apey-eye.com/category
 
curl -X POST \
  -d '{ "restaurants": [ { "name": "restaurantName" } ], (...) }'\
  https://api.apey-eye.com/category
```

## Resources

With regard to syntax, the *Resources* are similar to *Models*, promoting greater ease of assimilation of concepts by developer. Offering a similar interface, the progression in learning to use the framework is greater.

### Class-based

Resources are implemented through __classes__, existing direct correspondence between class methods and each type of methods of HTTP requests. So, there are one class method representing each of HTTP request that one resource can handle.

```javascript
let Resource = ApeyEye.Resource;

class MyResource extends Resource{
	constructor(){
		super(async function () {  (...) });
	}
	static async fetch(){ (...) }
	static async fetchOne(){ (...) }
	async put(){ (...) }
	async patch(){ (...) }
	async delete(){ (...) }
}
```

### Static vs Instance 

Such as in *Models* also in *Resources* is applied an object oriented approach, and thus it exists a distinction between static and instance methods according the type of access that they want to do.


#### Static Methods

* Responsible for handle requests that access a kind of factory where it is possible to access or insert data.
* Each one of static methods has a direct correspondence with all HTTP methods that can be applied to urls that match with __/(_resource_name_)/__ pattern.
* Insertion of data can be done using class constructor.
* Although access to only one element of collection must be done through a GET HTTP request to url __/(_resource_name_)/:id/__, this request is also mapped to a static method, because it is also considered an access to the collection, with the difference that parameter ID allow to filter the results and return only the object that match with the value of it.

* **Creating Objects**

```javascript
let obj = new RestaurantResource({data:{name:"restaurantName", address:"restaurantAddress"}});
 
curl -X POST \
  -d '{"name":"restaurantName","address":"restaurantAddress"}'\
  https://api.apey-eye.com/restaurant
```

* **List Objects**

```javascript
let list = RestaurantResource.fetch();
 
curl -X GET \
  https://api.apey-eye.com/restaurant
```

* **Access one object**

```javascript
let obj = RestaurantResource.fetchOne({id:"6507da1f954a"});
 
curl -X GET \
  https://api.apey-eye.com/restaurant/6507da1f954a/
```

#### Instance Methods

* Responsible for operations that act directly in the objects such as object state update or delete objects.

* **Replace object**

```javascript
let obj = RestaurantResource.fetchOne({id:"6507da1f954a"});
obj.put({data: {name:"anotherRestaurantName",address:"anotherRestaurantAddress"});
 
curl -X PUT \
  -d '{"name":"anotherRestaurantName","address":"anotherRestaurantAddress"}'\
  https://api.apey-eye.com/restaurant/6507da1f954a/
```

* **Object state update**

```javascript
let obj = RestaurantResource.fetchOne({id:"6507da1f954a"});
obj.patch({data: {name:"anotherRestaurantName"});
 
curl -X PATCH \
  -d '{"name":"anotherRestaurantName"}'\
  https://api.apey-eye.com/restaurant/6507da1f954a/
```

* **Delete object**

```javascript
let obj = RestaurantResource.fetchOne({id:"6507da1f954a"});
obj.delete();
 
curl -X DELETE \
  https://api.apey-eye.com/restaurant/6507da1f954a/
```

### Actions

Apey Eye also allows developer to implement their own custom actions.

```javascript
let Resource = ApeyEye.Resource,
    Action = ApeyEye.Annotations.Action;
    
class MyResource extends Resource{
	@Action()
	static async get_actionOne(){ (...) }
	@Action()
	async post_actionTwo(){ (...) }
}
```


As showed in previous example, *Resource* actions must follow two requirements:
* It is needed to use **@Action** decorator;
* Method name must match with pattern **\<HTTP_method\>_\<action_name\>**

Only when these two requirements are met the methods are handled as actions, otherwise the framework will assume them as a common auxiliar method to the class.

* **Use static action**

```javascript
let result = RestaurantResource.get_actionOne();

curl -X GET \
  https://api.apey-eye.com/restaurant/actionOne/
```

* **Use instance action**

```javascript
let obj = RestaurantResource.fetchOne({id:"6507da1f954a"});
obj.post_actionTwo();
 
curl -X POST \
  https://api.apey-eye.com/restaurant/6507da1f954a/actionTwo/
```

### Decorators

Decorators as *@Query*, *@Output*, *@Input* and *@Name* can also be used in *Resources* with almost the same meaning.
The unique distinction is case of *@Name* decorator.
Although this decorator has a similar meaning than in *Models*, assigning an identifier to the entity has one other goal.
This identifier is used when the _Resource_ is added to _Router_, if no path is specified then the identifier will be used to build the path where Resource will be available.
In a **NoBackend** approach, the Model that will be associated to the _Resource_ also will have this identifier.

Although in *Resources* can be applied some other decorators:

####@Format

It receives a render class that will be used to render all responses produced by Resource or its methods.

```javascript
let Format = Annotations.Format,
    JSONFormat = ApeyEye.Formatters.JSONFormatter;

@Format(JSONFormat)
class MyResource extends Resource{}
```

**Definition of render class**

It is necessary to create a new render class that inherits **BaseFormatter** and must implement **.format()** method responsible by render received data with target format.

It must be assigned through **@MediaType** decorator the content-type that will be included in response headers.

```javascript
let MediaType = Annotations.MediaType,
    BaseFormatter = ApeyEye.Formatters.BaseFormatter;

@MediaType('application/text')
class TextFormat extends BaseFormatter{
    static format(data){
        return data.toString();
    }
}
```

####@Authentication

It receives a string indicating which mechanism of authentication will be used to authenticate requests to target *Resource*.

**Note:** There are some mechanisms of authentication already defined in framework like *Basic* and *Local*, however it is possible to define more custom mechanisms to use to validate requests.

```javascript
let Authentication = Annotations.Authentication;

@Authentication('basic')
class MyResource extends Resource{}
```

####@Roles

It receives an array with identifiers of roles of users that are allowed to perform requests to *Resource*.

```javascript
let Roles = Annotations.Roles;

@Roles(['client', 'editor'])
class MyResource extends Resource{}
```

In framework there are models that represents both roles and users and allow to make a connection between users and which roles are related to them in the system.

By default, there are an hierarchical schema for roles that allows an user to access resources that are limited to other roles that are directly or indirectly related with user's role and have also an lower hierarchical level.

**Exemple:**

```javascript
let roleA = {
    id: "client",
    parentRole : "admin"
}
```
An user that are related to *"admin"* role also has access to *Resources* that are limited to *"client"* role.

####@Documentation

It receives an object with data used to document the *Resource* which was associated. 
The main fields that have importance in ApeyEye documentation are *title* and *description*. These are the only ones that will be associated to Swagger documentation, although other data that developer puts on this object can access through HTTP OPTIONS documentation.

```javascript
let Documentation = Annotations.Documentation;

@Documentation({
	title : "Resource title", 12
	description : "Resource description"
})
class MyResource extends Resource{}
```

**Note:** Swagger documentation can be found through requests to *http://\<api-base-path\>/api-docs/*

## GenericResource

Besides the possibility of defining a *Resource* class in which the developer needs to build its own implementation, the developer can also use a *GenericResource* class where are adopted the default implementation for each method.

```javascript
@Annotations.Model(MyModel)
class MyResource extends GenericResource {}
```

Simply through mentioned code it is possible to obtain a connection between *Resource* and the *Model* using the default implementation of Resource methods.

### Decorators

With *GenericResource* can be used all decorators already mentioned in this documentation but in addition should be used others that are more appropriate in this context.

#### @Model

It receives a class that must inherit from *Model* and represents the entity through defined *Resource* will access database.
It will exists a direct connection between *GenericResource* methods and *Model* methods.

* new GenericResource → new Model
* GenericResource.fetch → Model.fetch
* GenericResource.fetchOne → Model.fetchOne
* (…)

```javascript
@Annotations.Model(MyModel)
class MyResource extends GenericResource {}
```

#### @Methods

It receives an array with identifiers of the methods that are allowed to use by clients of API.

```javascript
let GenericResource = ApeyEye.GenericResource,
    Methods = ApeyEye.Annotations.Methods;

@Methods(['constructor', 'static.fetch'])
class MyResource extends GenericResource{}
```

## Router

In Apey Eye, the *Router* is the entity responsible to connect received HTTP requests *Resources** that exists in API and will handle them.

The framework was designed with the purpose to be independent of the type of *Router* that are in use allowing to be used different kinds of *Routers* according to developer preferences.
Thus it is possible to implement a *Router* through frameworks like Hapi, Koa, Express or others.

**Note:** There are just implemented and available *Routers* based on Hapi and Koa.

### Use Router

The entity *Router* has an method **.register()** that allows developers to connect *Resources* to API making them available to clients.
To regist a new *Resource* to API you can indicate a path where it will be available, or otherwise it will be available in path registered with *@Name* decorator.


```javascript
let router = ApeyEye.HapiRouter(); //or ApeyEye.KoaRouter();

router.register([{
	resource: RestaurantResource
    },
    {
        path: 'address',
        resource: AddressResource
    }
]);

router.start({ port : 8080 });
```

## GenericRouter

Instead of use a common *Router*, in which is necessary to register all *Resources* that will be available by API, the framework still offer the possibility of use a *GenericRouter*.

```javascript
let genericRouter = ApeyEye.HapiGenericRouter(); // or ApeyEye.KoaGenericRouter();

genericRouter.start({ port : 8080 });
```

This kind of *Router*, besides to allow the registration of *Resources* in a programmatic way also admits the development of applications following a **NoBackend** approach.

So, it is possible that Resources are created dynamically when the clients of API make requests to one endpoint that has no *Resource* allocated.

For the same request, these two approaches have different behaviors, for example:

```javascript
curl -X POST \
  -d '{ "phone": "+351 222 222 222"} }'\
  https://api.apey-eye.com/phone/
```

If you use a *Router* and haven't been registered no *Resources* for the path _"phone"_ the answer would be **Status: 404 Not Found**.

If you use a *GenericRouter* would be **Status: 200 OK**, and a new object would be created.

## Requests

Although most of the following method parameters can be specified programmatically, clients can add them to the requests to taylor the format of the results.

So it is possible to use query params to send properties like *filters*, *sort*, *fields*, *embedded*, *page* and *page_size* and *format*.

```
Normal method call:
http://api.path/

Only return objects with property name==”Filipe”
http://api.path/?_filter={"name":"Filipe"}

Sort results by reverse alphabetical order of the name, followed by a secondary ascending sort by age:
http://api.path/?_sort=["-name","age"]

Return object only with some of it’s fields:
http://api.path/?_fields=["_id", "name", "age", "BI"] 

Expand other resources, embedding their details:
http://api.path/?_embedded=["photos", "posts"]

Return paginated results:
http://api.path/?_page=1&_page_size=15         
                                              
Return result in a specific format:
http://api.path/?_format=json 
```


As it is possible to receive query and output properties in several layers of framework it was established some rules.
* **_filter:** all filters presented in requests, resources and models are applied.
* **_sort:** properties assigned in an higher layer overrides lowers, respecting order by requests are handled, requests, resources, models.
* **_page_size:** the value of page size applied is the minimum of the values indicated in all layers
* **_fields:** the set of fields applied is the set of values that are common to all layers. As default all fields are accepted.
* **_embedded:** the set of fields applied is the set of values that are common to all layers. As default all fields are accepted.

### Installation

```
$ npm install apey-eye
```

### Start Example

```
$ npm run-script start-koa
$ npm run-script start-hapi
```

### Run Tests

```
$ npm test
$ npm run-script test-cov
```

### Configuration

You can change several settings related with database connection, router or server.

```javascript
let RouterConfig = ApeyEye.RouterConfig;

RouterConfig.basePath = "/api"; //Default is undefined

let DabataseConfig = ApeyEye.DatabaseConfig;

DatabaseConfig.host = "localhost";   //Default is "localhost"
DatabaseConfig.port = 28015 ; //Default is 28015
DatabaseConfig.database = "databaseName";  //Default is db1

let ServerConfig = ApeyEye.ServerConfig;

ServerConfig.apiVersion = "1.0";   //Default is "1.0"
ServerConfig.documentationPath = "/documentation" ; //Default is "/api-docs"
ServerConfig.documentationEndpoint = "/docs";  //Default is "/docs
```

Database configurations are prepared to connect to RethinkDB, so it is nedded to setup a new database environment.

An easy solution is to use https://github.com/RyanAmos/rethinkdb-vagrant.


# License

The MIT License (MIT)

Copyright (c) 2015 GlazedSolutions

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

