import mongoose from 'mongoose';
import userDbMongoose from './user-db-mongoose.js';
import genericPromiseMongoose from './generic-promise-mongoose.js';
var thisDb = userDbMongoose.thisDb;

//NB: This is for current entity type ("Devise" or "Customer" or "Product" or ...)
//NB: thisSchema and ThisPersistentModel should not be exported (private only in this current module)
var thisSchema;//mongoose Schema (structure of mongo document)
var ThisPersistentModel; //mongoose Model (constructor of persistent ThisPersistentModel)

function initMongooseWithSchemaAndModel () {

      //username (as id/pk) of type String should be unique (ex: value of customer email or ...)

    mongoose.Connection = thisDb;
      thisSchema = new mongoose.Schema({
        /* default mongo _id: { type : String , alias : "id" } ,*/
        _id: { type : String , alias : "username" } ,
        password: String,
        roles : String,
      });
      thisSchema.set('id',false); //no default virtual id alias as string for _id
      thisSchema.set('toJSON', { virtuals: true , 
                                   versionKey:false,
                                   transform: function (doc, ret) {   delete ret._id; delete ret._v;  }
                                 });                           
      //console.log("mongoose thisSchema : " + JSON.stringify(thisSchema) );
      //"User" model name is "users" collection name in mongoDB  database
      ThisPersistentModel = mongoose.model('User', thisSchema);
}

initMongooseWithSchemaAndModel();

function reinit_db(){
  return new Promise( (resolve,reject)=>{
      const deleteAllFilter = { }
      ThisPersistentModel.deleteMany( deleteAllFilter, function (err) {
        if(err) { 
          console.log(JSON.stringify(err));
          reject(err);
        }
        (new ThisPersistentModel({ username : "didier" , password : "pwd"  , roles : "admin"})).save();
        (new ThisPersistentModel({ username : "alexTherieur" , password : "pwd1"  , roles : "user" })).save();
        (new ThisPersistentModel({ username : "jeanBon" , password : "pwd2"  , roles : "user" })).save();
        resolve({action:"users collection in database re-initialized"})
      })
 
  });
}

function findById(id) {
  return genericPromiseMongoose.findByIdWithModel(id,ThisPersistentModel);
}

//exemple of criteria : {} or { unitPrice: { $gte: 25 } } or ...
function findByCriteria(criteria) {
  return genericPromiseMongoose.findByCriteriaWithModel(criteria,ThisPersistentModel);
}

function save(entity) {
  return genericPromiseMongoose.saveWithModel(entity,ThisPersistentModel);
}

function updateOne(newValueOfEntityToUpdate) {
  return genericPromiseMongoose.updateOneWithModel(newValueOfEntityToUpdate,newValueOfEntityToUpdate.id,ThisPersistentModel);
}

function deleteOne(idOfEntityToDelete) {
  return genericPromiseMongoose.deleteOneWithModel(idOfEntityToDelete,ThisPersistentModel);
}


export default { ThisPersistentModel ,  reinit_db ,
   findById , findByCriteria , save , updateOne ,  deleteOne};
