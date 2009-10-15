$(function() {
	var here = parseUri(window.location.href);
	var server = $.nodeChannel.server('http://'+here.host+':8001/');

	var channelId = window.location.hash.replace(/\?.*$/, '').substr(1);
	if (channelId) {
		var c = server.connectChannel(channelId)
		startChat(c);
	}

	var channel, buffer = [];
	function startChat(c) {
		channel = c;

		window.location.hash = '#'+c.id;

		$('.start').remove();
		$('.chat').fadeIn();
		$('.chat input').val(here.source+'#'+channel.id);

		channel.addListener('message', function(message) {
			for (i = 0; i < buffer.length; i++) {
				if (buffer[i] === message) {
					buffer.splice(i, 1);
					return;
				}
			}
			$('.chat .log').append($('<li/>').text(message));
		});

		channel.since = 0;
		channel.listen();
	}

	function submitMessage() {
		var $message = $('.chat .message textarea');
		var message = $message.val();
		$message.val('');

		$('.chat .log').append($('<li/>').text(message));
		buffer.push(message);

		channel.emit('message', message);
	}

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