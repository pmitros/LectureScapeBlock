"use strict";

// This function creates an <iframe> (and YouTube player)
// after the API code downloads.
function onYouTubeIframeAPIReady() {
  player = new YT.Player('ytplayer', {
    height: '100%', //'330',
    width: '100%', //'540',
    videoId: video_id,
    events: {
      'onReady': onPlayerReady
      // 'onStateChange': onPlayerStateChange
    }
  });
}

// The API will call this function when the video player is ready.
function onPlayerReady(event) {
    // event.target.playVideo();
    setInterval(updatePlayerInfo, 600);
}


// Update the current playbar in the vis
function updatePlayerInfo(){
    // Conditions: player should have been initialized, player should be playing, and duration should be available
    if (player && YT.PlayerState.PLAYING && duration > 0){
        Timeline.movePlayhead(player.getCurrentTime());
    }
}

/*
    The API calls this function when the player's state changes.
    The function indicates that when playing a video (state=1),
    the player should play for six seconds and then stop.

function onPlayerStateChange(event) {
  if (event.data == YT.PlayerState.PLAYING) {
    // Accurate information available only once the player starts playing
    if (duration == 0){
        duration = player.getDuration();
        event.target.stopVideo();
        init();
    }
  }
}
*/