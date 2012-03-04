var backgroundConnection;

var ESongListWrap,
	ECurrentSong,
	ECurrentSongPosition,
	ESongFilter,
	EAddLink;

var $SongState = new SongState();
var $SettingsState = new SettingsState();

function filterSongs(e) {
	var q = ESongFilter.value;
	var items = ESongListWrap.querySelectorAll('li');
	
	for(var i = 0; i < items.length; i++) {
		items[i].style.display = 'block';
	}
	
	if(q) {
		for(var x = 0; x < items.length; x++) {
			if(items[x].querySelectorAll('.title')[0].innerHTML.toLowerCase().indexOf(q.toLowerCase()) === -1) {
				items[x].style.display = 'none';
			}
		}
	}
	
}

function handleSongList(songs) {
	
	var songList = document.getElementById('song-list');
		songList.innerHTML = '';
	
	for(var i = 0, sl = songs.length; i < sl; ++i) {
		
		var songListItemWrap = $$('li');
			songListItemWrap.setAttribute('id','song-' + songs[i].id);
		
		var songListItemTitle = $$('a');
			songListItemTitle.className = 'title';
			songListItemTitle.src = '#';
			songListItemTitle.innerHTML = songs[i].title;
			songListItemWrap.appendChild(songListItemTitle);
			(function(t,s) {
				t.onclick = function(e) {
					playPauseSong(s);
				}
			})(songListItemTitle, songs[i])
			
		
		var songListItemControls = $$('div');
			songListItemControls.className = 'controls';
			songListItemWrap.appendChild(songListItemControls);
		
		var songListItemPlayPause = $$('a');
			songListItemPlayPause.className = 'playpause';
			songListItemPlayPause.src = '#';
			songListItemPlayPause.innerHTML = 'play';
			songListItemControls.appendChild(songListItemPlayPause);
			(function(t,s) {
				t.onclick = function(e) {
					playPauseSong(s);
				}
			})(songListItemPlayPause, songs[i])
			
		var songListItemStop = $$('a');
			songListItemStop.className = 'stop';
			songListItemStop.src = '#';
			songListItemStop.innerHTML = 'stop';
			songListItemControls.appendChild(songListItemStop);
			songListItemStop.onclick = function(e) {
				stopSong();
			}
	
			
	
		songList.appendChild(songListItemWrap);
	}
	
}

function playPauseSong(song) {
	backgroundConnection.postMessage({type: 'PlayPauseSong', song: song});
}

function stopSong() {
	backgroundConnection.postMessage({type: 'StopSong'});
}

function updateSettingsState(state) {
	if($SettingsState.songs !== state.songs) {
		handleSongList(state.songs);
	}
	$SettingsState = state;
}

function updateSongState(state) {
	
	if(state.song) {
		
		if($SongState.song !== state.song) {
			if(ECurrentSong) {
				ECurrentSong.removeClass('active');
			}
			ECurrentSong = $('song-' + state.song.id);
			ECurrentSong.addClass('active');
		}
		
		if(state.isPaused) {
			ECurrentSong.addClass('paused');
			ECurrentSong.querySelectorAll('.playpause')[0].innerHTML = 'play';
		} else {
			ECurrentSong.removeClass('paused');
			ECurrentSong.querySelectorAll('.playpause')[0].innerHTML = 'pause';
		}
		
		
	}
	
	$SongState = state;
	
}

function songStop() {
	ECurrentSong.removeClass('active');
	ECurrentSong = null;
	$SongState = new SongState();
}

function init() {
	
	ESongListWrap = $('song-list-wrap');
	
	ESongFilter = $('song-filter');
	ESongFilter.onkeyup = filterSongs;
	
	EAddLink = $('add-link');
	EAddLink.onclick = function (e) {
		e.preventDefault();
		console.log($SettingsState);
		chrome.tabs.create({"url":$SettingsState.folderURL, "selected": true});
	}
	
	backgroundConnection = chrome.extension.connect();
	
	backgroundConnection.onMessage.addListener(function(res) {
		switch(res.type) {
		
			case 'SongState':
				updateSongState(res.songState);
			break;
			
			case 'InitState':
				updateSettingsState(res.settingsState);
				updateSongState(res.songState);
			break;
			
			case 'SongStop':
				songStop();
			break;
			
		}
		
	});
	
	backgroundConnection.postMessage({type: 'init'});

}

window.onload = init;