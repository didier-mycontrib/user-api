import express from 'express';
import { statusCodeFromEx , nullOrEmptyObject } from "./generic-express-util.js";

const apiRouter = express.Router();

import remoteOidc from './remote-oidc.js';


//NB: en v1 , URL public et private , future V2 : URL private only


/*
convention d'URL :
http://localhost:8232/user-api/private/xyz en accès private (avec auth nécessaire)
http://localhost:8232/user-api/public/xyz en accès public (sans auth nécessaire)
NB: si appel en URL public --> realmName="sandboxrealm"
    si appel en URL private (avec token verifié) --> realmName = valeur de ?realm=myrealm
*/


//*******************************************


//exemple URL: http://localhost:8232/user-api/public/user/user1?realm=myrealm
//exemple URL: http://localhost:8232/user-api/public/user/user1
apiRouter.route(['/user-api/private/user/:username' ,
                 '/user-api/public/user/:username'])
.get( async function(req , res  , next ) {
	var username = req.params.username;
	var realmName = req.query.realm || "sandboxrealm";
	if(req.path.includes("public")) realmName = "sandboxrealm";
	try{
		let remoteOidcUsers = new remoteOidc.RemoteOidcUsers(realmName);
		let user = await remoteOidcUsers.getUserByUsername(username);
		res.send(user);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    } 
});

//exemple URL: http://localhost:8232/user-api/public/account (returning all accounts)
apiRouter.route(['/user-api/private/user' , 
                 '/user-api/public/user'])
.get( async function(req , res  , next ) {
	//let criteria={};
	var realmName = req.query.realm || "sandboxrealm";
	//console.log("req.path="+req.path)
	if(req.path.includes("public")) realmName = "sandboxrealm";
	try{
		let remoteOidcUsers = new remoteOidc.RemoteOidcUsers(realmName);
		let users = await remoteOidcUsers.getUsers();
		//console.log("users : " + JSON.stringify(users));
		res.send(users);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    } 
});

//exemple URL: http://localhost:8232/user-api/public/group (returning all user groups)
apiRouter.route(['/user-api/private/group','/user-api/public/group'])
.get( async function(req , res  , next ) {
	var realmName = req.query.realm || "sandboxrealm";
	if(req.path.includes("public")) realmName = "sandboxrealm";
	//let criteria={};
	try{
		let remoteOidcUsers = new remoteOidc.RemoteOidcUsers(realmName);
		let groups = await remoteOidcUsers.getGroups();
		//console.log("groups : " + JSON.stringify(groups));
		res.send(groups);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    } 
});


// http://localhost:8232/user-api/private/account en mode post
// avec {"firstName":"joe","lastName":"Dalton","email":"joe.dalton@jail.com","username":"user4","groups":["user_of_myrealm"],"newPassword":"pwd4"} dans req.body
apiRouter.route([ '/user-api/private/account'  , '/user-api/public/user'])
.post(async function(req , res  , next ) {
	var nouveauMyOidcUser = req.body;
	var realmName = req.query.realm || "sandboxrealm";
	if(req.path.includes("public")) realmName = "sandboxrealm";
	console.log("POST,nouveauMyOidcUser="+JSON.stringify(nouveauMyOidcUser));
	try{
		let remoteOidcUsers = new remoteOidc.RemoteOidcUsers(realmName);
		await remoteOidcUsers.addUser(nouveauMyOidcUser);
		const savedMyOidcUser = await remoteOidcUsers.getUserByUsername(nouveauMyOidcUser.username);
		res.send(savedMyOidcUser);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    }
});



// http://localhost:8232/user-api/private/user en mode PUT
// avec {"firstName":"joe","lastName":"Dalton","email":"joe.dalton@jail.com","username":"user4","groups":["user_of_myrealm"],"newPassword":"pwd4"} dans req.body
apiRouter.route(['/user-api/private/user', '/user-api/public/user'])
.put( async function(req , res  , next ) {
	var newValueOfAccountToUpdate = req.body;
	var realmName = req.query.realm || "sandboxrealm";
	if(req.path.includes("public")) realmName = "sandboxrealm";
	console.log("PUT,newValueOfAccountToUpdate="+JSON.stringify(newValueOfAccountToUpdate));
	try{
		let remoteOidcUsers = new remoteOidc.RemoteOidcUsers(realmName);
		await remoteOidcUsers.updateUser(newValueOfAccountToUpdate);
		const updatedMyOidcUser = await remoteOidcUsers.getUserByUsername(newValueOfAccountToUpdate.username);
		res.send(updatedMyOidcUser);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    }
});


// http://localhost:8232/user-api/private/user/user1 en mode DELETE
apiRouter.route(['/user-api/private/user/:username',
                 '/user-api/public/user/:username'])
.delete( async function(req , res  , next ) {
	var username = req.params.username;
	var realmName = req.query.realm || "sandboxrealm";
	if(req.path.includes("public")) realmName = "sandboxrealm";
	console.log("DELETE,username="+username);
	try{
		let remoteOidcUsers = new remoteOidc.RemoteOidcUsers(realmName);
		let deleteActionMessage = await remoteOidcUsers.deleteUserByUsername(username);
		res.send(deleteActionMessage);
    } catch(ex){
	    res.status(statusCodeFromEx(ex)).send(ex);
    }
});


export  default { apiRouter };