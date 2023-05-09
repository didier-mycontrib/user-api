//variables globales:
//var accountWsUrl="../user-api/private";
var accountWsUrl="../user-api/public"; //V1 only (temp)

var zoneBodyTableau;
var zoneUsername;
var zoneFirstName;
var zoneLastName;
var zoneEmail;
var zoneNewPassword;
var zoneGroup;//select with options
var zoneMsg;
var zoneId;
var idSelected; //username
var currentAccount;
var tabAccounts = []; // A synchroniser (via api REST) avec le coté serveur
var tabGroupsNames = [];

window.onload = function(){
    initialiserPage();
}

function reInitEmptyAccount(){
    idSelected=undefined;
    currentAccount={firstName:"",lastName:"",email:"",username:"",mainGroup:null,newPassword:""};
    displayAccount(currentAccount);
    zoneMsg.innerHTML="";
}

function displayMessage(txt){
    zoneMsg.innerHTML=txt?txt:"";
}

function loadAccountsWithAjax(){
    makeAjaxGetRequest(accountWsUrl+"/group" ,  function(texteReponse){
        tabGroupsNames = JSON.parse(texteReponse /* au format json string */);
        for(i=0;i<tabGroupsNames.length;i++){
            let opt = document.createElement("option");
            opt.innerText=tabGroupsNames[i];
            zoneGroup.appendChild(opt);
        }
    });

    makeAjaxGetRequest(accountWsUrl+"/user" ,  function(texteReponse){
        tabAccounts = JSON.parse(texteReponse /* au format json string */);
        for(i=0;i<tabAccounts.length;i++){
            addAccountRow(tabAccounts[i]);
        }
    });
}

function postNewAccountWithAjax(nouvelleAccount){
    makeAjaxPostRequest( accountWsUrl+"/user" ,
                        JSON.stringify(nouvelleAccount) ,  
                       afterPostNewAccountWithAjaxCallback); 
}

function afterPostNewAccountWithAjaxCallback(texteReponse){
        newPostedAccount = JSON.parse(texteReponse /* au format json string */);
        //ajout de nouvelleAccount dans le tableau javascript tabAccounts
        tabAccounts.push(newPostedAccount);
        //ajout de nouvelleAccount dans le tableau HTML:
        addAccountRow(newPostedAccount);
        reInitEmptyAccount();
        mettreEnValeurLigneSelectionnee(null);
}

function putNewValueOfExistingAccountWithAjax(accountToUpdate){
    makeAjaxPutRequest(accountWsUrl+"/user" ,
                        JSON.stringify(accountToUpdate) ,  
                        afterPutNewValueOfExistingAccountWithAjaxCallback);
}

function afterPutNewValueOfExistingAccountWithAjaxCallback(texteReponse){
        let updatedAccount = JSON.parse(texteReponse /* au format json string */);
        remplacerValeursDeLigneDansTableau(updatedAccount);
}

function deleteOldAccountWithAjax(oldAccount){
    let deleteUrl= accountWsUrl+"/user/" + oldAccount.username
    console.log("deleteUrl=" +deleteUrl)
    makeAjaxDeleteRequest(deleteUrl , afterDeleteOldAccountWithAjaxCallback , displayMessage);
}


function afterDeleteOldAccountWithAjaxCallback(texteReponse){
    console.log("delete ajax response:" +  texteReponse);
    var d = null;
    for(i=0;i<tabAccounts.length;i++){
            if(tabAccounts[i] && tabAccounts[i].username == idSelected){
                d=tabAccounts[i]; 
                tabAccounts.splice(i,1); break;
            }
        }
    if(d!=null){
            var trASupprimer = document.getElementById("tr_"+idSelected);
            if(trASupprimer){
                var parentDeTrDansArbreDom = trASupprimer.parentNode;
                parentDeTrDansArbreDom.removeChild(trASupprimer);
            }
            reInitEmptyAccount();
        }
}

function initialiserPage(){
    console.log("initialiserPage");
    zoneBodyTableau=document.getElementById("bodyTableau");
    zoneUsername=document.getElementById("username");
    zoneFirstName=document.getElementById("firstName");
    zoneLastName=document.getElementById("lastName");
    zoneMsg=document.getElementById("msg");
    zoneId=document.getElementById("spanId");
    zoneEmail=document.getElementById("email");
    zoneGroup=document.getElementById("group");//select
    zoneNewPassword=document.getElementById("newPassword");

    loadAccountsWithAjax();

    document.getElementById("bntAdd").disabled = false; 
    document.getElementById("bntUpdate").disabled = true; 
    document.getElementById("bntDelete").disabled = true; 
    reInitEmptyAccount();
}

