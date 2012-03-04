chrome.browserAction.setBadgeBackgroundColor({color: [85, 85, 85, 155]});

var Player = new Audio();
var popupConnection;

var DocsParams = {
	feedScope: 'https://docs.google.com/feeds',
	folderName: 'Favourite Recordings',
	appName: 'Favourite Recordings',
	folderLocation: null
}

var $SongState = new SongState();
var $SettingsState = new SettingsState();

var oauth = ChromeExOAuth.initBackgroundPage({
	'request_url': 'https://www.google.com/accounts/OAuthGetRequestToken',
	'authorize_url': 'https://www.google.com/accounts/OAuthAuthorizeToken',
	'access_url': 'https://www.google.com/accounts/OAuthGetAccessToken',
	'consumer_key': 'anonymous',
	'consumer_secret': 'anonymous',
	'scope': DocsParams.feedScope,
	'app_name': DocsParams.appName
});

function loadSong(song) {
	$SongState.song = song;
	
	Player = new Audio(song.url);
	
	Player.addEventListener('play', function(e) {
		$SongState.isPaused = false;
		if(!popupConnection) { return; }
		popupConnection.postMessage({type: 'SongState', songState: $SongState});
	});
	
	Player.addEventListener('ended', function(e) {
		stopSong();
	});
	
	Player.addEventListener('pause', function(e) {
		$SongState.isPaused = true;
		if(!popupConnection) { return; }
		popupConnection.postMessage({type: 'SongState', songState: $SongState});
	});
	
	Player.play();
	
	chrome.browserAction.setTitle({title: song.title})
	
}

function playPauseSong(song) {
	if(!$SongState.song) {
		loadSong(song);
	} else if($SongState.song.id !== song.id) {
		stopSong();
		loadSong(song);
	} else if($SongState.song.id === song.id) {
		if(!$SongState.isPaused) {
			Player.pause();
		} else {
			Player.play();
		}
	}
}

function stopSong() {
	
	$SongState.isPaused = null;
	$SongState.song = null;
	
	Player.pause();
	Player.src = "";
	
	chrome.browserAction.setTitle({title: ''})
	
	if(!popupConnection) { return; }
	popupConnection.postMessage({type: 'SongStop'});
}

chrome.extension.onConnect.addListener(function(port) {
	popupConnection = port;
	popupConnection.onDisconnect.addListener(function(evt) {
		popupConnection = null;
	});
	// check we're all good
	if(!DocsParams.folderLocation) {
		getFolder();
		return;
	}
	
	if(!$SettingsState.songs) {
		
		chrome.browserAction.setBadgeText({'text': '...'});
		
		setTimeout(function() { chrome.browserAction.setBadgeText({'text': ''}) }, 3000);
		
	} else {
		popupConnection.postMessage({
			type: 'InitState',
			settingsState: $SettingsState,
			songState: $SongState
		});
	}
	
	getSongs();
	
	popupConnection.onMessage.addListener(function(res) {
		switch(res.type) {
			case 'PlayPauseSong':
				playPauseSong(res.song);
			break;
			case 'StopSong':
				stopSong();
			break;
		}
	});
});

/*********************\
* Google Docs methods
\*********************/

function getSongs() {
		
	var url = DocsParams.feedScope + '/default/private/full/' + DocsParams.folderLocation + '/contents/-/' +
		encodeURIComponent('{http://schemas.google.com/g/2005#kind}audio/mpeg');
		
	var request = {
		'method': 'GET',
		'parameters': {'alt': 'json'},
		'headers': { 'GData-Version': '3.0' }
	};
	oauth.sendSignedRequest(url, function(response,xhr) {
		var data = JSON.parse(response);
		
		if(data.feed.entry) {
			songs = [];
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				var song = new gdocs.GoogleDoc(entry)
				var id = song.resourceId.split(':')[1];
				songs.push({
					id: id,
					title: song.title,
					url: 'https://docs.google.com/uc?id=' + id + '&export=download&hl=en&confirm=no_antivirus'
				});
			}
			
			$SettingsState.songs = songs;
		}
		
		if(popupConnection) {
			popupConnection.postMessage({
				type: 'InitState',
				settingsState: $SettingsState,
				songState: $SongState
			});
		}
		
	}, request);
	
}

function makeFolder() {
	
	var newFolderNotification = webkitNotifications.createNotification("img/logo.png","New folder made",
		"Just made you a sweet new folder called \""+DocsParams.folderName+"\". You can put all your songs in there.");
	newFolderNotification.show();
	setTimeout(function() { newFolderNotification.cancel() }, 5000);
	
	var params = {
		'method': 'POST',
		'headers': {
		  'GData-Version': '3.0',
		  'Content-Type': 'multipart/related; boundary=END_OF_PART',
		},
		'parameters': {
			'alt': 'json'
		},
		'body': gdocs.constructContentBody_(DocsParams.folderName, 'folder', '', DEFAULT_MIMETYPES['folder'], '')
	  };

	  oauth.sendSignedRequest(DocsParams.feedScope + '/default/private/full/', function(response,xhr) {
		var data = JSON.parse(response);
		var folder = (new gdocs.GoogleDoc(data.entry));
		
		DocsParams.folderLocation = folder.resourceId;
		$SettingsState.folderURL = folder.link.alternate;
		
		getSongs();
	}, params);
	
}

function getFolder() {
	var url = DocsParams.feedScope + '/default/private/full/-/folder';
	var request = {
		'method': 'GET',
		'parameters': {
			'alt': 'json',
			'title': DocsParams.folderName,
			'title-exact': 'true'
		},
		'headers': {
			'GData-Version': '3.0'
		}
	};
	oauth.sendSignedRequest(url, function(response,xhr) {
		var data = JSON.parse(response);
		if(!data.feed.entry) {
			makeFolder();
		} else {				
			var folders = [];
			for (var i = 0, entry; entry = data.feed.entry[i]; ++i) {
				folders.push(new gdocs.GoogleDoc(entry));
			}
			if(folders.length > 1) {
					webkitNotifications.createNotification("img/logo.png","Folder conflict",
						"You have two folders called \""+DocsParams.folderName+"\" and that confuses me.\n\n Please only have one.").show();
			} else {
				DocsParams.folderLocation = folders[0].resourceId;
				$SettingsState.folderURL = folders[0].link.alternate;
				getSongs();
			}
		}
	}, request);
};

oauth.authorize(getFolder);