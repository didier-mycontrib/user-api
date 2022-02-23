import express from 'express';
const apiRouter = express.Router();

import userDao from './user-dao-mongoose.js';
var PersistentSessionModel = userDao.ThisPersistentModel; //to use only for specific extra request (not in dao)


function statusCodeFromEx(ex){
	let status = 500;
	if(ex== null || ex.error == null ) return status;
	switch(ex.error){
		case "BAD_REQUEST" : status = 400; break;
		case "NOT_FOUND" : status = 404; break;
		//...
		case "CONFLICT" : status = 409; break;
		default: status = 500;
	}
	return status;
}

/*
Nouvelle convention d'URL :
http://localhost:8xxx/xyz-api/private/xyz en accès private (avec auth nécessaire)
http://localhost:8xxx/xyz-api/public/xyz en accès public (sans auth nécessaire)
*/

//exemple URL: .../user-api/private/reinit
apiRouter.route('/user-api/private/reinit')
.get( async function(req , res  , next ) {
	try{
		let doneActionMessage = await userDao.reinit_db();
		res.send(doneActionMessage);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    } 
});

//exemple URL: .../user-api/private/user/usernameXy
apiRouter.route('/user-api/private/user/:username')
.get( async function(req , res  , next ) {
	var username = req.params.username;
	try{
		let account = await userDao.findById( username);
		res.send(account);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    } 
});

//exemple URL: .../user-api/private/user (returning all users)
// .../user-api/private/user?roles=admin (returning users with roles=admin)
apiRouter.route('/user-api/private/user')
.get( async function(req , res  , next ) {
	let roles = req.query.roles;
	var criteria=roles?{roles : roles}:{};
	try{
		let customers = await userDao.findByCriteria(criteria);
		res.send(customers);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    } 
});


// .../user-api/public/user en mode post
// avec {  "username" : "jeanAimare" , "password" : "pwd3"  , "roles" : "admin"} dans req.body
apiRouter.route('/user-api/public/user')
.post(async function(req , res  , next ) {
	var nouveauUser = req.body;
	console.log("POST,nouveauUser="+JSON.stringify(nouveauUser));
	try{
		let savedUser = await userDao.save(nouveauUser);
		res.send(savedUser);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    }
});

//return Promise<token_or_null>
async function tryRetreiveKongOAuth2PluginToken(username){
	let token = null;
	try{
		//tentative de recupération de access_token depuis kong api-gateway et plugin oauth2
		let url = "https://xyz.mycompany.fun:8443/customer-api/private/oauth2/token";
		let mode = 'post';
		let inputData = {client_id : "CLIENT_ID_RESA",
			client_secret : "CLIENT_SECRET_RESA",
	        scope : "read write delete",
			grant_type : "password",
            authenticated_userid : username,
			provision_key : "my_not_generated_provision_key" }            
		token = await myGenericFetcher.myGenericJsonFetch(url,mode,inputData);
	}catch(e){
		console.log("cannot retreive KongOAuth2PluginToken");
	}
	return token;
}

function hasRoles(user,askedRoles){
	if(user == null) return false;
	if(askedRoles == null || askedRoles=="") return true;
    if(user.roles != null && user.roles.indexOf(askedRoles)>=0) return true;
	  else return false;
}

// .../user-api/public/login en mode post
// avec {  "username" : "jeanAimare" , "password" : "pwd3" } dans req.body
apiRouter.route('/user-api/public/login')
.post(async function(req , res  , next ) {
	let login = req.body;
	let username = login?login.username : null;
	let askedRoles = login?login.roles : null;
	console.log("POST login,login à verifier="+JSON.stringify(login));
	try{
		let user = await userDao.findById( username);
		if(user.password == login.password ){
			if(!hasRoles(user,askedRoles)){
                res.status(401).send({username : username ,
					status : false , token : null,
				    message : "not asked roles="+askedRoles ,
				    roles: ""});
			}else{
			let token = null;
			token = await tryRetreiveKongOAuth2PluginToken(username);
		
			res.send({username : username ,
       		          status : true ,
					  token : token,
			          message : "successful login" , roles: user.roles});	
			}
		}
        else res.status(401).send({username : username ,
       		           status : false , token : null,
			           message : "wrong password" ,roles: "" });					   
    } catch(ex){
	    res.status(401).send({username : username ,
       		                  status : false , token : null,
			                  message : "invalid username" , roles: ""});
    }
});


// .../user-api/private/user en mode PUT
// avec { "username" : "jeanAimare" , "password" : "pwdA"  , "roles" : "admin"} dans req.body
apiRouter.route('/user-api/private/user')
.put( async function(req , res  , next ) {
	var newValueOfUserToUpdate = req.body;
	console.log("PUT,newValueOfUserToUpdate="+JSON.stringify(newValueOfUserToUpdate));
	try{
		let updatedUser = await userDao.updateOne(newValueOfUserToUpdate);
		res.send(updatedUser);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    }
});

//exemple URL: .../user-api/account/jeanAimare en mode DELETE
apiRouter.route('/user-api/private/user/:username')
.delete( async function(req , res  , next ) {
	var username = req.params.username;
	console.log("DELETE,username="+username);
	try{
		let deleteActionMessage = await userDao.deleteOne(username);
		res.send(deleteActionMessage);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    }
});

export  default { apiRouter };