function readAccount(account){
    //récuperer le contenu des zones saisies (username, ..., email, ...)
    //et peupler les parties de l'objet account existant
    account.username = zoneUsername.value;
    account.firstName = zoneFirstName.value;
    account.lastName = zoneLastName.value;
    account.email = zoneEmail.value;
    account.newPassword = zoneNewPassword.value;
    account.mainGroup = zoneGroup.value ;
    if(account.mainGroup=="") account.mainGroup=null;
}

function displayAccount(account){
    //afficher les parties de l'objet account dans les zones de la page
    zoneId.innerHTML=account.id;
    zoneUsername.value = account.username;
    zoneFirstName.value = account.firstName;
    zoneLastName.value = account.lastName;
    zoneEmail.value= account.email;
    zoneNewPassword.value=account.newPassword;
    zoneGroup.value  = account.mainGroup;
}

function addAccount(){
    var nouvelleAccount = {} ;
    readAccount(nouvelleAccount);//récuperer le contenu des zones saisies 
     if(testValidUsername(nouvelleAccount.username)){ 
        postNewAccountWithAjax(nouvelleAccount);
        //with async afterPostNewAccountWithAjaxCallback() adding in DOM
     }else{
        alert("invalid username (duplicated or empty)!!!");
        zoneUsername.focus()
     }
}

function updateAccount(){
    if(idSelected!=null){
        readAccount(currentAccount);
        if(currentAccount.username == idSelected){
            putNewValueOfExistingAccountWithAjax(currentAccount)
            //with async afterPutNewValueOfExistingAccountWithAjaxCallback
        }
        else{
            alert("invalid change of username for update !!!");
            zoneCode.focus()
        }
    }
}


function newAccount(){
    reInitEmptyAccount();
    document.getElementById("bntAdd").disabled = false; 
    document.getElementById("bntUpdate").disabled = true; 
    document.getElementById("bntDelete").disabled = true; 
    mettreEnValeurLigneSelectionnee(null);
}

function deleteAccount(){
    if(idSelected!=null){
        var d = null;
        for(i=0;i<tabAccounts.length;i++){
            if(tabAccounts[i] && tabAccounts[i].username == idSelected){
                d=tabAccounts[i];  break;
            }
        }
        if(d!=null){
            deleteOldAccountWithAjax(d);
            //with async callback afterDeleteOldAccountWithAjaxCallback
        }
    }
}

function tabAccountElementFromUsername(username){
    var d = null;
    for(i=0;i<tabAccounts.length;i++){
        if(tabAccounts[i].username == username){
            d=tabAccounts[i]; break;
        }
    }
    return d;
}

function mettreEnValeurLigneSelectionnee(selectedTr){
    var trNodeList = zoneBodyTableau
            .getElementsByTagName("tr");
    var nbLines = trNodeList.length;
    for(i=0;i<nbLines;i++){
        var tr = trNodeList.item(i);
        if(tr == selectedTr){
            tr.querySelector("td").style.backgroundColor="lightblue";
        }else{
            tr.querySelector("td").style.backgroundColor="white";
        }
    }
}

function selectionnerAccount(username){
    idSelected=username;
    console.log("idSelected="+idSelected);
    currentAccount=tabAccountElementFromUsername(idSelected);
    displayAccount(currentAccount);
    document.getElementById("bntAdd").disabled = true; 
    document.getElementById("bntUpdate").disabled = false; 
    document.getElementById("bntDelete").disabled = false; 
}

function testValidUsername(newUsername){
    if(newUsername==undefined || newUsername == "") return false;
    var res=true;
    for(i in tabAccounts){
        if( tabAccounts[i] && tabAccounts[i].username == newUsername){
            res=false;
        }
    }
    return res;
}

function addAccountRow(account){
    //ajout de nouvelleAccount dans le tableau HTML (partie zoneBodyTableau)
    var newRow = zoneBodyTableau.insertRow(-1) ;//-1 pour ajout à la fin
    newRow.setAttribute("id","tr_"+account.username);
    //pour acces rapide future suppression et autre
    var newCell0 = newRow.insertCell(0);
    newCell0.addEventListener("click" , function () { 
        selectionnerAccount(account.username);
        mettreEnValeurLigneSelectionnee(newRow);
    }); 
    newCell0.innerHTML = account.username;
    newRow.insertCell(1).innerHTML = account.firstName;
    newRow.insertCell(2).innerHTML = account.lastName;
    newRow.insertCell(3).innerHTML = account.email;
    newRow.insertCell(4).innerHTML = account.mainGroup;
}

function remplacerValeursDeLigneDansTableau(account){
    var trAModif = 
       document.getElementById("tr_"+account.username);
       if(trAModif){
          var listeTd = trAModif.getElementsByTagName("td");
          listeTd[0].innerHTML=account.username;
          listeTd[1].innerHTML=account.firstName;
          listeTd[2].innerHTML=account.lastName;
          listeTd[3].innerHTML=account.email;
          listeTd[4].innerHTML=account.mainGroup;
       }
}