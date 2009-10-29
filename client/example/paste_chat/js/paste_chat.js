$(function() {
	var here = parseUri(window.location.href);
	var server = $.nodeChannel.server('http://'+here.host+':8001/');

	server.request('get', '/')
		.addCallback(function() {
			$('.start button').fadeIn();
		})
		.addErrback(function() {
			var failDogs = [
				'http://lh3.ggpht.com/SergioAlex76/SO-B3KhnCyI/AAAAAAAAAKs/Kqb-ZxjiD80/fail-dog-ball%5B2%5D.jpg',
				'http://images.triplem.com.au/2009/05/28/195337/fail-dog-24-600x400.jpg',
				'http://data.tumblr.com/zcTqHiK8c5mqoszxmemvnwtF_400.jpg',
				'http://farm3.static.flickr.com/2014/2263874070_55958e6727.jpg',
				'http://untitled00.files.wordpress.com/2009/03/fail-dog.jpg',
				'http://farm4.static.flickr.com/3271/2298205761_299e5e7706.jpg',
				'http://aggregatemadbox.com/bloggregate/wp-content/uploads/2008/03/fail_dogs.jpg'
			];

			var key = Math.floor(Math.random() * failDogs.length);
			var $failDog = $('<img />')
				.attr('src', failDogs[key]);
			var $error = $('<p class="error"/>')
				.text('Sorry, but our systems are currently down : (')
				.add($failDog)
				.insertAfter('.start button');
		});

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