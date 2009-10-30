function Chat(ui, home) {
  this.init(home);
  this.bindUi(ui);
}

Chat.prototype.init = function(home) {
  this.server = home.server;
  this.channel = null;
  this.user = null;
  this.users = [];
};

Chat.prototype.createRoom = function() {
  var prompt = this.ui.joinModal('Create Room'), self = this;

  prompt.addCallback(function(prompt) {
    prompt.activity('Creating Room');

    self.server.createChannel()
      .addErrback(function(e) {
        prompt.error(e);
      })
      .addCallback(function(channel) {
        prompt.close();
        self.bindChannel(channel);

        self.user = new User(prompt.name);
        self.channel.emit('join', {name: prompt.name});
      });
  });
};

Chat.prototype.joinRoom = function(id) {
  var prompt = this.ui.joinModal('Join Room'), self = this;

  prompt.addCallback(function(prompt) {
    prompt.close();

    var channel = self.server.connectChannel(id);
    channel.since = 0;
    self.bindChannel(channel);

    self.user = new User(prompt.name);
    self.channel.emit('join', {name: prompt.name});
  });
};

Chat.prototype.connectRoom = function(id) {
  var promise = new node.Promise();

  var modal = this.ui.modal({
    type: 'wait',
    vars: {text: 'Looking for chat room ..'}
  });

  var request = this.server.request('get', '/'+id, {_exists: true}), self = this;
  request
    .addCallback(function() {
      modal.overlay.close();
      promise.emitSuccess();
      self.joinRoom(id);
    })
    .addErrback(function() {
      modal.overlay.close();
      promise.emitError();
    });

  return promise;
};

Chat.prototype.bindChannel = function(channel) {
  var self = this;

  this.channel = channel;

  channel
    .addListener('join', _.bind(this._handleJoin, this))
    .addListener('message', _.bind(this._handleMessage, this));

  channel.monitor
    .addListener('error', function(e) {
      if (e.error == 'error') {
        e.error = 'Oh no, the server just went down : (';
      }
      self.ui.errorModal(e);
    });

  channel.listen();

  window.location.hash = '#'+channel.id;
};

Chat.prototype.bindUi = function(ui) {
  this.ui = ui;

  var self = this;
  ui
    .addListener('message', function(text) {
      self.send(text);
    });
};

Chat.prototype._handleJoin = function(user) {
  user = new User(user.name);
  this.users.push(user);

  this.ui.userJoin(user);
  return user;
};

Chat.prototype._handleMessage = function(message) {
  this.ui.userMessage(message);
};

Chat.prototype.send = function(message) {
  console.log('yeah', message);
  this.channel.emit('message', {user: this.user.name, text: message});
};