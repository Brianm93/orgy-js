var Config = require('./config.js');
var _public = {},
    _private = {};

_public.browser = {},
_public.native = {},
_private.native = {};

//Browser load

_public.browser.css = function(path,deferred){

  var head =  document.getElementsByTagName("head")[0] || document.documentElement,
  elem = document.createElement("link");

  elem.setAttribute("href",path);
  elem.setAttribute("type","text/css");
  elem.setAttribute("rel","stylesheet");

  if(elem.onload){
    (function(elem,path,deferred){
        elem.onload = elem.onreadystatechange = function(path,deferred){
          deferred.resolve(elem);
       };

       elem.onerror = function(path,deferred){
          deferred.reject("Failed to load path: " + path);
       };

    }(elem,path,deferred));

    head.appendChild(elem);
  }
  else{
    //ADD elem BUT MAKE XHR REQUEST TO CHECK FILE RECEIVED
    head.appendChild(elem);
    console.warn("No onload available for link tag, autoresolving.");
    deferred.resolve(elem);
  }
}

_public.browser.script = function(path,deferred){

  var elem = document.createElement("script");
  elem.type = 'text/javascript';
  elem.setAttribute("src",path);

  (function(elem,path,deferred){
      elem.onload = elem.onreadystatechange = function(){
        //Autoresolve by default
        if(typeof deferred.autoresolve !== 'boolean'
        || deferred.autoresolve === true){
          deferred.resolve((typeof elem.value !== 'undefined') ? elem.value : elem);
        }
      };
      elem.onerror = function(){
        deferred.reject("Error loading: " + path);
      };
  }(elem,path,deferred));

  this.head.appendChild(elem);
}

_public.browser.html = function(path,deferred){
  this.default(path,deferred);
}

_public.browser.default = function(path,deferred,options){
  var r,
  req = new XMLHttpRequest();
  req.open('GET', path, true);

  (function(path,deferred){
    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        if(req.status === 200){
          r = req.responseText;
          if(options.type && options.type === 'json'){
            try{
              r = JSON.parse(r);
            }
            catch(e){
              _public.debug([
                "Could not decode JSON"
                ,path
                ,r
              ],deferred);
            }
          }
          deferred.resolve(r);
        }
        else{
          deferred.reject("Error loading: " + path);
        }
      }
    };
  }(path,deferred));

  req.send(null);
}



//Native load

_public.native.css = function(path,deferred){
  _public.browser.css(path,deferred);
}

_public.native.script = function(path,deferred){
  //local package
  if(path[0]==='.'){
    var pathInfo = _private.native.prepare_path(path,deferred);

    var r = require(pathInfo.path);

    //Change back to original working dir
    if(pathInfo.dirchanged) process.chdir(pathInfo.owd);

    //Autoresolve by default
    if(typeof deferred.autoresolve !== 'boolean'
    || deferred.autoresolve === true){
      deferred.resolve(r);
    }
  }
  //remote script
  else{

    //Check that we have configured the environment to allow this,
    //as it represents a security threat and should only be used for debugging
    if(!Config.settings.debug_mode){_
      Config.debug("Set config.debug_mode=1 to run remote scripts outside of debug mode.");
    }
    else{
      _private.native.get(path,deferred,function(data){
        var Vm = require('vm');
        r = Vm.runInThisContext(data);
        deferred.resolve(r);
      });
    }
  }
}

_public.native.html = function(path,deferred){
  _public.native.default(path,deferred);
}

_public.native.default = function(path,deferred){
  _private.native.get(path,deferred,function(r){
    deferred.resolve(r);
  })
}

_private.native.get = function (path,deferred,callback){
  if(path[0] === '.'){

    var pathInfo = _private.native.prepare_path(path,deferred);

    //file system
    var Fs = require('fs');
    Fs.readFile(pathInfo.path, function (err, data) {
      if (err) throw err;
      callback(data);
    });

    //Change back to original working dir
    if(pathInfo.dirchanged) process.chdir(pathInfo.owd);
  }
  else{
    //http
    var Http = require('http');
    Http.get({ path : path}, function (res) {
      var data = '';
      res.on('data', function (buf) {
          data += buf;
      });
      res.on('end', function () {
          callback(data);
      });
    });
  }
}

_private.native.prepare_path = function(path,deferred){
  var owd = process.cwd(), //keep track of starting point so we can return
      cwd = (deferred.cwd) ? deferred.cwd :
            ((Config.settings.cwd) ? Config.settings.cwd : false)
  ,dirchanged = false;

  if(cwd){
    process.chdir(cwd);
    dirchanged = true;
  }
  else{
    cwd = owd;
  }

  return {
    owd : owd
    ,path : cwd+'/'+path
    ,dirchanged : dirchanged
  };
}
module.exports = _public;
