node.libraryPaths.unshift(node.path.dirname(__filename)+'/..');

var http = require('/http.js');
var utils = require('/utils.js');

exports.createServer = function() {
	return new exports.Server();
};

exports.Server = function() {
	node.EventEmitter.call(this);

	this.channels = {};

	var self = this;
	this.httpServer = http.createServer(function(req, res) {
		self.emit('request', new exports.Request(req, res));
	});

	this.addListener('request', function(request) {
		var id = request.req.uri.path.substr(1);

		if (!(id in this.channels)) {
			return request.respond(404, {error: 'Unknown channel: '+JSON.stringify(id)})
		}

		var channel = this.channels[id];
		if (request.req.uri.params.since) {
			var since = parseInt(request.req.uri.params.since || 0, 10);
			channel.onHistory(since, function(history) {
				request.respond(200, {
					ok: true,
					since: since,
					history: history
				});
			});
		} else if (request.req.uri.params.event) {
			var event = JSON.parse(request.req.uri.params.event);
			var args = event.args;
			args.unshift(event.name);
			channel.emit.apply(channel, args);

			request.respond(200, {
				ok: true
			});
		}
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
};
node.inherits(exports.Request, node.EventEmitter);

exports.Request.prototype.respond = function(code, response) {
	var response = JSON.stringify(response);
	if (this.req.uri.params.callback) {
		response = this.req.uri.params.callback + '('+response+')';
	}

	this.res.sendHeader(code, {'Content-Type': 'text/javascript'});
	this.res.sendBody(response);
	this.res.finish();
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