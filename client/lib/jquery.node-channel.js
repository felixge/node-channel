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
		var listeners = this.listeners(event), args = Array.prototype.slice.call(arguments);
		args.shift();
		for (var i = 0; i < listeners.length; i++) {
			listeners[i].apply(this, args || []);
		}
	};
})(window.node);

(function($) {
	$.nodeChannel = {};

	$.nodeChannel.connect = function(uri) {
		var channel = new $.nodeChannel.Channel(uri);
		return channel;
	};

	$.nodeChannel.Channel = function(uri) {
		node.EventEmitter.call(this);
		this.uri = uri;
		this.since = (+new Date());

		this.timeout = 45 * 1000;
		this.pause =  1 * 1000;
	};
	node.inherits($.nodeChannel.Channel, node.EventEmitter);

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
		var options = {data: {event: JSON.stringify(event)}};
		var request = this.request(options);

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
		var request = this.request(options);

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

	$.nodeChannel.Channel.prototype.request = function(options) {
		var request = new node.EventEmitter();

		console.log('requesting ...', options);

		var self = this;
		$.jsonp({
			url: this.uri,
			data: options.data,
			callbackParameter: 'callback',
			timeout: this.timeout,
			success: function(r){
				request.emit('success', r);
			},
			error: function(xOptions, status) {
				request.emit('error', xOptions, status)
			}
		});
		// $.ajax({
		// 	type: 'get',
		// 	dataType: 'jsonp',
		// 	url: this.uri,
		// 	data: options.data,
		// 	async: true,
		// 	cache: true,
		// 	success: function(r){
		// 		request.emit('success', r);
		// 	},
		// 	error: function(xhr, status){
		// 		request.emit('error', xhr, status);
		// 	}
		// });

		return request;
	};
})(jQuery);