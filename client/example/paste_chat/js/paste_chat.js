$(function() {
	var here = parseUri(window.location.href);
	var server = $.nodeChannel.server('http://'+here.host+':8001/');

	var channelId = window.location.hash.replace(/\?.*$/, '').substr(1);
	if (channelId) {
		var c = server.connectChannel(channelId)
		startChat(c);
	}

	var channel, buffer = [], user;
	function startChat(c) {
		channel = c;

		window.location.hash = '#'+c.id;

		$('.start').remove();
		$('.chat').fadeIn();
		$('.chat input').val(here.source+'#'+channel.id);

		channel.addListener('message', function(message) {
			for (i = 0; i < buffer.length; i++) {
				if (buffer[i] === message.text) {
					buffer.splice(i, 1);
					return;
				}
			}
			addMessage(message);
		});

		channel.addListener('join', function(message) {
			var $li = $('<li/>').text(message.user);
			console.log($('.chat .right ul'), $li, 'fun', message);
			$('.chat .right ul').append($li);
			addNote(message);
		});

		channel.since = 0;
		channel.listen();

		changeUser();
	}

	function changeUser() {
		user = prompt('Please enter your name to participate in this chat:');
		if (!user) {
			return changeUser();
		}

		channel.emit('join', {user: user, text: user+' has entered the room'});
	}

	function submitMessage() {
		var $message = $('.chat .message textarea');
		var message = $message.val();
		$message.val('');

		addMessage({user: user, text: message});
		buffer.push(message);

		channel.emit('message', {user: user, text: message});
	}

	function addMessage (message) {
		var $li = $('<li/>');
		$li.text(message.text);
		$li.prepend($('<strong/>').text(message.user+': '));
		$('.chat .log').append($li);
	};

	function addNote(note) {
		var $li = $('<li/>');
		$li.append($('<em/>').text(note.text));
		$('.chat .log').append($li);
	};

	$('.start button').click(function() {
		server
			.createChannel()
			.addErrback(function(e) {
				alert('Could not create channel, reason: '+"\n\n"+JSON.stringify(e));
			})
			.addCallback(function(channel) {
				startChat(channel);
			});
		return false;
	});

	$('.header a').click(function() {
		window.location.href = window.location.href.replace(/#.*$/, '');
		return false;
	});

	$('.chat .message textarea').keypress(function(e) {
		if (e.keyCode == 13) {
			submitMessage();
			return false;
		}
	});

	$('.chat .message button').click(function(e) {
		submitMessage();
	});
});