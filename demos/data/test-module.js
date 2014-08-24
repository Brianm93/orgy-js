/**
 * Interface to display customer account transactions.
 * 
 * */
(function(obj){
    
    Orgy.define(obj.__id,obj);
    
}(function(id){
    
    var cls = {

        ///////////////////////////////////////////////////
        //  VARIABLES
        ///////////////////////////////////////////////////
        __id : id
        ,__dependencies : [

            {
                url : "*/data/test-module-2a.js"
                ,type : "script"
            }
            ,{
                url : "*/data/test-module-2b.js"
                ,type : "script"
            }
        ]
        ,__dependencies : []
        
        ////////////////////////////////////////
        //  CONSTRUCTOR/RESOLVER
        ////////////////////////////////////////
        ,__resolver : function(r,deferred){  
            deferred.resolve(this);
        }
    };
    
    return cls;
    
}(function(){

    var id;

    //IF WE ARE NAMING MODULE FROM AN INDEX OBJECT SOMEWHERE IN
    //LOCAL SCOPE
    if(typeof index === 'object'){
        id = index.modules[index.last];
        index.last ++;
    }
    else{
        
        if(typeof process === 'object' && process + '' === '[object process]'){
            //ID FROM NODEJS FILE PATH
            id = __filename.split(".").slice(0,-1);
        }
        else{
            //ID FROM BROWSER URL
            id = document.currentScript.src.split("/").pop().split(".").slice(0,-1)[0];
        }
   
    }
    
    return id;
}())));