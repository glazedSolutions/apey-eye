/**
 * Created by Filipe on 02/03/2015.
 */
import KoaRouter from 'apey-eye/routers/KoaRouter';
import KoaGenericRouter from 'apey-eye/routers/KoaGenericRouter';

import RestaurantResource from 'resources/RestaurantResource.js';
import AddressModel from 'models/AddressModel.js';
import CategoryModel from 'models/CategoryModel.js';
import CategoryRestaurantModel from 'models/CategoryRestaurantModel.js';
import PhoneModel from 'models/PhoneModel.js';


var router = new KoaGenericRouter();
router.register([{
    path: 'restaurant',
    resource: RestaurantResource
}]);

router.start({port:3000},function (err, server) {
    if(!err){
        console.log('Server running at:', server);
    }
    else{
        console.log('Error starting server');
    }
});

