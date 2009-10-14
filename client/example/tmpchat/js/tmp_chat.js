$(function() {
	var server = $.nodeChannel.server('http://localhost:8001/');

	var channelId = window.location.hash.replace(/\?.*$/, '').substr(1);
	if (channelId) {
		var c = server.connectChannel(channelId)
		startChat(c);
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

	var channel;
	function startChat(c) {
		channel = c;

		$('.start').remove();
		$('.chat').fadeIn();
		$('.chat input').val('http://localhost/node-channel/client/example/tmpchat/#'+channel.id);

		channel.addListener('message', function(message) {
			$('.chat .log').append($('<li/>').text(message));
		});

		channel.listen();
	}

	function submitMessage() {
		var $message = $('.chat .message textarea');
		var message = $message.val();
		$message.val('');
		channel.emit('message', message);
	}

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