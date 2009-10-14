$(function() {
	$('.start button').click(function() {
		$('.start').remove();

		var server = $.nodeChannel.server('http://localhost:8001/');
		server
			.createChannel()
			.addCallback(function(channel) {
				$('.chat').fadeIn();
				$('.chat input').val('http://localhost/node-channel/client/example/tmpchat#'+channel.name);
			});
		return false;
	});

	$('.start button').click();
});