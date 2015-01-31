"use strict";

// all timeline operations
var Player = function ($, window, document) {
    var video = document.getElementById("video");

    // Buttons
    var playButton = document.getElementById("play-pause");
    var muteButton = document.getElementById("mute");
    var fullScreenButton = document.getElementById("full-screen");

    // Sliders
    var seekBar = document.getElementById("seek-bar");
    var volumeBar = document.getElementById("volume-bar");
    var speedButton = document.getElementById("speed-button");

    var isPlayUntil = false;
    var playUntilTime = 0;

    var oldVolume = 0.0;

    var lastTimeUpdate = -1000; // force trigger the first time
    var isPeak = false;

    var phantomTime = 0;
    var videoWidth = 0;
    var videoHeight = 0;
    var videoOrgWidth = 0;
    var videoOrgHeight = 0;

    function init(videoUrl) {
        bindEvents();
        load(videoUrl);
        // mute by default
        // muteButton.click();
    }

    var loadedImages = 0;
    var imageArray = [];

    function preloadThumbnails() {
        var i, tempImage;
        for (i = 0; i < duration; i++) {
            imageArray.push(Highlight.getThumbnailUrl(i));
        }
        for (i = 0; i < imageArray.length; i++) {
            tempImage = new Image();
            tempImage.addEventListener("load", trackProgress, true);
            tempImage.src = imageArray[i];
        }
    }

    function trackProgress() {
        loadedImages += 1;
        if (loadedImages === imageArray.length) {
            imagesLoaded();
        }
    }

    function imagesLoaded() {
        console.log("All thumbnails preloaded");
    }

    function load(videoUrl) {
        video.src = videoUrl;
        video.load();
        // Autoplay
        // play();
        // pause();
    }

    function seekTo(time) {
        video.currentTime = time;
        // PersonalTrace.traces.push({
        //     "type": "seek",
        //     "vtime": getCurrentTime(),
        //     "time": new Date(),
        //     "processed": false
        // });
        // if (!isSegmentOn)
        //     isSegmentOn = true;
        // addSegment();
    }

    function getCurrentTime() {
        return video.currentTime;
    }

    function getPhantomTime() {
        return phantomTime;
    }

    function play() {
        video.play();
        $(playButton).removeClass("play-display").addClass("pause-display");
        PersonalTrace.traces.push({
            "type": "play",
            "vtime": getCurrentTime(),
            "time": new Date(),
            "processed": false
        });
        // if (!isSegmentOn)
        //     isSegmentOn = true;
        PersonalTrace.addSegment();
    }

    function playUntil(newTime, speed) {
        isPlayUntil = true;
        playUntilTime = newTime;
        console.log("play until started", video.currentTime, playUntilTime, speed);
        // play();
        // ensure moving at least at 1x
        var adjustedSpeed = Math.max(0.5, speed);
        if (video.currentTime + adjustedSpeed > playUntilTime)
            video.currentTime = playUntilTime;
        else
            video.currentTime += adjustedSpeed;
    }

    function pause(forceRecord) {
        if (video.paused && typeof forceRecord === "undefined")
            return;
        video.pause();
        $(playButton).removeClass("pause-display").addClass("play-display");
        PersonalTrace.traces.push({
            "type": "pause",
            "vtime": getCurrentTime(),
            "time": new Date(),
            "processed": false
        });
        // if (!isSegmentOn)
        //     isSegmentOn = true;
        PersonalTrace.addSegment();
    }

    function changeSpeed(rate) {
        video.playbackRate = rate.toFixed(1);
        $(speedButton).text(rate.toFixed(1) + "x");
    }

    function videoLoadmetadataHandler() {
        Player.videoWidth = Player.videoOrgWidth = this.videoWidth;
        Player.videoHeight = Player.videoOrgHeight = this.videoHeight;
        // Player.aspectRatio = Player.videoWidth / Player.videoHeight;
        // $("#video-overlay").css("width", Player.videoWidth).css("height", Player.videoHeight);
        // $("#video").css("width", Player.videoWidth).css("height", Player.videoHeight);
        updateVideoOverlay();
        console.log(Player.videoWidth, Player.videoHeight);
    }

    function bindEvents() {
        video.addEventListener("loadedmetadata", videoLoadmetadataHandler);
        playButton.addEventListener("click", playButtonClickHandler);
        muteButton.addEventListener("click", muteButtonClickHandler);
        fullScreenButton.addEventListener("click", fullScreenButtonClickHandler);
        seekBar.addEventListener("mousedown", seekBarMousedownHandler);
        seekBar.addEventListener("mouseup", seekBarMouseupHandler);
        seekBar.addEventListener("change", seekBarChangeHandler);
        seekBar.addEventListener("mousemove", seekBarMousemoveHandler);
        seekBar.addEventListener("mouseout", seekBarMouseoutHandler);
        video.addEventListener("click", videoClickHandler);
        video.addEventListener("timeupdate", videoTimeUpdateHandler);
        video.addEventListener("ended", videoEndedHandler);
        volumeBar.addEventListener("change", volumeBarChandeHandler);
        speedButton.addEventListener("click", speedButtonClickHandler);
        $(".speed-option").on("click", speedOptionClickHandler);
    }

    // Event listener for the play/pause button
    function playButtonClickHandler(){
        if (video.paused == true) {
            play();
            Log.add("Player", "playButtonClick", {"state": "pause to play", "curTime": getCurrentTime()});
        } else {
            pause();
            Log.add("Player", "playButtonClick", {"state": "play to pause", "curTime": getCurrentTime()});
        }
    }



    // Event listener for the mute button
    function muteButtonClickHandler(){
        if (video.muted == false) {
            // Mute the video
            video.muted = true;
            oldVolume = volumeBar.value;
            volumeBar.value = 0.0;
            // Update the button text
            $(muteButton).removeClass("volume-low-display volume-medium-display volume-high-display").addClass("volume-mute-display");
        } else {
            // Unmute the video
            video.muted = false;
            volumeBar.value = oldVolume;
            // Update the button text
            var volumeLevel;
            if (volumeBar.value <= 0.3)
                volumeLevel = "volume-low-display";
            else if (volumeBar.value <= 0.7)
                volumeLevel = "volume-medium-display";
            else
                volumeLevel = "volume-high-display";
            $(muteButton).removeClass("volume-mute-display").addClass(volumeLevel);
        }
        Log.add("Player", "muteButtonClick", {"curTime": getCurrentTime()});
    }


    // Event listener for the full-screen button
    function fullScreenButtonClickHandler(){
        if (video.requestFullscreen) {
            video.requestFullscreen();
        } else if (video.mozRequestFullScreen) {
            video.mozRequestFullScreen(); // Firefox
        } else if (video.webkitRequestFullscreen) {
            video.webkitRequestFullscreen(); // Chrome and Safari
        }
        Log.add("Player", "fullScreenClick", {"curTime": getCurrentTime()});
    }


    // Pause the video when the seek handle is being dragged
    function seekBarMousedownHandler(){
        pause();
        Log.add("Player", "seekBarMousedown", {"curTime": getCurrentTime()});
    }

    // Play the video when the seek handle is dropped
    function seekBarMouseupHandler(){
        play();
        Log.add("Player", "seekBarMouseup", {"curTime": getCurrentTime()});
    }

    // Event listener for the seek bar
    function seekBarChangeHandler(){
        // Calculate the new time
        var time = video.duration * (seekBar.value / 100);
        // console.log(time);
        // Update the video time
        video.currentTime = time;
    }

    // show thumbnail preview
    function seekBarMousemoveHandler() {
        var seekBarRect = document.querySelector("#seek-bar").getBoundingClientRect();
        var curTime = parseInt((event.pageX - seekBarRect.left) / $("#seek-bar").width() * duration);
        // console.log(curTime, event.pageX, seekBarRect.left);
        $(".trace-tooltip")
            .css("top", (event.pageY+20) + "px")
            .css("left", (event.pageX-100) + "px")
            .html("<img src='" + Highlight.getThumbnailUrl(curTime) + "' class='tooltip-thumbnail'><br/>" + "[" + formatSeconds(curTime) + "]")
            .show();
    }


    function seekBarMouseoutHandler() {
        $(".trace-tooltip").hide();
    }

    function videoClickHandler(){
        Log.add("Player", "videoClick", {"curTime": getCurrentTime()});
        playButton.click();
    }



    function videoTimeUpdateManual(newTime) {
        // if (isPlayUntil)
        //     console.log("update", video.currentTime, video.playbackRate);
        // Calculate the slider value
        var value = (100 / video.duration) * newTime;
        var intCurrentTime = parseInt(newTime);

        $("#time-display").text(formatSeconds(newTime));

        // update transcript
        Transcript.update(intCurrentTime);

        // Things that don't need updates every time.
        // Currently happnening every 2 seconds.
        // TODO: make efficient. reduce looping. group same time topics into a single object
        if (lastTimeUpdate - intCurrentTime < -2 || lastTimeUpdate - intCurrentTime > 2){
            lastTimeUpdate = intCurrentTime;
            // console.log("checking");

            if (typeof Topicflow.currentTopic === "undefined") {
                // console.log("first time");
                Topicflow.displayTopics(intCurrentTime);
            } else {
                if (intCurrentTime * 1000 <= Topicflow.currentTopic["start"] || intCurrentTime  * 1000 >= Topicflow.currentTopic["end"]){
                    // console.log("topic changed");
                    Topicflow.displayTopics(intCurrentTime);
                }
            }

            // Highlight.updateScreenshot(video.currentTime);
            Highlight.updatePip(intCurrentTime);
        }
/*
        // slow down for hills
        if (isPlayUntil){
            var adjustedSpeed;
            if (Peak.isPeak(video.currentTime)){
                adjustedSpeed = video.playbackRate / 4; // Math.max(0.5, video.playbackRate / 4);
                console.log("PEAK ALERT", adjustedSpeed);
                // trigger only for the first time
                if (isPeak == false){
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                } else {
                    // normal dragging: move a bit.
                    adjustedSpeed = video.playbackRate; // Math.max(0.5, video.playbackRate);
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                }
                isPeak = true;
            } else {
                adjustedSpeed = video.playbackRate * 4; // Math.max(0.5, video.playbackRate * 4);
                // trigger only for the first time
                if (isPeak == true){
                    console.log("jumping", adjustedSpeed);
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                } else {
                    // normal dragging: move a bit.
                    adjustedSpeed = video.playbackRate; //Math.max(0.5, video.playbackRate);
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                }
                isPeak = false;
            }
        }
*/
        // only when in the interaction peaks
        if (Peak.isPeak(newTime)) {
            $(".playbar").attr("class", "playbar dragging peak");
        } else {
            $(".playbar").attr("class", "playbar");
        }

        if (isPlayUntil){
            if ((video.playbackRate > 0 && playUntilTime <= intCurrentTime) || (video.playbackRate < 0 && playUntilTime >= intCurrentTime)){
                // pause();
                $(".playbar").attr("class", "playbar");
                console.log("play until complete");
                isPlayUntil = false;
                isPeak = false;
                changeSpeed(1);
                play();
            }
        }

        // show phantom frame
        $("#video-overlay img").attr("src", Highlight.getThumbnailUrl(intCurrentTime));
        // console.log($("#video").position().top, $("#video").position().left, $("#video").width(), $("#video").height());

        /*
        if ($("#prev-frame").is(":visible")) {
            $("#video-overlay").css("width", "560px");
            $("#video-overlay")
                .css("top", $("#video").position().top + ($("#video").height() - $("#video-overlay").height()) / 2)
                .css("left", $("#video").position().left + ($("#video").width() - $("#video-overlay").width()) / 2)
                // .css("width", "560px")
                .css("height", "auto")
                // .css("width", $("#video").width())
                // .css("height", $("#video").height())
                .show();
        } else {
            $("#video-overlay")
                .css("top", $("#video").position().top + ($("#video").height() - videoHeight) / 2)
                .css("left", $("#video").position().left + ($("#video").width() - videoWidth) / 2)
                .css("width", videoWidth)
                .css("height", videoHeight)
                // .css("width", $("#video").width())
                // .css("height", $("#video").height())
                .show();
        }*/
        // Update the slider and playhead
        seekBar.value = value;
        Timeline.movePlayhead(newTime);
        phantomTime = newTime;
    }


    function updateVideoOverlay() {
        $("#video")
            .css("margin-left", $("#video").position().left + ($("#video-container").width() - Player.videoWidth) / 2)
            .css("margin-top", (Player.videoOrgHeight - Player.videoHeight) / 2)
            .css("margin-bottom", (Player.videoOrgHeight - Player.videoHeight) / 2)
            .css("width", Player.videoWidth)
            .css("height", Player.videoHeight);
        var videoBox = document.querySelector("#video").getBoundingClientRect();
        // console.log(videoBox, Player.videoWidth, Player.videoHeight);
        $("#video-overlay")
            .css("left", videoBox.left)
            .css("top", videoBox.top)
            .css("width", videoBox.right - videoBox.left)
            .css("height", videoBox.bottom - videoBox.top);
    }

    // Update the seek bar as the video plays
    function videoTimeUpdateHandler() {
        // if (isPlayUntil)
        //     console.log("update", video.currentTime, video.playbackRate);
        // Calculate the slider value
        var value = (100 / video.duration) * video.currentTime;
        var intCurrentTime = parseInt(video.currentTime);

        $("#time-display").text(formatSeconds(video.currentTime));

        // update transcript
        Transcript.update(intCurrentTime);

        // Things that don't need updates every time.
        // Currently happnening every 2 seconds.
        // TODO: make efficient. reduce looping. group same time topics into a single object
        if (lastTimeUpdate - intCurrentTime < -2 || lastTimeUpdate - intCurrentTime > 2){
            lastTimeUpdate = intCurrentTime;
            // console.log("checking");

            if (typeof Topicflow.currentTopic === "undefined") {
                // console.log("first time");
                Topicflow.displayTopics(intCurrentTime);
            } else {
                if (intCurrentTime * 1000 <= Topicflow.currentTopic["start"] || intCurrentTime  * 1000 >= Topicflow.currentTopic["end"]){
                    // console.log("topic changed");
                    Topicflow.displayTopics(intCurrentTime);
                }
            }

            // Highlight.updateScreenshot(video.currentTime);
            Highlight.updatePip(video.currentTime);
        }
/*
        // slow down for hills
        if (isPlayUntil){
            var adjustedSpeed;
            if (Peak.isPeak(video.currentTime)){
                adjustedSpeed = video.playbackRate / 4; // Math.max(0.5, video.playbackRate / 4);
                console.log("PEAK ALERT", adjustedSpeed);
                // trigger only for the first time
                if (isPeak == false){
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                } else {
                    // normal dragging: move a bit.
                    adjustedSpeed = video.playbackRate; // Math.max(0.5, video.playbackRate);
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                }
                isPeak = true;
            } else {
                adjustedSpeed = video.playbackRate * 4; // Math.max(0.5, video.playbackRate * 4);
                // trigger only for the first time
                if (isPeak == true){
                    console.log("jumping", adjustedSpeed);
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                } else {
                    // normal dragging: move a bit.
                    adjustedSpeed = video.playbackRate; //Math.max(0.5, video.playbackRate);
                    changeSpeed(adjustedSpeed);
                    if (video.currentTime + adjustedSpeed > playUntilTime)
                        video.currentTime = playUntilTime;
                    else
                        video.currentTime += adjustedSpeed;
                }
                isPeak = false;
            }
        }
*/
        // only when in the interaction peaks
        if (Peak.isPeak(video.currentTime)) {
            $(".playbar").attr("class", "playbar dragging peak");
        } else {
            $(".playbar").attr("class", "playbar");
        }

        if (isPlayUntil){
            if ((video.playbackRate > 0 && playUntilTime <= intCurrentTime) || (video.playbackRate < 0 && playUntilTime >= intCurrentTime)){
                // pause();
                $(".playbar").attr("class", "playbar");
                console.log("play until complete");
                isPlayUntil = false;
                isPeak = false;
                changeSpeed(1);
                play();
            }
        }

        // Update the slider and playhead
        seekBar.value = value;
        Timeline.movePlayhead(video.currentTime);
    }

    // Event listener for the video playback end
    function videoEndedHandler() {
        pause(true);
        console.log("video ended");
        Log.add("Player", "videoEnded", {});
    }


    // Event listener for the volume bar
    function volumeBarChandeHandler(){
        // Update the video volume
        video.volume = volumeBar.value;
        var volumeLevel;
        if (volumeBar.value <= 0.3)
            volumeLevel = "volume-low-display";
        else if (volumeBar.value <= 0.7)
            volumeLevel = "volume-medium-display";
        else
            volumeLevel = "volume-high-display";
        $(muteButton).removeClass("volume-low-display volume-medium-display volume-high-display").addClass(volumeLevel);
    }

    function speedButtonClickHandler(){
        // $(speedButton).attr("data-speed")
        if ($("#speed-dropdown").is(":visible")) {
            $("#speed-dropdown").hide();
        } else {
            $("#speed-dropdown").show();
        }
        Log.add("Player", "speedButtonClick", {});
    }

    function speedOptionClickHandler(){
        var newSpeed = $(this).attr("data-speed");
        $("#speed-button").text($(this).text());
        console.log(newSpeed);
        updateSpeed(newSpeed);
        $("#speed-dropdown").hide();
        Log.add("Player", "speedOptionClick", {"newSpeed": newSpeed});
    }

    function updateSpeed(newSpeed){
        video.playbackRate = newSpeed;
    }

    function showOverlay() {
        $("#video-overlay").show();
    }

    function hideOverlay() {
        $("#video-overlay").hide();
    }

    return {
        videoWidth: videoWidth,
        videoHeight: videoHeight,
        videoOrgWidth: videoOrgWidth,
        videoOrgHeight: videoOrgHeight,
        init: init,
        preloadThumbnails: preloadThumbnails,
        seekTo: seekTo,
        getCurrentTime: getCurrentTime,
        pause: pause,
        play: play,
        playUntil: playUntil,
        changeSpeed: changeSpeed,
        videoTimeUpdateManual: videoTimeUpdateManual,
        getPhantomTime: getPhantomTime,
        updateVideoOverlay: updateVideoOverlay,
        showOverlay: showOverlay,
        hideOverlay: hideOverlay
    }
}(jQuery, window, document);