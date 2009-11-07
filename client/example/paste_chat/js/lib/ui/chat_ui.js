function ChatUi(context) {
  node.EventEmitter.call(this);

  this.init(context);
  this.bindEvents();
}
node.inherits(ChatUi, node.EventEmitter);

ChatUi.prototype.init = function(context) {
  this.$chat = $(tmpl('chat', {}))
    .hide()
    .insertAfter(context.$home)
    .fadeIn();

  this.$users = $('.right ul', this.$chat);
  this.$log = $('.left .log', this.$chat);
  this.$message = $('.message textarea', this.$chat);
  this.$messageButton = $('.message button', this.$chat);
  this.$topic = $('.left .header h1', this.$chat);
  this.$editTopic = $('.left .header a', this.$chat);
};

ChatUi.prototype.modal = function(options) {
  var defaults = {
    vars: {},
    show: true
  };
  options = $.extend(defaults, options);

  var $modal = $(tmpl(options.type+'_modal', options.vars))
    .insertAfter(this.$chat);

  var overlay = $modal.overlay({
    expose: { 
      color: '#333', 
      loadSpeed: 200, 
      opacity: 0.9 
    }, 
    closeOnClick: false,
    closeOnEsc: false,
    api: true
  });

  if (options.show) {
    overlay.load();
  }
  return {$element: $modal, overlay: overlay};
};

ChatUi.prototype.joinModal = function(button) {
  var promise = new node.Promise();

  var modal = this.modal({
      type: 'join',
      vars: {button: button}
  });

  var $modal = modal.$element, overlay = modal.overlay;
  var self = this;

  $('input', $modal).focus();
  $('form', $modal).submit(function() {
      var val = $('input', $modal).val();
      if (!val.match(/^\s*$/)) {
        promise.emitSuccess({
          name: val,
          close: function() {
            overlay.close();
            self.$message.focus();
          },
          activity: function(text) {
            $('form', $modal).hide();
            $('span', $modal)
              .text(text)
              .fadeIn();
          },
          error: function(text) {
            $('span', $modal)
              .text(text)
              .addClass('error');
          }
        });
      }
      return false;
  });

  promise.emitName = function(name) {
    $('input', $modal).val(name);
    $('form', $modal).submit();
  };

  return promise;
};

ChatUi.prototype.errorModal = function(error) {
  return this.modal({
    type: 'error',
    vars: error
  });
};

ChatUi.prototype.topicModal = function() {
  var promise = new node.Promise();

  var modal = this.modal({
    type: 'topic'
  });

  var $modal = modal.$element, overlay = modal.overlay;
  var self = this;

  $('input', $modal).focus();
  $('form', $modal).submit(function() {
    overlay.close();
    promise.emitSuccess($('input', $modal).val());
    return false;
  });

  return promise;
};

ChatUi.prototype.bindEvents = function() {
  var self = this;
  this.$message.keypress(function(e) {
    if (e.keyCode == 13) {
      self._emitMessage();
      return false;
    }
  });
  this.$messageButton.click(function(e) {
    self._emitMessage();
  });

  this.$editTopic.click(function() {
    self.emit('editTopic');
    return false;
  });
};

ChatUi.prototype.log = function($element) {
  var html = $('html')[0],
      current = Math.max(html.scrollTop, document.body.scrollTop),
      oldMax = html.scrollHeight - html.clientHeight;

  this.$log.append($element);

  var newMax = html.scrollHeight - html.clientHeight;

  if (current >= oldMax) {
    html.scrollTop = newMax;
    document.body.scrollTop = newMax;
  }
};

ChatUi.prototype.userJoin = function(user) {
  var $user = $(tmpl('user', user));
  $user.attr('rel', user.client_id);
  this.$users.append($user);

  var $joinMessage = $(tmpl('join_message', {user: user}));
  this.log($joinMessage);
};

ChatUi.prototype.userLeave = function(user) {
  var $user = this.$users.find('[rel='+user.client_id+']');
  $user.hide();

  var $leaveMessage = $(tmpl('leave_message', {user: user}));
  this.log($leaveMessage);
};

ChatUi.prototype.userMessage = function(message) {
  var $message = $(tmpl('message', message));
  this.log($message);
};

ChatUi.prototype.updateTopic = function(topic) {
  this.$topic.text(topic.text);
  var $topicMessage = $(tmpl('topic_message', topic));
  this.log($topicMessage);
};

ChatUi.prototype._emitMessage = function() {
  this.emit('message', this.$message.val());
  this.$message.val('');
};

ChatUi.prototype.hide = function() {
  this.$chat.hide();
};