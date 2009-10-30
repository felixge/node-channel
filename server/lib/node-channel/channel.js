exports.Channel = function(id) {
  process.EventEmitter.call(this);

  this.id = id;

  this.monitor = new process.EventEmitter();
  this.ignores = ['newListener'];
  this.history = [];
};
process.inherits(exports.Channel, process.EventEmitter);

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
  process.EventEmitter.prototype.emit.apply(this, args);

  var name = args.shift();
  if (this.ignores.indexOf(name) > -1) {
    return;
  }

  var event = {name: name, time: (+new Date()), args: args};
  this.history.push(event);
  this.monitor.emit('emit', event);
};