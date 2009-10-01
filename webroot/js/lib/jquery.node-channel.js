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

	$.nodeChannel.listen = function(uri) {
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

	$.nodeChannel.Channel.prototype.poll = function(pause, timeout) {
		this.timeout = (timeout === undefined) ? this.timeout : timeout;
		this.pause = (pause === undefined) ? this.pause : pause;

		console.log('long polling ...');

		var self = this;
		$.ajax({
			type: 'get',
			dataType: 'jsonp',
			url: this.uri,
			data: {since: this.since},
			async: true,
			cache: false,
			success: function(r){
				self.since = r.history[r.history.length - 1].time;
				setTimeout(function() {
					self.poll();
				}, self.pause);

				console.log('received', r);
				$.each(r.history, function(i, event) {
					var args = event.args;
					args.unshift(event.event);
					self.emit.apply(self, args);
				});
			},
			error: function(xhr, status){
				console.log('error', xhr, status);
				setTimeout(function() {
					self.poll();
				}, self.pause);
			},
		});
	};
})(jQuery);