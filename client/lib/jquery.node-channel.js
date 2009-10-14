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
	$.nodeChannel = {};


	$.nodeChannel.request = function(method, options) {
		if (method == 'get') {
			return $.nodeChannel._jsonp(options);
		} else {
			return $.nodeChannel._iframe(method, options);
		}
	};

	$.nodeChannel._jsonp = function(options) {
		var request = new node.Promise();

		console.log('jsonp ...', options);

		var self = this;
		$.jsonp({
			url: options.uri,
			data: options.data,
			callbackParameter: 'callback',
			timeout: this.timeout,
			success: function(r){
				request.emitSuccess(r);
			},
			error: function(xOptions, status) {
				request.emitError(xOptions, status)
			}
		});
		return request;
	};

	var _counter = 0;
	$.nodeChannel._iframe = function(method, options) {
		var request = new node.Promise();

		console.log('iframe ...', options);

		var $form = $('<form enctype="multipart/form-data" />')
			.attr('action', options.uri)
			.attr('target', 'node-channel-iframe-'+_counter)
			.attr('method', method.toUpperCase())
			.appendTo('body')
			.hide();

		$('<textarea name="data" />')
			.text(JSON.stringify(options.data))
			.prependTo($form);

		var $iframe = $('<iframe id="node-channel-iframe-'+_counter+'" name="node-channel-iframe-'+_counter+'"/>')
			.appendTo('body')
			.hide();

		$iframe.bind('load', function() {
			request.emitSuccess();
			$iframe.remove();
			$form.remove();
		});
		$form.submit();

		_counter++;
		return request;
	};

	$.nodeChannel.server = function(uri) {
		var channel = new $.nodeChannel.Server(uri);
		return channel;
	};


	$.nodeChannel.Server = function(uri) {
		node.EventEmitter.call(this);

		this.uri = uri.replace(/\/+$/, '');
	};
	node.inherits($.nodeChannel.Server, node.EventEmitter);

	$.nodeChannel.Server.prototype.createChannel = function() {
		var request = $.nodeChannel.request('post', {
			uri: this.uri+'/_create_channel',
			data: {}
		});

		var promise = new node.Promise();
		request.addListener(function() {
			console.log('awesome');
		});
		setTimeout(function() {
			promise.emitSuccess({name: 'awesome'});
		}, 100);

		return promise;
	};











	$.nodeChannel.Channel = function(server, id) {
		node.EventEmitter.call(this);

		this.monitor = new node.EventEmitter();

		this.server = server;
		this.id = id;
		this.since = (+new Date());

		this.timeout = 45 * 1000;
		this.pause =  1 * 1000;
	};
	node.inherits($.nodeChannel.Channel, node.EventEmitter);

	$.nodeChannel.Channel.prototype.create = function() {
		var method, options = {};
		if (!this.id) {
			method = 'post';
			options.uri = this.server;
			options.data = {};
		} else {
			throw "Channel PUT not supported yet";
			// method = 'put';
			// uri = this.server + this.id;
		}

		var request = this.request(method, options), self = this;
		request.addCallback(function() {
			self.listen();
		});
	};

	$.nodeChannel.Channel.prototype.emit = function(name) {
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
		var options = {data: [event]};
		var request = this.request('post', options);

		var self = this;
		request.addListener('success', function(r) {

		});

		request.addListener('error', function(r) {
			// Handle
		});

		node.EventEmitter.prototype.emit.apply(this, args);
	};

	$.nodeChannel.Channel.prototype.listen = function(pause, timeout) {
		this.timeout = (timeout === undefined) ? this.timeout : timeout;
		this.pause = (pause === undefined) ? this.pause : pause;

		var options = {data: {since: this.since}};
		var request = this.request('get', options);

		var self = this;
		request.addListener('success', function(r) {
			console.log('received', r);
			self._emitHistory(r.history);

			setTimeout(function() {
				self.listen();
			}, self.pause);
		});

		request.addListener('error', function(xOptions, status) {
			if (status != 'timeout') {
				console.log('error');
				return;
			}

			setTimeout(function() {
				self.listen();
			}, self.pause);
		});
	};

	$.nodeChannel.Channel.prototype._emitHistory = function(history) {
		this.since = history[history.length - 1].time;

		var self = this;
		$.each(history, function(i, event) {
			var args = event.args;
			args.unshift(event.name);
			args.unshift(false);
			self.emit.apply(self, args);
		});
	};

	$.nodeChannel.Channel.prototype.request = function(method, options) {
		if (method == 'get') {
			return this._jsonp(options);
		} else {
			return this._iframe(method, options);
		}
	};

	$.nodeChannel.Channel.prototype._jsonp = function(options) {
		var request = new node.Promise();

		console.log('jsonp ...', options);

		var self = this;
		$.jsonp({
			url: options.uri,
			data: options.data,
			callbackParameter: 'callback',
			timeout: this.timeout,
			success: function(r){
				request.emitSuccess(r);
			},
			error: function(xOptions, status) {
				request.emitError(xOptions, status)
			}
		});
		return request;
	};

	var _counter = 0;
	$.nodeChannel.Channel.prototype._iframe = function(method, options) {
		var request = new node.Promise();

		console.log('iframe ...', options);

		var $form = $('<form enctype="multipart/form-data" />')
			.attr('action', options.uri)
			.attr('target', 'node-channel-iframe-'+_counter)
			.attr('method', method.toUpperCase())
			.appendTo('body')
			.hide();

		$('<textarea name="data" />')
			.text(JSON.stringify(options.data))
			.prependTo($form);

		var $iframe = $('<iframe id="node-channel-iframe-'+_counter+'" name="node-channel-iframe-'+_counter+'"/>')
			.appendTo('body')
			.hide();

		$iframe.bind('load', function() {
			request.emitSuccess();
		});
		$form.submit();

		_counter++;
		return request;
	};
})(jQuery);