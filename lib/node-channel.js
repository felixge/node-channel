node.libraryPaths.unshift(node.path.dirname(__filename)+'/..');

var http = require('/http.js');
var utils = require('/utils.js');

exports.createServer = function() {
	return new exports.Server();
};

exports.Server = function() {
	this.init();
};

exports.Server.prototype.init = function() {
	var self = this;

	this.channels = {};
	this.httpServer = http.createServer(function(req, res) {
		self.handle(req, res);
	});
}

function seek(history, since) {
	if (!since) {
		return history;
	}

	for (var i = history.length - 1; i > 0; i--) {
		if (history[i].time <= since) {
			i++;
			break;
		}
	}
	return history.slice(i);
}

exports.Server.prototype.handle = function(req, res) {
	var channelId = req.uri.path.substr(1);

	utils.p(req.uri.source);

	// 404
	if (!(channelId in this.channels)) {
		res.sendHeader(404, {'Content-Type': 'text/javascript'});
		res.sendBody(JSON.stringify({error: 'Unknown channel: '+JSON.stringify(channelId)}));
		res.finish();
		return;
	}

	var channel = this.channels[channelId];
	var since = parseInt(req.uri.params.since || 0, 10);

	var waiting = false, done = false, sendHistory = function() {
		if (done) {
			return;
		}

		var history = seek(channel.history, since);
		if (!history.length) {
			if (waiting) {
				return;
			}

			waiting = true;
			channel.monitor.addListener('emit', function() {
				sendHistory();
			});
			return;
		}

		var response = JSON.stringify({ok: true, since: since, history: history});
		if (req.uri.params.callback) {
			response = req.uri.params.callback + '('+response+')';
		}

		res.sendHeader(200, {'Content-Type': 'text/javascript', 'Content-Length': response.length});
		res.sendBody(response);
		res.finish();
		done = true;

		utils.p('Send cool response');
	};
	sendHistory();
};

exports.Server.prototype.listen = function(port) {
	this.httpServer.listen(port);
};

exports.Server.prototype.createChannel = function(id) {
	var channel = new exports.Channel(id);
	return this.channels[id] = channel;
};

exports.Channel = function(id) {
	node.EventEmitter.call(this);

	this.id = id;

	this.monitor = new node.EventEmitter();
	this.ignores = ['newListener'];
	this.history = [];
};
node.inherits(exports.Channel, node.EventEmitter);

exports.Channel.prototype.emit = function() {
	var args = Array.prototype.slice.call(arguments);
	node.EventEmitter.prototype.emit.apply(this, args);

	var name = args.shift();
	if (this.ignores.indexOf(name) > -1) {
		return;
	}

	var event = {event: name, time: (+new Date()), args: args};
	this.history.push(event);
	this.monitor.emit('emit', event);
};