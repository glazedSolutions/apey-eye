/**
 * Created by GlazedSolutions on 12/05/2015.
 */

import ApeyEye from '../../apey-eye';

let Decorators = ApeyEye.Decorators;
let GenericResource = ApeyEye.GenericResource;
let Input = ApeyEye.Input;

import CategoryModel from '../models/CategoryModel.js';

@Decorators.Model(CategoryModel)
@Decorators.Name("category")
@Decorators.Authentication("basic")
@Decorators.Roles(["restaurant_owner"])
class CategoryResource extends GenericResource {
}

export default CategoryResource;