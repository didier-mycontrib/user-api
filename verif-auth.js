
//NEW UNIFIED VERSION (Standalone JWT or with OAuth2/oidc keycloak server)
import axios from 'axios';
import passport from 'passport';
import KeycloakBearerStrategy from 'passport-keycloak-bearer';
import express from 'express';
const apiRouter = express.Router();

// GLOBAL COMMON PART
//*************************************************** 

async function tryInitRemoteOAuth2OidcKeycloakMode(){
    try{
        await tryingOidcServerConnection("https://www.d-defrance.fr/keycloak/realms/sandboxrealm/.well-known/openid-configuration");
        initPassportKeycloakBearerStrategy();
        console.log("initPassportKeycloakBearerStrategy ok ")
    }catch(ex){
        console.log("ERROR: initPassportKeycloakBearerStrategy not ok !!!!")
    }
}
tryInitRemoteOAuth2OidcKeycloakMode();

function verifTokenInHeadersForPrivatePath(req , res  , next ) {
    if( !req.path.includes("/private/")){
       next();
    }
    else { //if secureMode==true
       checkAuthViaOauth2Oidc(req,res,next);//phase1 (401 if invalid token)
                                    //future phase 2 : ckeck_scope
    }
}


// OAuth2 / OIDC / KEYCLOACK PART
//*************************************************** 


async function tryingOidcServerConnection(wellKnownOpenidConfigUrl){
    try{
      const response  = await axios.get(wellKnownOpenidConfigUrl);                           
      console.log("wellKnownOpenidConfigUrl="+wellKnownOpenidConfigUrl+ " response.status : ", + response.status);
     }catch(ex){
         //console.log("exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

function extractOidcUserInfosFromJwtPayload(jwtPayload){
    return {
      username : jwtPayload.preferred_username,
      name : jwtPayload.name,
      email : jwtPayload.email,
      scope : jwtPayload.scope
    }
  }


function initPassportKeycloakBearerStrategy(){

// new KeycloakBearerStrategy(options, verify)
passport.use(new KeycloakBearerStrategy({
    "realm": "sandboxrealm",
    "url": "https://www.d-defrance.fr/keycloak"
  }, (jwtPayload, done) => {
    //console.log("jwtPayload="+ JSON.stringify(jwtPayload));
    const user = extractOidcUserInfosFromJwtPayload(jwtPayload);
    console.log("user="+ JSON.stringify(user));
    return done(null, user);
  }));

}


function checkAuthViaOauth2Oidc(req, res, next) {
    console.log(`checkAuthViaOauth2Oidc ...`)
    let authenticateFunction = passport.authenticate('keycloak'  , {session: false} );
    authenticateFunction(req,res,next);//send 401 if Unauthorized
    //or store user infos in req.user if auth is ok
  }

  function checkScopeForPrivatePath(req, res, next){
    if(  !req.path.includes("/private/") )
       next();
    else {
        //console.log("req.method="+req.method)//"GET" or "POST" or ...
        if(req.method=="DELETE" && !req.user.scope.includes('resource.delete'))
            res.status(403).send({error:"Forbidden (valid jwt but no required resource.delete scope)"});
        else if((req.method=="POST" || req.method=="PUT" || req.method=="PATCH" ) && !req.user.scope.includes('resource.write'))
            res.status(403).send({error:"Forbidden (valid jwt but no required resource.write scope)"});
        else if((req.method=="GET") && !req.user.scope.includes('resource.read'))
            res.status(403).send({error:"Forbidden (valid jwt but no required resource.read scope)"});
        else next();//else if ok , continue
    }
  }



// GLOBAL COMMON DEFAULT EXPORT
//*************************************************** 
export  default { apiRouter , verifTokenInHeadersForPrivatePath , checkScopeForPrivatePath};



