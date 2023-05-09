import axios from 'axios';


class MyOidcUser{
    constructor(userDefinition = {}){
        this.id=userDefinition.id||null;
        this.firstName=userDefinition.firstName||"unknownFirstName";
        this.lastName=userDefinition.lastName||"unknownLastName";
        this.email=userDefinition.email||null;
        this.username=userDefinition.username||null;
        this.mainGroup=userDefinition.mainGroup||null; //main groupName (ex:  "user_of_myrealm")
        if(this.username==null){
            this.username=this.firstName+"_"+this.lastName;
        }
        this.newPassword=userDefinition.newPassword||null; //newPassword !=null just for first Set and change
    }
}

class RemoteOidcUsers{

    constructor(realmName){
        this.keycloakUrl="https://www.d-defrance.fr:443/keycloak"; 
        //this.keycloakUrl="http://www.d-defrance.fr:80/keycloak";//ou ".../auth" ou ...
        //this.realm="sandboxrealm"; //ou "master" ou "myrealm" ou ...
        this.realm=realmName || "sandboxrealm";
        this.adminUsername="admin";//admin of specific realm or admin of master
        this.adminPassword="admin";

        this.keycloakRealmUrl=`${this.keycloakUrl}/realms/${this.realm}`
        this.keycloakMasterRealmUrl=`${this.keycloakUrl}/realms/master`
        this.adminKeycloakRealmUrl=`${this.keycloakUrl}/admin/realms/${this.realm}`
        this.adminAccessToken=null;
    }

async addUser(myOidcUser){
  try{
    if(this.adminAccessToken==null)
        this.adminAccessToken = await this.getAdminToken();
    //console.log("this.adminAccessToken="+this.adminAccessToken);

    let wsUrl = this.adminKeycloakRealmUrl + "/users" ;
    const user={
        username : myOidcUser.username,
        firstName : myOidcUser.firstName,
        lastName: myOidcUser.lastName,
        email : myOidcUser.email,
        enabled : true 
    };

    if(myOidcUser.newPassword != null && myOidcUser.newPassword != "")
      user.credentials=[ { type: "password", value: myOidcUser.newPassword , temporary : false  }  ]
    if(myOidcUser.mainGroup != null){
      user.groups=[ myOidcUser.mainGroup ];
    }

    //if x-www-form-urlencoded , axios convert json to form-params
    const response  = await axios.post(wsUrl,user ,
                                        {headers: {'content-type': 'application/json' ,
                                                   'Authorization': `Bearer ${this.adminAccessToken}`}});
                                                   
    //const response  = await axios.get(wsUrl,  {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});
                                                  
    console.log("response.status : ", + response.status);
    console.log("response.data (addUser): " + JSON.stringify(response.data));
        
   }catch(ex){
       console.log("exception ex as JSON string:" + JSON.stringify(ex));
       //throw ex;
  }
}

async updateUser(myOidcUser){
    try{
      if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
      //console.log("this.adminAccessToken="+this.adminAccessToken);
  
      let wsUrl = this.adminKeycloakRealmUrl + "/users/" + myOidcUser.id;
      const user={
          username : myOidcUser.username,
          firstName : myOidcUser.firstName,
          lastName: myOidcUser.lastName,
          email : myOidcUser.email,
          enabled : true 
      };
  
      if(myOidcUser.newPassword != null && myOidcUser.newPassword != "")
        user.credentials=[ { type: "password", value: myOidcUser.newPassword , temporary : false  }  ]
      
  
      //if x-www-form-urlencoded , axios convert json to form-params
      const response  = await axios.put(wsUrl,user ,
                                          {headers: {'content-type': 'application/json' ,
                                                     'Authorization': `Bearer ${this.adminAccessToken}`}});                                              
      console.log("response.status  (updateUser): ", + response.status);
      console.log("response.data (updateUser): " + JSON.stringify(response.data));
      if(myOidcUser.mainGroup != null){
        //console.log("myOidcUser.mainGroup="+myOidcUser.mainGroup);
        //1. get all groups list
        let wsUrlAllGroup = this.adminKeycloakRealmUrl + "/groups";
        const responseAllGroups  = await axios.get(wsUrlAllGroup, 
             {headers: {'Authorization': `Bearer ${this.adminAccessToken}`}});
        let allGroups = responseAllGroups.data;
        console.log("allGroups="+JSON.stringify(allGroups));
        //2. delete/detach old group to user
        let oldGroupsNames = await this.getGroupsNamesForUserId(myOidcUser.id);
        for(let oldGroup of allGroups){
          if( oldGroupsNames.includes(oldGroup.name) ){
            let wsUrlDetachGroup = this.adminKeycloakRealmUrl + "/users/" + myOidcUser.id + "/groups/" + oldGroup.id;
            const responseDetachGroup  = await axios.delete(wsUrlDetachGroup,
              {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});
            //console.log("responseDetachGroup.status  (updateUser): ", + responseDetachGroup.status);
            //console.log("responseDetachGroup.data (updateUser): " + JSON.stringify(responseDetachGroup.data));
          }
        }
        //3. join/attach new group to user
        for(let group of allGroups){
          if(group.name == myOidcUser.mainGroup){
              let wsUrlJoinGroup = this.adminKeycloakRealmUrl + "/users/" + myOidcUser.id + "/groups/" + group.id;
              const responseJoinGroup  = await axios.put(wsUrlJoinGroup,null,
                          {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});                                              
              //console.log("responseJoinGroup.status  (updateUser): ", + responseJoinGroup.status);
              //console.log("responseJoinGroup.data (updateUser): " + JSON.stringify(responseJoinGroup.data));
            }   
        }
        } 
     }catch(ex){
         console.log("(updateUser) exception ex as JSON string:" + JSON.stringify(ex));
         //throw ex;
    }
  }

async keycloakUserToMyOidcUser(kcUser){
    let groupsNames = await this.getGroupsNamesForUserId(kcUser.id);
    let mainGroupName = (groupsNames!=null && groupsNames.length >0) ? groupsNames[0] : null;
    //console.log("groupsNames="+groupsNames);
    return new MyOidcUser({ id: kcUser.id , username : kcUser.username ,
        firstName : kcUser.firstName , lastName : kcUser.lastName ,
        email : kcUser.email , mainGroup : mainGroupName })
}

async keycloakUsersToMyOidcUsers(kcUsers){
    let myOidcUsers = [];
    for(let kcUser of kcUsers)
       myOidcUsers.push(await this.keycloakUserToMyOidcUser(kcUser));
    return myOidcUsers;
}

async getUsers(){
    try{
      if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
      //console.log("this.adminAccessToken="+this.adminAccessToken);
  
      let wsUrl = this.adminKeycloakRealmUrl + "/users";
      
      const response  = await axios.get(wsUrl,  {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});
                                                    
      //console.log("response.status : ", + response.status);
      //console.log("response.data : " + JSON.stringify(response.data));
      return await this.keycloakUsersToMyOidcUsers(response.data);   
     }catch(ex){
         console.log("exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

  async getUserByUsername(username){
    try{
      if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
      //console.log("this.adminAccessToken="+this.adminAccessToken);
  
      let wsUrl = this.adminKeycloakRealmUrl + `/users?username=${username}`;
      
      const response  = await axios.get(wsUrl,  {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});
                                                    
      //console.log("(getUserByUsername) response.status : ", + response.status);
      //console.log("(getUserByUsername) response.data : " + JSON.stringify(response.data));
      return await this.keycloakUserToMyOidcUser(response.data[0]);   
     }catch(ex){
         console.log("getUserByUsername : exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

  async getUserById(id){
    try{
      if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
      //console.log("this.adminAccessToken="+this.adminAccessToken);
  
      let wsUrl = this.adminKeycloakRealmUrl + `/users/${id}`;
      
      const response  = await axios.get(wsUrl,  {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});         
                                  
      //console.log("(getUserById) response.status : ", + response.status);
      //console.log("(getUserById) response.data : " + JSON.stringify(response.data));
      return await this.keycloakUserToMyOidcUser(response.data);   
      //Amelioration possible: recupérer groups associés à un utilisateur 
     }catch(ex){
         console.log("getUserById : exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

  async getGroupsNamesForUserId(userId){
    try{
      if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
  
      let wsUrl = this.adminKeycloakRealmUrl + `/users/${userId}/groups`;
      const response  = await axios.get(wsUrl,  {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});                                   
      
      //console.log("(getGroupsNamesForUserId) response.status : ", + response.status);
      //console.log("(getGroupsNamesForUserId) response.data : " + JSON.stringify(response.data));
      let groupsNames = [];
      for(let group of response.data)
         groupsNames.push(group.name);
      return groupsNames;  
      //Amelioration possible: recupérer groups associés à un utilisateur 
     }catch(ex){
         console.log("getGroupsNamesForUserId : exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

  async deleteUserByUsername(username){
    try{
      const user = await this.getUserByUsername(username);
      const responseMessage = await this.deleteUserById(user.id); 
      return responseMessage;
     }catch(ex){
         console.log("deleteUserByUsername: exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

  async deleteUserById(id){
    try{
      if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
      //console.log("this.adminAccessToken="+this.adminAccessToken);
  
      let wsUrl = this.adminKeycloakRealmUrl + `/users/${id}`;
      
      const response  = await axios.delete(wsUrl,  {headers: { 'Authorization': `Bearer ${this.adminAccessToken}`}});
                                                    
      //console.log("response.status (deleteUserByUsername) : ", + response.status);
      //console.log("response.data (deleteUserByUsername) : " + JSON.stringify(response.data));
      return {message:`user deleted`};   
     }catch(ex){
         console.log("deleteUserById: exception ex as JSON string:" + JSON.stringify(ex));
         throw ex;
    }
  }

async getAdminToken(){
    const payload={
        username : this.adminUsername,
        password : this.adminPassword,
        grant_type: "password",
        client_id : "admin-cli"
    };
    try{
       //first try with admin of specific realm:
       const wsUrl = this.keycloakRealmUrl + "/protocol/openid-connect/token";

       //if x-www-form-urlencoded , axios convert json to form-params
       const response  = await axios.post(wsUrl,payload , 
            {headers: {'content-type': 'application/x-www-form-urlencoded'}});
       //console.log("response.status : ", + response.status);
       //console.log("response.data : " + JSON.stringify(response.data));
       console.log("(ok) admin token for realm="+this.realm)
       return response.data.access_token;
    }catch(ex){
        try{
            //second try with admin of master realm:
            const wsUrl = this.keycloakMasterRealmUrl + "/protocol/openid-connect/token";

            const response  = await axios.post(wsUrl,payload , 
                {headers: {'content-type': 'application/x-www-form-urlencoded'}});
            console.log("(ok) admin token for realm=master")
            return response.data.access_token;s
        }catch(ex2){
            console.log("ERROR: cannot retreive admin token")
            throw ex2;
        }
    }
}

//returning an array of group names
async getGroups(){
    try{
       if(this.adminAccessToken==null)
          this.adminAccessToken = await this.getAdminToken();
       let wsUrl = this.adminKeycloakRealmUrl + "/groups";

       //if x-www-form-urlencoded , axios convert json to form-params
       const response  = await axios.get(wsUrl, 
        {headers: {'Authorization': `Bearer ${this.adminAccessToken}`}});
       //console.log("response.status : ", + response.status);
       //console.log("response.data : " + JSON.stringify(response.data));
       let groupsNames = [];
       for(let group of response.data)
          groupsNames.push(group.name);
       return groupsNames;
    }catch(ex){
        console.log("ERROR: cannot retreive realm groups")
        throw ex;
    }
}

}

/*
//test:
let remoteOidcUsers = new RemoteOidcUsers();
remoteOidcUsers.addUser(new MyOidcUser({username:"user3" , firstName:"luc" , lastName:"SkyWalker" ,
                mainGroup:  "user_of_myrealm"  ,   email : "luc.SkyWalker@star.com" , newPassword : "pwd3"}));
remoteOidcUsers.addUser(new MyOidcUser({username:"admin3" , firstName:"dark" , lastName:"Vador" ,
                mainGroup:  "admin_of_myrealm"  ,   email : "dark.Vador@empire.com" , newPassword : "pwd3"}));  
remoteOidcUsers.addUser(new MyOidcUser({username:"mgr3" , firstName:"ami" , lastName:"Dala" ,
                mainGroup:  "manager_of_myrealm"  ,   email : "ami.dala@star.com" , newPassword : "pwd3"}));   
*/                            

export default { MyOidcUser , RemoteOidcUsers };