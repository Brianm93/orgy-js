/**
 * Default properties for all deferred objects.
 *
 */
var Main = require('./main.js'),
Config = Main.config();

var tpl = {};

tpl.is_orgy = true;

tpl.id = null;

//A COUNTER FOR AUT0-GENERATED PROMISE ID'S
tpl.settled = 0;

/**
 * STATE CODES:
 * ------------------
 * -1   => SETTLING [EXECUTING CALLBACKS]
 *  0   => PENDING
 *  1   => RESOLVED / FULFILLED
 *  2   => REJECTED
 */
tpl.state = 0;

tpl.value = [];

//The most recent value generated by the then->done chain.
tpl.caboose = null;

tpl.model = "deferred";

tpl.done_fired = 0;

tpl.timeout_id = null;

tpl.callback_states = {
  resolve : 0
  ,then : 0
  ,done : 0
  ,reject : 0
};

/**
 * Self executing function to initialize callback event
 * list.
 *
 * Returns an object with the same propertyNames as
 * tpl.callback_states: adding boilerplate
 * properties for each
 *
 * @returns {object}
 */
tpl.callbacks = (function(){

  var o = {};

  for(var i in tpl.callback_states){
    o[i] = {
      train : []
      ,hooks : {
        onBefore : {
          train : []
        }
        ,onComplete : {
          train : []
        }
      }
    };
  }

  return o;
})();

//PROMISE HAS OBSERVERS BUT DOES NOT OBSERVE OTHERS
tpl.downstream = {};

tpl.execution_history = [];

//WHEN TRUE, ALLOWS RE-INIT [FOR UPGRADES TO A QUEUE]
tpl.overwritable = 0;


/**
 * Default timeout for a deferred
 * @type number
 */
tpl.timeout = Config.timeout;

/**
 * REMOTE
 *
 * REMOTE == 1  =>  [DEFAULT] Make http request for file
 *
 * REMOTE == 0  =>  Read file directly from the filesystem
 *
 * ONLY APPLIES TO SCRIPTS RUN UNDER NODE AS BROWSER HAS NO
 * FILESYSTEM ACCESS
 */
tpl.remote = 1;

//ADDS TO MASTER LIST. ALWAYS TRUE UNLESS UPGRADING A PROMISE TO A QUEUE
tpl.list = 1;


//////////////////////////////////////////
//  _public METHODS
//////////////////////////////////////////


/**
 * Resolves a deferred.
 *
 * @param {mixed} value
 * @returns {void}
 */
tpl.resolve = function(value){

  if(this.settled === 1){
    Main.debug([
      this.id + " can't resolve."
      ,"Only unsettled deferreds are resolvable."
    ]);
  }

  //SET STATE TO SETTLEMENT IN PROGRESS
  this.set_state(this,-1);

  //SET VALUE
  this.value = value;

  //RUN RESOLVER BEFORE PROCEEDING
  //EVEN IF THERE IS NO RESOLVER, SET IT TO FIRED WHEN CALLED
  if(!this.resolver_fired && typeof this.resolver === 'function'){

    this.resolver_fired = 1;

    //Add resolver to resolve train
    try{
      this.callbacks.resolve.train.push(function(){
        this.resolver(value,this);
      });
    }
    catch(e){
      debugger;
    }
  }
  else{

    this.resolver_fired = 1;

    //Add settle to resolve train
    //Always settle before all other complete callbacks
    this.callbacks.resolve.hooks.onComplete.train.unshift(function(){
      settle(this);
    });
  }

  //Run resolve
  this.run_train(
    this
    ,this.callbacks.resolve
    ,this.value
    ,{pause_on_deferred : false}
  );

  //resolver is expected to call resolve again
  //and that will get us past this point
  return this;
};


tpl.reject = function(err){

  if(!(err instanceof Array)){
    err = [err];
  }

  var msg = "Rejected "+this.model+": '"+this.id+"'."

  if(Config.debug_mode){
    err.unshift(msg);
    Main.debug(err,this);
  }
  else{
    msg = msg + "\n Turn debug mode on for more info.";
    console.log(msg);
  }

  //Remove auto timeout timer
  if(this.timeout_id){
    clearTimeout(this.timeout_id);
  }

  //Set state to rejected
  this.set_state(this,2);

  //Execute rejection queue
  this.run_train(
    this
    ,this.callbacks.reject
    ,err
    ,{pause_on_deferred : false}
  );

  return this;
};


tpl.then = function(fn,rejector){

  switch(true){

    //An error was previously thrown, bail out
    case(this.state === 2):
      break;

    //Execution chain already finished. Bail out.
    case(this.done_fired === 1):
      return Main.debug(this.id+" can't attach .then() because .done() has already fired, and that means the execution chain is complete.");

    default:

      //Push callback to then queue
      this.callbacks.then.train.push(fn);

      //Push reject callback to the rejection queue
      if(typeof rejector === 'function'){
        this.callbacks.reject.train.push(rejector);
      }

      //Settled, run train now
      if(this.settled === 1 && this.state === 1 && !this.done_fired){
        this.run_train(
          this
          ,this.callbacks.then
          ,this.caboose
          ,{pause_on_deferred : true}
        );
      }
      //Unsettled, train will be run when settled
      else{}
  }

  return this;
};


tpl.done = function(fn,rejector){

  if(this.callbacks.done.train.length === 0
     && this.done_fired === 0){
      if(typeof fn === 'function'){

        //wrap callback with some other commands
        var fn2 = function(r,deferred,last){

          //Done can only be called once, so note that it has been
          deferred.done_fired = 1;

          fn(r,deferred,last);
        };

        this.callbacks.done.train.push(fn2);

        //Push reject callback to the rejection queue onComplete
        if(typeof rejector === 'function'){
          this.callbacks.reject.hooks.onComplete.train.push(rejector);
        }

        //Settled, run train now
        if(this.settled === 1){
          if(this.state === 1){
            this.run_train(
              this
              ,this.callbacks.done
              ,this.caboose
              ,{pause_on_deferred : false}
            );
          }
          else{
            this.run_train(
              this
              ,this.callbacks.reject
              ,this.caboose
              ,{pause_on_deferred : false}
            );
          }
        }
        //Unsettled, train will be run when settled
        else{}
    }
    else{
      return Main.debug("done() must be passed a function.");
    }
  }
  else{
    return Main.debug("done() can only be called once.");
  }
};


module.exports = tpl;
