// Some node.js idioms for the browser
try {
  window.node = {};
} catch (e) {
  alert('Error: Could not export window.node namespace!');
}

// A few functions I ported from node.js to be used in a browser environment
(function(node) {
  node.inherits = function(ctor, superCtor) {
    var tempCtor = function(){};
    tempCtor.prototype = superCtor.prototype;
    ctor.super_ = superCtor.prototype;
    ctor.prototype = new tempCtor();
    ctor.prototype.constructor = ctor;
  };

  node.EventEmitter = function() {
    this._listeners = {};
  }

  node.EventEmitter.prototype.addListener = function(event, listener) {
    this.listeners(event).push(listener);
    return this;
  };

  node.EventEmitter.prototype.listeners = function(event) {
    return this._listeners[event] = this._listeners[event] || [];
  };

  node.EventEmitter.prototype.emit = function(event) {
    var listeners = this.listeners(event);
    var args = Array.prototype.slice.call(arguments);

    args.shift();
    for (var i = 0; i < listeners.length; i++) {
      listeners[i].apply(this, args);
    }
  };

  node.Promise = function() {
    node.EventEmitter.call(this);
  };
  node.inherits(node.Promise, node.EventEmitter);

  node.Promise.prototype.addCallback = function(fn) {
    return this.addListener('success', fn);
  }

  node.Promise.prototype.addErrback = function(fn) {
    return this.addListener('error', fn);
  }

  node.Promise.prototype.emitSuccess = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('success');
    this.emit.apply(this, args);
  };

  node.Promise.prototype.emitError = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('error');
    this.emit.apply(this, args);
  };
})(window.node);

