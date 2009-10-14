$(function() {
	var here = parseUri(window.location.href);
	var server = $.nodeChannel.server('http://'+here.host+':8001/');

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
		$('.chat input').val(here.source+'#'+channel.id);

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