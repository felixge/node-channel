node.libraryPaths.unshift(node.path.dirname(__filename)+'/..');

var http = require('/http.js');
var multipart = require('/multipart.js');
var utils = require('/utils.js');

exports.uuid = function() {
	var uuid = '';
	for (i = 0; i < 32; i++) {
		uuid += Math.floor(Math.random() * 16).toString(16);
	}
	return uuid;
};


exports.createServer = function() {
	return new exports.Server();
};

exports.Server = function() {
	node.EventEmitter.call(this);

	this.channels = {};
	this.responses = {};

	var self = this;
	this.httpServer = http.createServer(function(req, res) {
		self.emit('request', new exports.Request(req, res));
	});

	this.addListener('request', function(request) {
		var req = request.req;

		p(req.uri);


		var prefix = req.uri.path.substr(1, 1);
		if (prefix == '_') {
			request.parts(function(parts) {
				var data = {};
				if (parts.data) {
					try {
						data = JSON.parse(parts.data);
					} catch (e) {
						// @fixme needs to be handled
					}
				}

				switch (req.uri.path) {
					case '/_response':
						var request_id = req.uri.params._request_id;
						var response = self.responses[request_id];
						if (response) {
							request.respond(response.code, response.response);
						} else {
							request.respond(404, {error: 
								'Unknown request_id: '+
								JSON.stringify(request_id)
							})

						}
						break;
					case '/_create_channel':
						var uuid = exports.uuid();
						var channel = self.createChannel(uuid);

						request.respond(200, {
							ok: true,
							id: uuid
						});
						break;
					default:
						request.respond(404, {error: 
							'Unknown command: '+
							JSON.stringify(req.uri.path)
						})
						break;
				}

				if (data._request_id) {
					self.responses[data._request_id] = request.response;
				}
			});

			return;
		}

		var id = req.uri.path.substr(1);
		if (!(id in this.channels)) {
			return request.respond(404, {error: 'Unknown channel: '+JSON.stringify(id)})
		}

		var channel = this.channels[id];
		if (req.method.toLowerCase() == 'post') {
			this.emit('postEvents', channel, request);
		} else {
			this.emit('getEvents', channel, request);
		}
	});

	this.addListener('getEvents', function(channel, request) {
		var since = parseInt(request.req.uri.params.since || 0, 10);
		channel.onHistory(since, function(history) {
			request.respond(200, {
				ok: true,
				since: since,
				history: history
			});
		});
	});

	this.addListener('postEvents', function(channel, request) {
		var parser = new multipart.parse(request.req), self = this;

		parser.addCallback(function(parts) {
			if (!('data' in parts) || !parts.data) {
				return request.respond(400, 'Sorry, but your message body contained no data!');
			}

			var events = JSON.parse(parts.data);
			for (var i = 0; i < events.length; i++) {
				var event = events[i], args = event.args;
				args.unshift(event.name);
				channel.emit.apply(channel, args);
			}

			request.respond(200, {
				ok: true
			});
		});
	});
};
node.inherits(exports.Server, node.EventEmitter);

exports.Server.prototype.listen = function(port) {
	this.httpServer.listen(port);
};

exports.Server.prototype.createChannel = function(id) {
	var channel = new exports.Channel(id);
	return this.channels[id] = channel;
};

exports.Request = function(req, res) {
	node.EventEmitter.call(this);

	this.req = req;
	this.res = res;

	this.response = null;
};
node.inherits(exports.Request, node.EventEmitter);

exports.Request.prototype.respond = function(code, response) {
	this.response = {code: code, response: response};

	response = JSON.stringify(response);

	var jsonp = this.req.uri.params.callback;
	if (jsonp) {
		response = jsonp + '('+response+')';
		this.res.sendHeader(200, {'Content-Type': 'text/javascript'});
	} else {
		this.res.sendHeader(code, {'Content-Type': 'text/javascript'});
	}
	
	this.res.sendBody(response);
	this.res.finish();
};

exports.Request.prototype.parts = function(callback) {
	if (this.req.method === 'get') {
		return callback();
	}

	var parser = new multipart.parse(this.req);
	parser.addCallback(function(parts) {
		callback(parts);
	});
};

exports.Channel = function(id) {
	node.EventEmitter.call(this);

	this.id = id;

	this.monitor = new node.EventEmitter();
	this.ignores = ['newListener'];
	this.history = [];
};
node.inherits(exports.Channel, node.EventEmitter);

exports.Channel.prototype.seek = function(since) {
	if (!since) {
		return this.history;
	}

	for (var i = this.history.length - 1; i >= 0; i--) {
		if (this.history[i].time <= since) {
			i++;
			break;
		}
	}

	if (i < 0 ) {
		i = 0;
	}
	return this.history.slice(i);
}

exports.Channel.prototype.onHistory = function(since, callback) {
	var history = this.seek(since);
	if (history.length) {
		return callback(history);
	}

	var self = this, emitListener = function() {
		var history = self.seek(since);
		if (!history.length) {
			return;
		}

		setTimeout(function() {
			var listeners = self.monitor.listeners('emit');
			listeners.splice(listeners.indexOf(emitListener), 1);
		});
		callback(history);
	};
	this.monitor.addListener('emit', emitListener);
};

exports.Channel.prototype.emit = function() {
	var args = Array.prototype.slice.call(arguments);
	node.EventEmitter.prototype.emit.apply(this, args);

	var name = args.shift();
	if (this.ignores.indexOf(name) > -1) {
		return;
	}

	var event = {name: name, time: (+new Date()), args: args};
	this.history.push(event);
	this.monitor.emit('emit', event);
};