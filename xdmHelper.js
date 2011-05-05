(function(w) {
  function getJSON() {
    var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
        gap,
        indent,
        meta = {    // table of character substitutions
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"' : '\\"',
            '\\': '\\\\'
        },
        rep;
        
    function f(n) {
      // Format integers to have at least two digits.
      return n < 10 ? '0' + n : n;
    }

    function quote(string) {
      escapable.lastIndex = 0;
      return escapable.test(string) ?
          '"' + string.replace(escapable, function (a) {
              var c = meta[a];
              return typeof c === 'string' ? c :
                  '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
          }) + '"' :
          '"' + string + '"';
    }
    
    Date.prototype._fxdmToJSON = function (key) {
      return isFinite(this.valueOf()) ?
             this.getUTCFullYear()   + '-' +
           f(this.getUTCMonth() + 1) + '-' +
           f(this.getUTCDate())      + 'T' +
           f(this.getUTCHours())     + ':' +
           f(this.getUTCMinutes())   + ':' +
           f(this.getUTCSeconds())   + 'Z' : null;
    };
    
    String.prototype._fxdmToJSON =
    Number.prototype._fxdmToJSON =
    Boolean.prototype._fxdmToJSON = function (key) {
        return this.valueOf();
    };

    function str(key, holder) {
      var i,          // The loop counter.
          k,          // The member key.
          v,          // The member value.
          length,
          mind = gap,
          partial,
          value = holder[key];
          
      if (value && typeof value === 'object' && typeof value._fxdmToJSON === 'function') {
        value = value._fxdmToJSON(key);
      }

      if (typeof rep === 'function') {
        value = rep.call(holder, key, value);
      }

      switch (typeof value) {
      case 'string':
        return quote(value);

      case 'number':
        return isFinite(value) ? String(value) : 'null';

      case 'boolean':
      case 'null':
        return String(value);
          
      case 'object':
        if (!value) {
          return 'null';
        }

        gap += indent;
        partial = [];

        if (Object.prototype.toString.apply(value) === '[object Array]') {
            length = value.length;
            for (i = 0; i < length; i += 1) {
              partial[i] = str(i, value) || 'null';
            }

            v = partial.length === 0 ? '[]' :
              gap ? '[\n' + gap +
                      partial.join(',\n' + gap) + '\n' +
                          mind + ']' :
                    '[' + partial.join(',') + ']';
            gap = mind;
            return v;
        }

        if (rep && typeof rep === 'object') {
            length = rep.length;
            for (i = 0; i < length; i += 1) {
              k = rep[i];
              if (typeof k === 'string') {
                v = str(k, value);
                if (v) {
                  partial.push(quote(k) + (gap ? ': ' : ':') + v);
                }
              }
            }
        } else {
          for (k in value) {
            if (Object.hasOwnProperty.call(value, k)) {
              v = str(k, value);
              if (v) {
                partial.push(quote(k) + (gap ? ': ' : ':') + v);
              }
            }
          }
        }
        v = partial.length === 0 ? '{}' :
          gap ? '{\n' + gap + partial.join(',\n' + gap) + '\n' +
                  mind + '}' : '{' + partial.join(',') + '}';
        gap = mind;
        return v;
      }
    }

    return {
      stringify: function (value, replacer, space) {
        var i;
        gap = '';
        indent = '';

        if (typeof space === 'number') {
          for (i = 0; i < space; i += 1) {
            indent += ' ';
          }

        } else if (typeof space === 'string') {
          indent = space;
        }

        rep = replacer;
        if (replacer && typeof replacer !== 'function' &&
              (typeof replacer !== 'object' ||
               typeof replacer.length !== 'number')) {
          throw new Error('JSON.stringify');
        }

        return str('', {'': value});
      },
      parse: function (text, reviver) {
        var j;
        function walk(holder, key) {
            var k, v, value = holder[key];
            if (value && typeof value === 'object') {
                for (k in value) {
                    if (Object.hasOwnProperty.call(value, k)) {
                        v = walk(value, k);
                        if (v !== undefined) {
                            value[k] = v;
                        } else {
                            delete value[k];
                        }
                    }
                }
            }
            return reviver.call(holder, key, value);
        }

        text = String(text);
        cx.lastIndex = 0;
        if (cx.test(text)) {
            text = text.replace(cx, function (a) {
                return '\\u' +
                    ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
            });
        }

        if (/^[\],:{}\s]*$/
      .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
      .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
      .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

          j = eval('(' + text + ')');

          return typeof reviver === 'function' ?
            walk({'': j}, '') : j;
        }

        throw new SyntaxError('JSON.parse');
      }
    }
    
  };
  

  if (w.fastXDM._needJSON) {
    w.fastXDM.setJSON(getJSON());
  }
  
  if (w.fastXDM._onlyJSON) {
    return w.fastXDM.setEnv();
  }

  if ("ActiveXObject" in w && "execScript" in w) {
    
    w.fastXDM.onServerStart = function(xdm) {
      if (!("getNixProxy" in w)) {
        window.execScript('Class NixProxy\n' +
                          '    Private m_parent, m_child\n' +
                          '\n' +
                          '    Public Sub SetParent(obj)\n' +
                          '        SET m_parent = obj\n' +
                          '    End Sub\n' +
                          '    Public Sub SetChild(obj)\n' +
                          '        SET m_child = obj\n' +
                          '    End Sub\n' +
                          '\n' +
                          '    Public Sub SendToParent(data)\n' +
                          '        m_parent.send(CStr(data))\n' +
                          '    End Sub\n' +
                          '    Public Sub SendToChild(data)\n' +
                          '        m_child.send(CStr(data))\n' +
                          '    End Sub\n' +
                          'End Class\n' +
                          'Function getNixProxy()\n' +
                          '    Set GetNixProxy = New NixProxy\n' +
                          'End Function\n', 'vbscript');
      }
      xdm.proxy = getNixProxy();
      xdm.proxy.SetParent({
        send: function(msg){
          w.fastXDM.onMessage({data: msg});
        }
      });
      xdm.caller.opener = xdm.proxy;
    }
    
    w.fastXDM.onClientStart = function(xdm) {
      w.fastXDM.waitFor(w, 'opener', function() {
        if (w.opener) {
          xdm.proxy = w.opener;
          xdm.proxy.SetChild({
            send: function(msg){
              setTimeout(function(){
                  w.fastXDM.onMessage({data: msg});
              }, 0);
            }
          });
        }
      });
    }
      
    w.fastXDM.run('helper')
    
    return w.fastXDM.setEnv({
      send: function(xdm, strData) {
        if (xdm.server) {
          xdm.proxy.SendToChild(xdm.key+':'+strData);
        } else {
          w.fastXDM.waitFor(xdm, 'proxy', function() {
            xdm.proxy.SendToParent(xdm.key+':'+strData);
          });
        }
      }
    });
  }
  if (navigator.product === "Gecko" && "frameElement" in window && navigator.userAgent.indexOf('WebKit') == -1) {
    w.fastXDM.onServerStart = function(xdm) {
      //setTimeout(function() {
      xdm.frame._fn = function(sendFn) {
        delete xdm.frame._fn;
        xdm.send = sendFn;
        // remove the function so that it cannot be used to overwrite the send function later on
        return function(msg) {
          w.fastXDM.onMessage({data: msg});
        };
      };
      //}, 3000);
    }
    
    w.fastXDM.onClientStart = function(xdm) {
      xdm.send = window.frameElement._fn(function(msg) {
        w.fastXDM.onMessage({data: msg});
      });
    }
    
    w.fastXDM.run('helper');
    
    return w.fastXDM.setEnv({
      send: function(xdm, strData) {
        //setTimeout(function() {
        w.fastXDM.waitFor(xdm, 'send', function() {
          xdm.send(xdm.key+':'+strData);
        });
        //}, 5000);
      }
    });
  
  }
  
})(window);
