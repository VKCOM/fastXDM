(function(w) {
if (w.fastXDM) return;

var handlers = {};
var onEnvLoad = [];
var env = {};

// Key generation
function genKey() {
  var key = '';
  for (i=0;i<5;i++) key += Math.ceil(Math.random()*15).toString(16);
  return key;
}

function waitFor(obj, prop, func, self,  count) {
  if (obj[prop]) {
     func.apply(self);
  } else {
    count = count || 0;
    if (count < 1000) setTimeout(function() {
      waitFor(obj, prop, func, self, count + 1)
    }, 0);
  }
}

function attachScript(url) {
  setTimeout(function() {
    var newScript = document.createElement('script');
    newScript.type = 'text/javascript';
    newScript.src = url || w.fastXDM.helperUrl;
    waitFor(document, 'body', function() {      
      document.getElementsByTagName('HEAD')[0].appendChild(newScript);
    });
  }, 0);
}

// Env functions
function getEnv(callback, self) {
  if (env.loaded) {
    callback.apply(self, [env]);
  } else {
    onEnvLoad.push([self, callback]);
  }
}

function envLoaded() {
  env.loaded = true;
  if (onEnvLoad.length > 0) {
    for (callback in onEnvLoad) onEnvLoad[callback][1].apply(onEnvLoad[callback][0], [env]);
  }
}

function applyMethod(strData, self) {
  getEnv(function(env) {
    var data = env.json.parse(strData);
    if (data[0]) {
      if (!data[1]) data[1] = [];
      for (i in data[1]) {
        if (data[1][i]._func) {
          var funcNum = data[1][i]._func;
          data[1][i] = function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('_func'+funcNum);
            self.callMethod.apply(self, args);
          }
        }
      }
      setTimeout(function() {
        if (!self.methods[data[0]]) throw Error('fastXDM: Method ' + data[0] + ' is undefined');
        self.methods[data[0]].apply(self, data[1]);
      }, 0);
    }
  });
}

// XDM object
w.fastXDM = {
  _id: 0,
  helperUrl: 'http://userapi.com/js/api/xdmHelper.js',

  Server: function(methods) {
    this.methods = methods || {};
    this.id = w.fastXDM._id++;
    this.key = genKey();
    this.methods['%init%'] = function() {
      w.fastXDM.run(this.id);
      if (this.methods['onInit']) this.methods['onInit']();
    };
    this.frameName = 'fXD'+this.key;
    this.server = true;
    handlers[this.key] = [applyMethod, this];
  },
  
  Client: function(methods) {
    this.methods = methods || {};
    this.id = w.fastXDM._id++;
    w.fastXDM.run(this.id);
    if (window.name.indexOf('fXD') == 0) {
      this.key = window.name.substr(3);
    } else {
      throw Error('Wrong window.name property.');
    }
    this.caller = window.parent;
    handlers[this.key] = [applyMethod, this];
    this.client = true;
    
    w.fastXDM.on('helper', function() {
      w.fastXDM.onClientStart(this);
    }, this);
    
    getEnv(function(env) {
      env.send(this, env.json.stringify(['%init%']));
      var methods = this.methods;
      setTimeout(function() {
        if (methods['onInit']) methods['onInit']();
      }, 0);
    }, this);
  },
  
  onMessage: function(e) {
    if (!e.data) return false;
    var key = e.data.substr(0, 5);
    // s(JSON.stringify(handlers));
    if (handlers[key]) handlers[key][0](e.data.substr(6), handlers[key][1]);
  },
  
  setJSON: function(json) {
    env.json = json;
  },
  
  getJSON: function(callback) {
    if (!callback) return env.json;
    getEnv(function(env) {
      callback(env.json);
    });
  },
  
  setEnv: function(exEnv) {
    for (i in exEnv) {
      env[i] = exEnv[i];
    }
    envLoaded();
  },
  
  _q: {},
  
  on: function(key, act, self) {
    if (!this._q[key]) this._q[key] = [];
    if (this._q[key] == -1) {
      act.apply(self);
    } else {
      this._q[key].push([act, self]);
    }
  },
  
  run: function(key) {
    if (this._q[key] && this._q[key].length > 0) {
      for (i in this._q[key]) this._q[key][i][0].apply(this._q[key][i][1]);
    }
    this._q[key] = -1;
  },
  
  waitFor: waitFor
}


w.fastXDM.Server.prototype.start = function(obj, count) {
  if (obj.contentWindow) {
    this.caller = obj.contentWindow;
    this.frame = obj;
    
    w.fastXDM.on('helper', function() {
      w.fastXDM.onServerStart(this);
    }, this);

  } else { // Opera old versions
    var self = this;
    count = count || 0;
    if (count < 50) setTimeout(function() {
      self.start.apply(self, [obj, count+1]);
    }, 100);
  }
}

function extend(obj1, obj2){
  for (var i in obj2) {
    if (obj1[i] && typeof(obj1[i]) == 'object') {
      extend(obj1[i], obj2[i])
    } else {
      obj1[i] = obj2[i];
    }
  }
}

w.fastXDM.Server.prototype.append = function(obj, options) {
  if (/msie /.test(navigator.userAgent.toLowerCase())) {
    var frame = document.createElement('<iframe name="'+this.frameName+'" />');
  } else {
    var frame = document.createElement('IFRAME');  
    frame.name = this.frameName;
  }
  frame.frameBorder = '0';
  if (options) extend(frame, options);
  obj.insertBefore(frame, obj.firstChild);
  this.start(frame);
}

w.fastXDM.Client.prototype.callMethod = w.fastXDM.Server.prototype.callMethod = function() {
  var args = Array.prototype.slice.call(arguments);
  var method = args.shift();
  for (i in args) {
    if (typeof(args[i]) == 'function') {
      this.funcsCount = (this.funcsCount || 0) + 1;
      var func = args[i];
      var funcName = '_func' + this.funcsCount;
      this.methods[funcName] = function() {
        func.apply(this, arguments);
        delete this.methods[funcName];
      }
      args[i] = {_func: this.funcsCount};
    }
  }
  waitFor(this, 'caller', function() {
    w.fastXDM.on(this.id, function() {
      getEnv(function(env) {
        env.send(this, env.json.stringify([method, args]));
      }, this);
    }, this);
  }, this);
}

if (w.JSON && typeof(w.JSON) == 'object' && w.JSON.parse && w.JSON.stringify && w.JSON.stringify({a:[1,2,3]}).replace(/ /g, '') == '{"a":[1,2,3]}') {
  env.json = {parse: w.JSON.parse, stringify: w.JSON.stringify};
} else {
  w.fastXDM._needJSON = true;
}

// PostMessage cover
if (w.postMessage) {
  env.protocol = 'p';
  env.send = function(xdm, strData) {
    // alert(key+':'+strData);
    xdm.caller.postMessage(xdm.key+':'+strData, "*");
  }
  if (w.addEventListener) {
    w.addEventListener("message", w.fastXDM.onMessage, false);
  } else {
    w.attachEvent("onmessage", w.fastXDM.onMessage);
  }
  
  if (w.fastXDM._needJSON) {
    w.fastXDM._onlyJSON = true;
    attachScript(); 
  } else {
    envLoaded();
  }
} else {
  attachScript();  
}

})(window);