(function($) {
  var nodeChannel = $.nodeChannel = {};

  nodeChannel.uuid = function() {
    var uuid = '';
    for (i = 0; i < 32; i++) {
      uuid += Math.floor(Math.random() * 16).toString(16);
    }
    return uuid;
  };

  nodeChannel.request = function(method, options) {
    // Handle cross-domain requests
    if (options.uri.substr(0, 1) != '/') {
      if (method == 'get') {
        return nodeChannel._jsonp(options);
      } else {
        return nodeChannel._iframe(method, options);
      }
    }

    var promise = new node.Promise();
    $.ajax({
      type: method,
      data: (method == 'get')
        ? options.data
        : {json: JSON.stringify(options.data)},
      url: options.uri,
      timeout: options.timeout || 5000,
      dataType: 'json',
      success: function(r) {
        if ('error' in r) {
          return request.emitError(r.error);
        }
        promise.emitSuccess(r);
      },
      error: function(xhr, status) {
        promise.emitError(status);
      }
    });

    return promise;
  };

  nodeChannel._jsonp = function(options) {
    var request = new node.Promise();

    var self = this;
    $.jsonp({
      url: options.uri,
      data: options.data,
      callbackParameter: 'callback',
      timeout: options.timeout || 5000,
      success: function(r){
        if ('error' in r) {
          return request.emitError(r.error);
        }
        request.emitSuccess(r);
      },
      error: function(xOptions, status) {
        request.emitError(status, xOptions);
      }
    });
    return request;
  };

  var _counter = 0;
  nodeChannel._iframe = function(method, options) {
    var request = new node.Promise();

    var requestDone = false;
    setTimeout(function() {
      if (requestDone == false) {
        request.emitError('timeout');
      }
    }, options.timeout || 5000);

    var $form = $('<form enctype="multipart/form-data" />')
      .attr('action', options.uri)
      .attr('target', 'node-channel-iframe-'+_counter)
      .attr('method', method.toUpperCase())
      .appendTo('body')
      .hide();

    if (options.fetch) {
      options.data = $.extend({}, options.data, {'_request_id': nodeChannel.uuid()})
    }

    $('<textarea name="json" />')
      .text(JSON.stringify(options.data))
      .prependTo($form);

    var $iframe = $('<iframe id="node-channel-iframe-'+_counter+'" name="node-channel-iframe-'+_counter+'"/>')
      .appendTo('body')
      .hide();

    $iframe.bind('load', function() {
      $iframe.remove();
      $form.remove();

      if (!options.fetch) {
        requestDone = true;
        return request.emitSuccess();
      }

      var response = nodeChannel.request('get', {
        uri: options.fetch+'/_response',
        data: {
          _request_id: options.data._request_id,
          _client_id: options.data._client_id
        }
      });
      response.addErrback(function(r) {
        requestDone = true;
        request.emitError('response-error');
      });

      response.addCallback(function(r) {
        requestDone = true;

        if (r.error) {
          return request.emitError(r.error);
        }

        request.emitSuccess(r);
      });
    });
    $form.submit();

    _counter++;
    return request;
  };

  nodeChannel.server = function(uri, options) {
    var channel = new nodeChannel.Server(uri, options);
    return channel;
  };


  nodeChannel.Server = function(uri, options) {
    node.EventEmitter.call(this);

    var defaults = {
      client_id:  $.cookie('nodeChannel.client_id') || nodeChannel.uuid()
    };
    options = $.extend(defaults, options);

    $.cookie('nodeChannel.client_id', options.client_id, {expires: 365});
    this.options = options;

    this.uri = uri.replace(/\/+$/, '');
  };
  node.inherits(nodeChannel.Server, node.EventEmitter);

  nodeChannel.Server.prototype.createChannel = function() {
    var self = this;

    var request = this.request('post', '/_create_channel', {
      fetch: this.uri
    });

    var promise = new node.Promise();
    request.addErrback(function(e) {
      promise.emitError(e);
    });

    request.addCallback(function(r) {
      var channel = new nodeChannel.Channel(self, r.id);
      promise.emitSuccess(channel);
    });
    return promise;
  };

  nodeChannel.Server.prototype.connectChannel = function(id) {
    var channel = new nodeChannel.Channel(this, id);
    return channel;
  };

  nodeChannel.Server.prototype.request = function(method, uri, options) {
    options = $.extend({uri: this.uri+uri}, options || {});

    options.data = $.extend(
      {_client_id: this.options.client_id},
      options.data || {}
    );

    return nodeChannel.request(method, options);
  };

  nodeChannel.Channel = function(server, id) {
    node.EventEmitter.call(this);

    this.monitor = new node.EventEmitter();

    this.server = server;
    this.id = id;
    this.since = (+new Date());

    this.timeout = 45 * 1000;
    this.pause =  1 * 1000;
    this.requestNum = 0;
  };
  node.inherits(nodeChannel.Channel, node.EventEmitter);

  nodeChannel.Channel.prototype.emit = function(name) {
    var args = Array.prototype.slice.call(arguments);
    args.shift();

    // Causes the event to be emitted locally, but not send to the remote channel
    if (name === false) {
      node.EventEmitter.prototype.emit.apply(this, args);
      return;
    }

    var event = {
      name: name,
      args: args
    };
    var options = {
      data: {events: [event]}
    };
    var request = this.server.request('post', '/'+this.id, options);

    var self = this;
    request.addCallback(function(r) {

    });

    request.addErrback(function(r) {
      // Handle
    });

    node.EventEmitter.prototype.emit.apply(this, args);
  };

  nodeChannel.Channel.prototype.listen = function(pause, timeout) {
    this.timeout = (timeout === undefined) ? this.timeout : timeout;
    this.pause = (pause === undefined) ? this.pause : pause;

    var options = {
      data: {since: this.since}
    };
    var request = this.server.request('get', '/'+this.id, options);

    var self = this;
    request.addCallback(function(r) {
      self._emitHistory(r.history);
      self.requestNum++;

      setTimeout(function() {
        self.listen();
      }, self.pause);
    });

    request.addErrback(function(status) {
      if (status != 'timeout') {
        self.monitor.emit('error', {error: status});
        return;
      }

      setTimeout(function() {
        self.listen();
      }, self.pause);
    });
  };

  nodeChannel.Channel.prototype._emitHistory = function(history) {
    this.since = history[history.length - 1].time;

    var self = this;
    $.each(history, function(i, event) {
      var args = event.args;
      args.unshift(event.name);
      args.unshift(false);
      self.emit.apply(self, args);
    });
  };
})(jQuery);