/**
 * Created by GlazedSolutions on 12/05/2015.
 */

import ApeyEye from '../../apey-eye';

let Decorators = ApeyEye.Decorators;
let GenericResource = ApeyEye.GenericResource;
let Input = ApeyEye.Input;

import ProductModel from '../models/ProductModel.js';

@Decorators.Model(ProductModel)
@Decorators.Name("product")
@Decorators.Authentication("basic")
@Decorators.Roles(["restaurant_owner"])
class ProductResource extends GenericResource {
    @Decorators.Roles(["basic_client"])
    static async fetch(options){
        return await GenericResource.fetch(options);
    }
    @Decorators.Roles(["basic_client"])
    static async fetchOne(options){
        return await GenericResource.fetch(options);
    }
}

export default ProductResource;