/* Javascript for LSXBlock. */
function LSXBlock(runtime, element, runtime_data) {

/*    function updateCount(result) {
        $('.count', element).text(result.count);
    }
    var handlerUrl = runtime.handlerUrl(element, 'increment_count');
    $('p', element).click(function(eventObject) {
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"hello": "world"}),
            success: updateCount
        });
    });*/

    // $('.fullscreeen-display', element).css('background-image', 'url(' + data.urls['fullscreen.png'] + ')');
    // $('.play-display', element).css('background-image', 'url(' + data.urls['fullscreen.png'] + ')');




    /* Combined javascript from all preloaded scripts */

    /* Helper Functions */

    /* Query string parser */
    function gup(name) {
        var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
        return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
    }

    /* Normalize data array to a new range [normMin, normMax] */
    function normalizeData (points) {
        var normMax = 1000;
        var normMin = 100;
        var min, max, i, m, d;

        min = Math.min.apply(Math, points);
        max = Math.max.apply(Math, points);
        if (max === min) {
            for (i = 0; i < config.doi.length; i++) {
                points[i] = normMax;
            }
        } else {
            m = (normMax - normMin) / (max - min);
            d = normMax - (m * max);
            for (i = 0; i < points.length; i++) {
                points[i] = m * points[i] + d;
            }
        }
        return points;
    }

    /* Return the size of an object, because .length doesn't work for objects */
    function getObjectSize(obj){
        var size = 0;
        var key;
        for (key in obj){
            if (obj.hasOwnProperty(key))
                size++;
        }
        return size;
    }

    function getTimeDiff(t1, t2) {
        var diff = t1.getTime() - t2.getTime()
        return Math.abs(diff / 1000);
    }


    /* Return a human-readable format for the number of seconds */
    function formatSeconds(sec){
        var s = Math.floor(sec%60);
        return "" + Math.floor(sec/60) + ":" + (s<=9 ? '0' + s : s);
    }


    /* Check if the string is a number */
    function isNumber(n){
        return !isNaN(parseFloat(n)) && isFinite(n);
    }


    /* Sort table by the table ID and column index. */
    function sortTable(id, index, is_first_header, is_ascending){
        var tbl = document.getElementById(id).tBodies[0];
        var store = [];
        var i = is_first_header ? 1 : 0;
        var len;
        for(len = tbl.rows.length; i < len; i++){
            var row = tbl.rows[i];
            var sortnr = row.cells[index].textContent || row.cells[index].innerText;
            store.push([sortnr, row]);
        }
        store.sort(function(x, y){
            var val = 0;
            if (isNumber(x[0]) && isNumber(y[0]))
                return parseFloat(x[0]) - parseFloat(y[0]);
            if (x[0] > y[0])
                val = 1;
            if (x[0] < y[0])
                val = -1;
            if (!is_ascending)
                val *= -1;
            return val;
        });
        i = is_first_header ? 1 : 0;
        for(len = store.length; i < len; i++){
            tbl.appendChild(store[i][1]);
        }
        store = null;
    }


    function bindSortableTableEvents(){
        $("table.sortable th").click(function(){
            var index = $(this).index();
            var $option = $(this).find(".sort-option");
            var sort_class = "";
            var is_ascending = true;
            var table_id = $(this).closest("table").attr("id");
            // alternate between asc and desc sorting
            if ($option.hasClass("active")) {
                is_ascending = !($option.hasClass("ascending"));
                sort_class = $option.hasClass("ascending") ? "descending" : "ascending";
            } else {
                is_ascending = $option.attr("data-default") == "ascending";
                sort_class = $option.attr("data-default");
            }
            $("#" + table_id + " .sort-option").text("");
            $("#" + table_id + " .sort-option").removeClass("active ascending descending");
            $option.addClass("active " + sort_class);
            if (is_ascending)
                $option.html("&#8593;");
            else
                $option.html("&#8595;");
            sortTable(table_id, index, true, is_ascending);
        });

        $("table.sortable th").mouseenter(function(){
            var $option = $(this).find(".sort-option");
            var is_ascending = true;
            // alternate between asc and desc sorting
            if ($option.hasClass("active")) {
                is_ascending = !($option.hasClass("ascending"));
            } else {
                is_ascending = $option.attr("data-default") == "ascending";
            }
            if (is_ascending)
                $option.html("&#8593;");
            else
                $option.html("&#8595;");
        });

        $("table.sortable th").mouseleave(function(){
            var $option = $(this).find(".sort-option");
            var is_ascending = true;
            // alternate between asc and desc sorting
            if ($option.hasClass("active")) {
                // check if preview is on or not
                is_ascending = !($option.hasClass("ascending"));
                if (is_ascending)
                    $option.html("&#8595;");
                else
                    $option.html("&#8593;");
            } else {
                is_ascending = $option.attr("data-default") == "ascending";
                $option.html("&nbsp;");
            }
        });
    }

    /* Player.js */

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

        function pause(forceRecord, duration) {
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
            PersonalTrace.addSegment(duration);
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
                pause(duration);
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

        console.log("player ran")

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


    /* Peak.js */



    // Handling peak data for interaction, search, bookmark
    // a peak should have the following fields:
    // - start: start time
    // - top: peak time
    // - end: end time
    // - type: interaction, bookmark, search
    // - score: how strong the peak is
    // - label: description or summary of the peak
    // - uid: unique ID of (type + integer), e.g., i1, i2, b1, b2, s1, s2...

    var Peak = function ($, window, document) {
        var interactionPeaks = [];
        var visualPeaks = [];
        var searchPeaks = [];
        var bookmarkPeaks = [];

        function init(iPeaks, vPeaks, bPeaks) {
            // TODO: handle server-generated bookmarks
            Peak.interactionPeaks = iPeaks;
            Peak.visualPeaks = vPeaks;
            Peak.bookmarkPeaks = bPeaks;
            initUID();
        }

        function initUID() {
            for (var i = 0; i < Peak.interactionPeaks.length; i++) {
                Peak.interactionPeaks[i]["uid"] = "i" + (i + 1);
            }
            for (var i = 0; i < Peak.visualPeaks.length; i++) {
                Peak.visualPeaks[i]["uid"] = "v" + (i + 1);
            }
            for (var i = 0; i < Peak.bookmarkPeaks.length; i++) {
                Peak.bookmarkPeaks[i]["uid"] = "b" + (i + 1);
            }
        }

        function assignSearchUID() {
            for (var i = 0; i < Peak.searchPeaks.length; i++) {
                Peak.searchPeaks[i]["uid"] = "s" + (i + 1);
            }
        }

        function getNewBookmarkUID() {
            return "b" + (Peak.bookmarkPeaks.length + 1);
        }

        function sortPeaksByTime(a, b) {
            var aName = a["top"];
            var bName = b["top"];
            return ((aName < bName) ? -1 : ((aName > bName) ? 1 : 0));
        }

        function isInteractionPeak(time) {
            var i;
            for (i in Peak.interactionPeaks) {
                if (Peak.interactionPeaks[i]["start"] <= time && time <= Peak.interactionPeaks[i]["end"])
                    return true;
            }
            return false;
        }

        function isVisualPeak(time) {
            var i;
            for (i in Peak.visualPeaks) {
                if (Peak.visualPeaks[i]["start"] <= time && time <= Peak.visualPeaks[i]["end"])
                    return true;
            }
            return false;
        }

        function isSearchPeak(time) {
            var i;
            for (i in Peak.searchPeaks) {
                if (Peak.searchPeaks[i]["start"] <= time && time <= Peak.searchPeaks[i]["end"])
                    return true;
            }
            return false;
        }

        function isBookmarkPeak(time) {
            var i;
            for (i in Peak.bookmarkPeaks) {
                if (Peak.bookmarkPeaks[i]["start"] <= time && time <= Peak.bookmarkPeaks[i]["end"])
                    return true;
            }
            return false;
        }

        function getInteractionPeakAt(time, slackBefore, slackAfter) {
            var peak, start, end, i;
            for (i in Peak.interactionPeaks) {
                start = typeof slackBefore === "undefined" ? Peak.interactionPeaks[i]["start"] : Peak.interactionPeaks[i]["start"] - slackBefore;
                end = typeof slackAfter === "undefined" ? Peak.interactionPeaks[i]["end"] : Peak.interactionPeaks[i]["end"] + slackAfter;
                if (start <= time && time <= end)
                    peak = Peak.interactionPeaks[i];
            }
            return peak;
        }

        function getVisualPeakAt(time, slackBefore, slackAfter) {
            var peak, start, end, i;
            for (i in Peak.visualPeaks) {
                start = typeof slackBefore === "undefined" ? Peak.visualPeaks[i]["start"] : Peak.visualPeaks[i]["start"] - slackBefore;
                end = typeof slackAfter === "undefined" ? Peak.visualPeaks[i]["end"] : Peak.visualPeaks[i]["end"] + slackAfter;
                if (start <= time && time <= end)
                    peak = Peak.visualPeaks[i];
            }
            return peak;
        }

        function getSearchPeakAt(time, slackBefore, slackAfter) {
            var peak, start, end, i;
            for (i in Peak.searchPeaks) {
                start = typeof slackBefore === "undefined" ? Peak.searchPeaks[i]["start"] : Peak.searchPeaks[i]["start"] - slackBefore;
                end = typeof slackAfter === "undefined" ? Peak.searchPeaks[i]["end"] : Peak.searchPeaks[i]["end"] + slackAfter;
                if (start <= time && time <= end)
                    peak = Peak.searchPeaks[i];
            }
            return peak;
        }

        function getBookmarkPeakAt(time, slackBefore, slackAfter) {
            var peak, start, end, i;

            for (i in Peak.bookmarkPeaks) {
                start = typeof slackBefore === "undefined" ? Peak.bookmarkPeaks[i]["start"] : Peak.bookmarkPeaks[i]["start"] - slackBefore;
                end = typeof slackAfter === "undefined" ? Peak.bookmarkPeaks[i]["end"] : Peak.bookmarkPeaks[i]["end"] + slackAfter;
                if (start <= time && time <= end)
                    peak = Peak.bookmarkPeaks[i];
            }
            return peak;
        }

        function getInteractionPeakByUID(uid) {
            var i;
            var peak;
            for (i in Peak.interactionPeaks) {
                if (Peak.interactionPeaks[i]["uid"] == uid)
                    peak = Peak.interactionPeaks[i];
            }
            return peak;
        }

        function getVisualPeakByUID(uid) {
            var i;
            var peak;
            for (i in Peak.visualPeaks) {
                if (Peak.visualPeaks[i]["uid"] == uid)
                    peak = Peak.visualPeaks[i];
            }
            return peak;
        }

        function getSearchPeakByUID(uid) {
            var i;
            var peak;
            for (i in Peak.searchPeaks) {
                if (Peak.searchPeaks[i]["uid"] == uid)
                    peak = Peak.searchPeaks[i];
            }
            return peak;
        }

        function getBookmarkPeakByUID(uid) {
            var i;
            var peak;
            for (i in Peak.bookmarkPeaks) {
                if (Peak.bookmarkPeaks[i]["uid"] == uid)
                    peak = Peak.bookmarkPeaks[i];
            }
            return peak;
        }

        // is now under "any" type of peaks?
        function isPeak(time) {
            return isInteractionPeak(time) || isSearchPeak(time) || isBookmarkPeak(time);
        }


        function addBookmarkPeak(obj) {
            Peak.bookmarkPeaks.push(obj);
            Peak.bookmarkPeaks.sort(sortPeaksByTime);
        }


        return {
            init: init,
            interactionPeaks: interactionPeaks,
            visualPeaks: visualPeaks,
            searchPeaks: searchPeaks,
            bookmarkPeaks: bookmarkPeaks,
            assignSearchUID: assignSearchUID,
            getNewBookmarkUID: getNewBookmarkUID,
            isInteractionPeak: isInteractionPeak,
            isVisualPeak: isVisualPeak,
            isSearchPeak: isSearchPeak,
            isBookmarkPeak: isBookmarkPeak,
            getInteractionPeakAt: getInteractionPeakAt,
            getVisualPeakAt: getVisualPeakAt,
            getSearchPeakAt: getSearchPeakAt,
            getBookmarkPeakAt: getBookmarkPeakAt,
            getInteractionPeakByUID: getInteractionPeakByUID,
            getVisualPeakByUID: getVisualPeakByUID,
            getSearchPeakByUID: getSearchPeakByUID,
            getBookmarkPeakByUID: getBookmarkPeakByUID,
            isPeak: isPeak,
            addBookmarkPeak: addBookmarkPeak,
            sortPeaksByTime: sortPeaksByTime
        };
    }(jQuery, window, document);

    /* Timeline.js */



    // all timeline operations
    var Timeline = function ($, window, document) {
        // visualization parameters
        var w;
        var h;
        var xScale;
        var yScale;

        // status variables
        var isDragging = false;
        var isChartMouseDown = false;
        var draggingId = 0;
        var peakRecovery = 0;
        var curMousePos;
        var timelineBox;
        var curPhantomX;

        function init(visWidth, visHeight){
            w = visWidth;
            h = visHeight;
            xScale = d3.scale.linear().domain([0, duration]).range([0, w]);
            yScale = d3.scale.linear().domain([0, d3.max(data.play_kde)]).range([h, 0]);

            // global to avoid losing correponding mouse up if it occurs outside the chart.
            $(document).on("mouseup", mouseupHandler);
        }

        /* Move the player to the selected region to sync with the vis */
        function rectMousedownHandler(d, i){
            isChartMouseDown = true;
            // dragPlayheadMove(this);
            // console.log("DRAGGING", d3.event.dx);
            $(".playbar").attr("class", "playbar dragging");

            // ignore micro dragging events
            // if (d3.event.dx < 10 && d3.event.dx > -10)
            //     return;
            var chart = d3.selectAll("svg.play-chart");
            var playhead = d3.selectAll("svg.play-chart .playhead");
            var newX = d3.mouse(this)[0]; //parseFloat(playhead.attr("cx")) + d3.event.dx;
            var newTime = parseInt(newX * duration / chart.attr("width"));
            var newY = getAltitude(newTime);

            // 2) determine speed based on the strength of the "rubber band"
            var dx = newX - playhead.attr("cx");
            var dy = newY - playhead.attr("cy");
            // var force = dx*dx + dy*dy;
            var force = dx*dx;
            var speed = Math.min(16, force / 10000);
            speed = Math.max(0.5, speed);
            // console.log("force", force, "speed", speed);

            // 3) play a "quick" preview based on the speed from 2)
            if (dx < 0)
                speed = -1 * speed;
            Player.changeSpeed(speed / 2);
            Player.playUntil(newTime, speed / 2);

            // 4) display a drag trail
            // var dragTrail = chart.selectAll(".dragtrail")
            //     .data(["dragtrail"])
            //     .attr("x1", playhead.attr("cx"))
            //     .attr("x2", newX)
            //     .attr("y1", playhead.attr("cy"))
            //     .attr("y2", yScale(newY))
            //     .attr("stroke-width", (speed * 2) + "px");
            // dragTrail.enter().append("line")
            //     .attr("class", "dragtrail");
            Log.add("Timeline", "rectMousedown", {"newTime": newTime});
        }

        function mouseupHandler(e) {
            window.clearInterval(draggingId);
            // console.log(isChartMouseDown, e, e.pageX, e.pageY);
            if (!isChartMouseDown)
                return;
            isChartMouseDown = false;
            Timeline.isDragging = false;
            $(".chart").attr("class", $(".chart").attr("class").replace(" dragging", ""));
            $("#phantom-cursor").hide();
            curPhantomX = undefined;
            Player.hideOverlay();
            var leftOffset = e.pageX - $("svg.chart").offset().left;
            //var second = Math.floor(d3.mouse(e)[0] * duration / visWidth);
            var second = Math.floor(leftOffset * duration / visWidth);
            // console.log("mouseup second", second);
            Player.seekTo(second);
            // var chart = d3.selectAll("svg.play-chart");
            // chart.selectAll(".dragtrail")
            //     .transition()
            //     .duration(500)
            //     .attr("opacity", 0)
            //     .remove();
            Log.add("Timeline", "mouseup", {"newTime": second});
        }

        /* Progress the playhead as the video advances to the destinationTime mark. */
        function movePlayhead(destinationTime){
            var chart = d3.selectAll("svg.play-chart");
            var newY = getAltitude(destinationTime);
            var curPosition = chart.attr("width") * destinationTime / duration;
            // var dur = Timeline.isDragging ? 1000 : 250;
            var dur = 0;
            // move the playhead.
            chart.selectAll(".playhead")
                .transition()
                .duration(dur)
                .attr("cx", curPosition)
                .attr("cy", yScale(newY));
            // move the playbar.
            chart.selectAll(".playbar")
                .transition()
                .duration(dur)
                .attr("x1", curPosition)
                .attr("x2", curPosition);
        }

    /*
        var dragPlayhead = d3.behavior.drag()
            .origin(Object)
            .on("drag", dragPlayheadMove)
            .on("dragstart", function() {
                console.log("dragstart");
                Player.pause();
                d3.event.sourceEvent.stopPropagation(); // silence other listeners
            })
            .on("dragend", function() {
                console.log("dragend");
                var chart = d3.selectAll("svg.play-chart");
                chart.selectAll(".dragtrail")
                    .transition()
                    .duration(500)
                    .attr("opacity", 0)
                    .remove();
            });
    */


        // when dragging the playhead starts
        function playheadMousedownHandler(e){
            // console.log(e, e.pageX, e.pageY);
            // d3.event.sourceEvent.stopPropagation(); // silence other listeners
            d3.event.stopPropagation();
            // d3.event.preventDefault();
            Player.pause();
            isChartMouseDown = true;
            // dragPlayheadMove(this);
            draggingId = setInterval(handleDragging, 10);
            curMousePos = {
                x: d3.mouse(this)[0], // e.clientX
                y: d3.mouse(this)[1] // e.clientY
            };

            if ($(".chart").attr("class").indexOf("dragging") === -1)
                $(".chart").attr("class", $(".chart").attr("class") + " dragging");

            // show phantom cursor
            // if (!$("#phantom-cursor").is(":visible"))
                $("#phantom-cursor").show();

            console.log("MOUSEDOWN", draggingId, curMousePos);
            Log.add("Timeline", "playheadMousedown", {"curTime": Player.getCurrentTime()});
            // $(".playbar").attr("class", "playbar dragging");
            // console.log("mouse", d3.mouse(this));
            // ignore micro dragging events
            // if (d3.event.dx < 10 && d3.event.dx > -10)
            //     return;
            /*
            Timeline.isDragging = true;
            var chart = d3.selectAll("svg.play-chart");
            var playhead = d3.selectAll("svg.play-chart .playhead");

            var newX = d3.mouse(this)[0]; //parseFloat(playhead.attr("cx")) + d3.event.dx;
            var newTime = parseInt(newX * duration / chart.attr("width"));
            var newY = getAltitude(newTime);
            console.log("x", newX, "time", newTime);
            Player.seekTo(newTime);
            */
        }

        function handleDragging() {
            Timeline.isDragging = true;
            if (!isChartMouseDown || !curMousePos)
                return;
            // console.log("dragging", curMousePos, curPhantomX);
            var chart = d3.selectAll("svg.play-chart");
            // var newX = curMousePos.x;
            var newX = typeof curPhantomX === "undefined" ? curMousePos.x : curPhantomX;
            var newTime = parseInt(newX * duration / chart.attr("width"));
            // var curTime = Player.getCurrentTime();
            var curTime = Player.getPhantomTime();
            // save all the computation if there's no time to update
            if (newTime === curTime)
                return;
            Player.showOverlay();
            Player.videoTimeUpdateManual(newTime);

            // $(".chart .playhead").attr("class", "playhead dragging");
            // $(".chart .playbar").attr("class", "playbar dragging");
            // var playhead = d3.selectAll("svg.play-chart .playhead");
            // var newX = d3.mouse(this)[0]; //parseFloat(playhead.attr("cx")) + d3.event.dx;
            // var newY = getAltitude(newTime);


            // console.log("curTime", curTime, "newTime", newTime, "diff", newTime - curTime);
            /*
            if (Peak.isInteractionPeak(curTime)) {
                // var penalty = 0.1;
                // var adjustedTime = curTime + penalty * (newTime - curTime);
                //var unit = newTime - curTime > 0 ? Math.min(0.1, newTime - curTime) : Math.max(-0.1, newTime - curTime);
                var unit = newTime - curTime;
                var adjustedTime = curTime + unit; // static slowdown
                // console.log(adjustedTime);
                // console.log("adjTime", adjustedTime);
                // Player.seekTo(adjustedTime);
                Player.videoTimeUpdateManual(adjustedTime);
                peakRecovery = 20;
            } else {
                Player.videoTimeUpdateManual(newTime);
                // phantom cursor
                // if (peakRecovery > 0) {
                //     peakRecovery -= 1;
                //     var penalty = 0.05;
                //     var adjustedTime = curTime + penalty * (newTime - curTime);
                //     // console.log("adjTime", adjustedTime);
                //     // Player.seekTo(adjustedTime);
                //     Player.videoTimeUpdateManual(adjustedTime);
                // } else {
                //     // Player.seekTo(newTime);
                //     Player.videoTimeUpdateManual(newTime);
                // }
            }
            */
        }

        // var oldTimeTime = Date.now();
        // simply updates the mouse position because mouse position information
        // is only available via event handlers.
        function chartMousemoveHandler(e){
            // var nownow = Date.now();
            // console.log(nownow - oldTimeTime);
            // oldTimeTime = nownow;

            // console.log(isChartMouseDown, d3.mouse(this)[0]);
            if (!isChartMouseDown)
                return;
            // e = e || window.event; // IE-ism
            if (typeof curMousePos !== "undefined") {
                var oldx = curMousePos.x;
                var oldy = curMousePos.y;
            }
            // console.log(d3.mouse(this)[0], d3.mouse(this)[1], d3.event.clientX, d3.event.clientY);
            curMousePos = {
                x: d3.mouse(this)[0], // e.clientX
                y: d3.mouse(this)[1] // e.clientY
                // x: d3.event.clientX,
                // y: d3.event.clientY
            };

            if (Timeline.isDragging && $(".chart .playbar.peak").length === 1) {
                // first time, so no delay yet
                if (typeof curPhantomX === "undefined") {
                    console.log("first time");
                    curPhantomX = oldx + (curMousePos.x - oldx) * 0.3;
                } else {
                    curPhantomX += (curMousePos.x - oldx) * 0.5;
                }
                // console.log("phantom", curMousePos.x, curPhantomX, timelineBox.top, curMousePos.y);
                // document.querySelector("#phantom-cursor").style.left = curPhantomX + "px";
                // document.querySelector("#phantom-cursor").style.top = curMousePos.y + "px";
                document.querySelector("#phantom-cursor").setAttribute("x", curPhantomX + "px");
                document.querySelector("#phantom-cursor").setAttribute("y", curMousePos.y + "px");

            } else if (Timeline.isDragging) {
                // here take into account sudden jumps. apply catching up.
                // console.log("no peak", curPhantomX);
                // curPhantomX = timelineBox.left + curMousePos.x;
                if (typeof curPhantomX === "undefined") {
                    curPhantomX = curMousePos.x;
                } else {
                    // snap if < 50px nearby
                    // console.log(curMousePos.x - curPhantomX);
                    if (curMousePos.x - curPhantomX > 20 || curMousePos.x - curPhantomX < -20)
                        curPhantomX += (curMousePos.x - curPhantomX) / 5; // catch up 1/5 distance every run
                    else
                        curPhantomX = curMousePos.x;
                }
                // document.querySelector("#phantom-cursor").style.left = curPhantomX + "px";
                // document.querySelector("#phantom-cursor").style.top = curMousePos.y + "px";
                document.querySelector("#phantom-cursor").setAttribute("x", curPhantomX + "px");
                document.querySelector("#phantom-cursor").setAttribute("y", curMousePos.y + "px");
            } else {
                console.log("dragging ended", curPhantomX);
                // document.querySelector("#phantom-cursor").style.left = curMousePos.x + "px";
                // document.querySelector("#phantom-cursor").style.top = curMousePos.y + "px";
                document.querySelector("#phantom-cursor").setAttribute("x", curMousePos.x + "px");
                document.querySelector("#phantom-cursor").setAttribute("y", curMousePos.y + "px");
            }
            return;
            /*

            // $(".playbar").attr("class", "playbar dragging");
            // ignore micro dragging events
            // if (d3.event.dx < 10 && d3.event.dx > -10)
            //     return;
            Timeline.isDragging = true;

            var chart = d3.selectAll("svg.play-chart");
            var playhead = d3.selectAll("svg.play-chart .playhead");
            var newX = d3.mouse(this)[0]; //parseFloat(playhead.attr("cx")) + d3.event.dx;
            var newTime = parseInt(newX * duration / chart.attr("width"));
            var newY = getAltitude(newTime);
            var curTime = Player.getCurrentTime();
            // console.log("curTime", curTime, "newTime", newTime, "diff", newTime - curTime);
            if (Peak.isInteractionPeak(curTime)) {
                // var penalty = 0.1;
                // var adjustedTime = curTime + penalty * (newTime - curTime);
                var unit = newTime - curTime > 0 ? Math.min(0.2, newTime - curTime) : Math.max(-0.2, newTime - curTime);
                var adjustedTime = curTime + unit; // static slowdown
                console.log("adjTime", adjustedTime);
                Player.seekTo(adjustedTime);
                peakRecovery = 10;
            } else {
                if (peakRecovery > 0) {
                    peakRecovery -= 1;
                    var penalty = 0.1;
                    var adjustedTime = curTime + penalty * (newTime - curTime);
                    Player.seekTo(adjustedTime);
                } else {
                    Player.seekTo(newTime);
                }
            }
            */
        }


        // function postDrag(){
        //     Player.play();
        // }

        function getAltitude(time){
            var chart = d3.selectAll("svg.play-chart");
            var dataset = chart.selectAll("rect").data();
            return dataset[parseInt(time)];
        }

    /*
        function dragPlayheadMove(d){
            console.log("DRAGGING", d3.event.dx);
            $(".playbar").attr("class", "playbar dragging");
            // console.log("mouse", d3.mouse(this));
            // ignore micro dragging events
            // if (d3.event.dx < 10 && d3.event.dx > -10)
            //     return;
            Timeline.isDragging = true;
            var chart = d3.selectAll("svg.play-chart");
            var playhead = d3.selectAll("svg.play-chart .playhead");

            var newX = d3.mouse(this)[0]; //parseFloat(playhead.attr("cx")) + d3.event.dx;
            var newTime = parseInt(newX * duration / chart.attr("width"));
            var newY = getAltitude(newTime);

            Player.seekTo(newTime);
            return;

            // 2) determine speed based on the strength of the "rubber band"
            var dx = newX - playhead.attr("cx");
            var dy = newY - playhead.attr("cy");
            var force = dx*dx + dy*dy;
            var speed = Math.min(16, force / 1000);
            console.log("force", force, "speed", speed);

            // 3) play a "quick" preview based on the speed from 2)
            if (dx < 0)
                speed = -1 * speed;
            // console.log("play until", newTime);
            Player.changeSpeed(speed / 2);
            Player.playUntil(newTime, speed / 2);


            // instead of directly jumping to that section,
            // Player.seekTo(newTime);
            var dragTrail = chart.selectAll(".dragtrail")
                .data(["dragtrail"])
                .attr("x1", playhead.attr("cx"))
                .attr("x2", newX)
                .attr("y1", playhead.attr("cy"))
                .attr("y2", yScale(newY))
                .attr("stroke-width", (speed * 2) + "px");
            // 1) display the trail
            dragTrail.enter().append("line")
                .attr("class", "dragtrail");

            // dragTrail.transition()
            //     .duration(3000)
                // .delay(500)
                // .remove();
                // .call(postDrag);

            // console.log(d3.event, playhead.attr("cx"));
            // console.log(newX, newY, currentTime);
            // chart.selectAll(".playhead")
         //        .transition()
         //        .duration(0)
            //     .attr("cx", newX)
            //     .attr("cy", yScale(newY));
            Timeline.isDragging = false;
        }
    */

        function addDatabarBrushing (peak) {
            var j;
            for (j = peak["start"]; j <= peak["end"]; j++) {
                var $databar = $(".databar[data-second='" + j + "']")
                    .attr("class", "databar peak-databar brushing");
            }
            $("#peak_" + peak["uid"]).addClass("brushing");
            if (peak["uid"] == $("#prev-frame").data("uid"))
                $("#prev-frame").addClass("brushing");
        }

        function removeDatabarBrushing (peak) {
            var j;
            for (j = peak["start"]; j <= peak["end"]; j++) {
                var $databar = $(".databar[data-second='" + j + "']")
                    .attr("class", "databar peak-databar");
            }
            $("#peak_" + peak["uid"]).removeClass("brushing");
            if (peak["uid"] == $("#prev-frame").data("uid"))
                $("#prev-frame").removeClass("brushing");
        }

        /* Render the heatmap visualization */
        function drawPlayVis(dataset, duration){
            d3.selectAll("svg.play-chart").remove();
            // margin = 20,
            // y = d3.scale.linear().domain([0, d3.max(data)]).range([0 + margin, h - margin]),
            // x = d3.scale.linear().domain([0, data.length]).range([0 + margin, w - margin])

            var barPadding = 0;
            //var chart = d3.select("#play-vis").append("svg")
            var chart = d3.select("#timeline").append("svg")
                        .attr("class", "chart play-chart")
                        .attr("width", w)
                        .attr("height", h);
                    // .append("g")
                    //     .attr("transform", "translate(0,30)");

            // Show tooltips on mouseover
            // var tooltip = d3.select("body")
            //     .append("div")
            //     .attr("class", "tooltip")
            //     .style("position", "absolute")
            //     .style("z-index", "10")
            //     .style("visibility", "hidden")
            //     .text("Tooltip");

            chart.on("mousedown", rectMousedownHandler);
            chart.on("mousemove", chartMousemoveHandler);

            var tooltip = d3.select("body")
                .append("div")
                .attr("class", "interaction-peak-tooltip tooltip")
                .style("position", "absolute")
                .style("z-index", "10")
                .text("");

            // // Add histogram
            chart.selectAll("rect")
                .data(dataset)
                .enter().append("rect")
                .attr("data-second", function(d, i){ return i; })
                .attr("class", "databar")
                .attr("x", function(d, i){ return i * (w / dataset.length); })
                .attr("y", yScale)
                .attr("width", w / dataset.length - barPadding)
                .attr("height", function(d){ return h - yScale(d); })
                // // .on("click", rectMousedownHandler)
                .on("mouseover", function(d, i){
                    var curPeak = Peak.getInteractionPeakAt(i);
                    var j;
                    if (Timeline.isDragging)
                        return;
                    tooltip.style("top", (event.pageY-150) + "px")
                        .style("left", (event.pageX-100) + "px")
                        .style("display", "block")
                        .html("<img src='" + Highlight.getThumbnailUrl(i) + "' class='tooltip-thumbnail'><br/>")
                    if (typeof curPeak !== "undefined") {
                        addDatabarBrushing(curPeak);
                        tooltip.html(tooltip.html() + "[" + formatSeconds(i) + "] " + curPeak["label"]);
                    } else {
                        tooltip.html(tooltip.html() + "[" + formatSeconds(i) + "] ");
                    }
                    return;
                })
                .on("mouseout", function(d, i) {
                    var curPeak = Peak.getInteractionPeakAt(i);
                    var j;
                    if (typeof curPeak !== "undefined") {
                        removeDatabarBrushing(curPeak);
                    }
                    return tooltip.style("display", "none");
                });
                // .on("mousemove", function(d){
                //     return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                // })

    /* Path implementation
            var line = d3.svg.line()
                .x(function(d, i){ return i * (w / dataset.length); })
                .y(function(d){ return yScale(d); })
                .interpolate("basis");

            chart.append("path")
                .attr("stroke", "#888")
                .attr("stroke-width", 2)
                .attr("d", line(dataset));

            // chart.append("svg:path")
            //     .data(dataset)
            //     .attr("d", line(dataset))
            //     .on("click", rectMousedownHandler);
            //     .on("mouseover", function(d, i){
            //         console.log(this, d, i);
            //         return tooltip.text("at " + formatSeconds(d.key) + " count: " + d.value).style("visibility", "visible");
            //     })
            //     .on("mousemove", function(d){
            //         return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
            //     })
            //     .on("mouseout", function(d){
            //         return tooltip.style("visibility", "hidden");
            //     });
    */
            // Add playbar
            chart.append("line")
                .attr("class", "playbar")
                .attr("x1", 0)
                .attr("x2", 0)
                .attr("y1", 0)
                .attr("y2", h)
                .on("mousedown", playheadMousedownHandler);
                // .call(dragPlayhead);

            chart.append("circle")
                .attr("class", "playhead")
                .attr("cx", 0)
                .attr("cy", yScale(dataset[0]))
                .attr("r", 8)
                .on("mousedown", playheadMousedownHandler);
                // .on("mousemove", playheadMousemoveHandler);
                // .call(dragPlayhead);

            // phantom cursor
            chart.append("image")
                .attr("xlink:href", "/static/app/img/cursor.png")
                .attr("id", "phantom-cursor")
                .attr("x", "20px")
                .attr("y", "20px")
                .attr("width", "17.5px")
                .attr("height", "25px");

            // chart.selectAll("text")
            //     .data(dataset)
            // .enter().append("text")
            //     .text(function(d){ return Math.floor(d); })
            //     .attr("x", function(d, i){ return i * (w / dataset.length)+3; })
            //     .attr("y", function(d){ return h - (d*amplifier) - 5; });

            // Add axes
            var padding = 0;
            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .ticks(5)
                .tickFormat(formatSeconds);
            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .ticks(3);
            chart.append("g")
                .attr("class", "axis x-axis")
                .attr("transform", "translate(0," + (h - padding) + ")")
                .call(xAxis);
            chart.append("g")
                .attr("class", "axis y-axis")
                //.attr("transform", "translate(" + padding + ",0)")
                .call(yAxis);

            // update the timeline position box
            timelineBox = document.querySelector("#timeline").getBoundingClientRect();
            return chart;
        }



        function drawTimeVis(dataset) {
            var w = visWidth;
            var h = visHeight;
            // Data format: array of [date, count] entries
            // e.g., dataset[0] ==> "2013-03-01": 34

            var keys = dataset.map(function(d){ return d[0]; });
            var values = dataset.map(function(d){ return d[1]; });
            d3.selectAll("svg.time-chart").remove();
            var xScale = d3.scale.ordinal().domain(keys).rangePoints([0, w]);
            var yScale = d3.scale.linear().domain([ 0, d3.max(values) ]).range([h, 0]);

            var barPadding = 1;
            var chart = d3.select("#time-vis").append("svg")
                        .attr("class", "chart time-chart")
                        .attr("width", w)
                        .attr("height", h);
                    // .append("g")
                    //     .attr("transform", "translate(0,30)");

            // Show tooltips on mouseover
            var tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("z-index", "10")
                .style("visibility", "hidden")
                .text("Tooltip");

            var line = d3.svg.line()
                .x(function(d, i){ return xScale(i); })
                .y(function(d){ return yScale(d[1]); });
                // .on("mouseover", function(d){
                //     return tooltip.text(d.value[0] + ": " + d.value[1] + " views").style("visibility", "visible");
                // })
                // .on("mousemove", function(d){
                //     return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                // })
                // .on("mouseout", function(d){
                //     return tooltip.style("visibility", "hidden");
                // });

            // chart.selectAll("path")
            //     .data(d3.entries(dataset))
            //     .enter().append("path")
            //     .attr("d", line(dataset))
                // .on("mouseover", function(d){
                //     console.log(d);
                //     return tooltip.text(d.value[0] + ": " + d.value[1] + " views").style("visibility", "visible");
                // })
                // .on("mousemove", function(d){
                //     return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                // })
                // .on("mouseout", function(d){
                //     return tooltip.style("visibility", "hidden");
                // });
            // Add histogram
            chart.selectAll("rect")
                .data(d3.entries(dataset))
                .enter().append("rect")
                .attr("x", function(d, i){ return i * (w / keys.length); })
                .attr("y", function(d){ return yScale(d.value[1]); })
                .attr("width", w / keys.length - barPadding)
                .attr("height", function(d){ return h - yScale(d.value[1]); })
                // .on("click", rectMousedownHandler)
                .on("mouseover", function(d){
                    return tooltip.text(d.value[0] + ": " + d.value[1] + " views").style("visibility", "visible");
                })
                .on("mousemove", function(d){
                    return tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
                })
                .on("mouseout", function(d){
                    return tooltip.style("visibility", "hidden");
                });

            // Add axes
            var padding = 0;
            var xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickValues(xScale.domain().filter(function(d,i){
                    // only showing the first day of each month
                    return d.substr(-2) == "01";
                }));
            var yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .ticks(3);
            chart.append("g")
                .attr("class", "axis x-axis")
                .attr("transform", "translate(0," + (h - padding) + ")")
                .call(xAxis);
            chart.append("g")
                .attr("class", "axis y-axis")
                //.attr("transform", "translate(" + padding + ",0)")
                .call(yAxis);

            return chart;
        }

        return {
            init: init,
            isDragging: isDragging,
            getAltitude: getAltitude,
            movePlayhead: movePlayhead,
            drawPlayVis: drawPlayVis,
            drawTimeVis: drawTimeVis,
            addDatabarBrushing: addDatabarBrushing,
            removeDatabarBrushing: removeDatabarBrushing
        }

    }(jQuery, window, document);

    /* Highlight.js */



    // Handling interaction peak and highlight display
    var Highlight = function ($, window, document) {
        // var peaks = [];
        var api;

        function init(duration, visWidth) {
            // console.log(peaks_data);
            // peaks = peaks_data;
            bindEvents();
            // hard-coded data for prototyping
            /*
            if (video_id === "aTuYZqhEvuk") {
                // [3] is the confidence or strength of the peak
                peaks = [
                    // [17, 18, 19, 20, "Other students re-watched this part. Verbal explanation", "Why iterative algorithms?"],
                    // [53, 54, 55, 50, "Slide begins.", "Iterative algorithms"],
                    [76, 81, 88, 100, "Other students reviewed this slide.", "Iterative algorithms"],
                    // [136, 137, 138, 20, "Other students re-watched this part. Verbal explanation.", "Algorithm setup"],
                    [173, 176, 178, 100, "Other students re-watched this part. Important explanation.", "Iterative multiplication by successive additions"],
                    [203, 205, 213, 100, "Other students re-watched this part. Code example starts.", "Iterative multiplication code exmaple"],
                    [266, 268, 270, 100, "Other students re-watched this part. Code demonstration starts.", "Running iterative multiplication code in console"]
                    // [290, 291, 292, 50, "Wrap-up.", "Summary of the lecture"]
                ];
            } */
            displayPeaks(duration, visWidth);
            addScrollbar();
        }

        function bindEvents() {
            $(document).on("click", ".timeline-peak", timelinePeakClickHandler);
            $(document).on("mouseenter", ".timeline-peak", timelinePeakMouseenterHandler);
            $(document).on("mouseleave", ".timeline-peak", timelinePeakMouseleaveHandler);
            $(document).on("click", ".timeline-result", timelinePeakClickHandler);
            $(document).on("click", ".screenshot", screenshotClickHandler);
            $(document).on("mouseenter", ".screenshot", screenshotMouseenterHandler);
            $(document).on("mouseleave", ".screenshot", screenshotMouseleaveHandler);
            $(document).on("dragend", ".screenshot", screenshotPinClickHandler);
            $(document).on("click", ".screenshot-pin", screenshotPinClickHandler);
            $(document).on("click", ".pip-cancel", pipCancelClickHandler);
            $(document).on("click", ".pip-smaller", pipSmallerClickHandler);
            $(document).on("click", ".pip-bigger", pipBiggerClickHandler);
            $(document).on("mouseenter", "#prev-frame", pipMouseenterHandler);
            $(document).on("mouseleave", "#prev-frame", pipMouseleaveHandler);
            $(document).on("click", "#add-bookmark-button", addBookmarkButtonClickHandler);
            $(document).on("click", "#save-bookmark-button", saveBookmarkButtonClickHandler);
            $(document).on("click", "#cancel-bookmark-button", cancelBookmarkButtonClickHandler);
            $(document).on("keyup", "#bookmark-description", bookmarkDescriptionKeyupHandler);
            $(document).on("click", ".highlight-checkboxes label", checkboxClickHandler);
            // $(document).on("mouseenter", "#bookmark-popup", function(e){ e.preventDefault(); $(this).css("z-index", 3000); console.log("prevent"); return false;});
        }

        function bookmarkDescriptionKeyupHandler(e) {
            if (e.keyCode === 13) {
                $("#save-bookmark-button").click();
            }
        }

        function isInteractionShown() {
            return $("input.from-others").is(":checked");
        }

        function isBookmarkShown() {
            return $("input.from-me").is(":checked");
        }

        // get up-to-date peak data, depending on the selected view options
        function getCurrentPeaks() {
            var result = [];
            if (isInteractionShown() && isBookmarkShown()) {
                result = Peak.interactionPeaks.concat(Peak.bookmarkPeaks);
            } else if (isInteractionShown()) {
                result = Peak.interactionPeaks;
            } else if (isBookmarkShown()) {
                result = Peak.bookmarkPeaks;
            }
            // last case is when nothing is selected: it's empty alreay so do nothing.
            return result;
        }


        function checkboxClickHandler() {
            var checkboxValue = $(this).attr('for');
            $(".highlight-checkboxes input[value='" + checkboxValue + "']").trigger('click');
            var isChecked = $(".highlight-checkboxes input[value='" + checkboxValue + "']").is(":checked");
            console.log(checkboxValue, isChecked);
            if (checkboxValue == "from-me-val") {
                if (isChecked) {
                    $(".screenshot.by-me").show();
                    $(".timeline-peak.by-me").show();
                } else {
                    $("#highlights .screenshot.by-me").hide();
                    $(".timeline-peak.by-me").hide();
                }
            } else if (checkboxValue == "from-others-val") {
                if (isChecked) {
                    $(".screenshot.by-others").show();
                    $(".timeline-peak.by-others").show();
                } else {
                    $(".screenshot.by-others").hide();
                    $(".timeline-peak.by-others").hide();
                }
            }
            refreshScrollbar();
            Log.add("Highlight", "checkboxClick", {"checkboxValue": checkboxValue, "isChecked": isChecked});
        }

        function addScrollbar() {
            setTimeout(function () {
                $('#highlights').jScrollPane({
                    animateScroll: true
                });
                Highlight.api = $('#highlights').data('jsp');
            }, 500);
        }

        function refreshScrollbar() {
            if (typeof Highlight.api !== "undefined") {
                setTimeout(function () {
                    Highlight.api.reinitialise();
                }, 500);
            }
        }

        function updatePip(time) {
            var activePeak;
            // visual peaks are often very short, so add a 1-second slack to make sure we don't miss any.
            var vPeak = Peak.getVisualPeakAt(time, 2, 0);
            if (typeof vPeak === "undefined")
                return;
            var iPeak = Peak.getInteractionPeakAt(time);
            if (typeof iPeak !== "undefined") {
                console.log("iPeak and vPeak detected", time);
                if (iPeak["top"] <= vPeak["top"]) {
                    console.log("iPeak <= vTran, update PIP");
                    Log.add("Highlight", "updatePip", {"message": "auto update", "time": time});
                    $("#peak_" + iPeak["uid"]).find(".screenshot-pin").trigger("click");
                } else {
                    console.log("vTran < iPeak, do not update PIP");
                    hidePip();
                }
            } else {
                console.log("vPeak only", time);
                hidePip();
            }
        }


        function updateScreenshot(time) {
            var activePeak;
            var peaks = getCurrentPeaks();
            peaks.sort(Peak.sortPeaksByTime);
            var i;
            for (i in peaks){
                // since peaks are time-ordered, we'll always get the most recent screenshot.
                if (peaks[i]["start"] <= time)
                    activePeak = peaks[i];
            }
            // check if we need an update.
            $(".screenshot.active").removeClass("active");
            if (typeof activePeak !== "undefined"){
                // console.log("match", activePeak[1]);
                $("#peak_" + activePeak["uid"]).addClass("active");
                // show pip
                // $("#peak_" + activePeak["uid"]).find(".screenshot-pin").trigger("click");
                refreshScrollbar();
            } else {
                // console.log("no match");
            }
        }


        function hideBookmarkPanel(){
                $("#bookmark-popup").hide();
                $("#add-bookmark-button").removeAttr("disabled");
                // $("#bookmark-thumbnail img").attr("src", "");
                $("#bookmark-thumbnail").empty();
                $("#bookmark-description").val("");
                $("#bookmark-thumbnail").hide();
                $("#bookmark-description").hide();
                $("#save-bookmark-button").hide();
                $("#cancel-bookmark-button").hide();
                $("#bookmark-time").text("").hide();
        }

        function screenshotClickHandler(){
            Player.seekTo($(this).data("start"));
            if (typeof Highlight.api !== "undefined") {
                Highlight.api.scrollToElement($(this));
            }
            Log.add("Highlight", "screenshotClick", {"uid": $(this).data("uid")});
        }

        function screenshotMouseenterHandler(){
            $(this).find(".tooltip").show();
            $(this).addClass("brushing");
            // find corresponding timeline mark
            $("#timeline-peak-" + $(this).data("uid")).addClass("brushing");
            // brushing on the timeline itself
            var peak = Peak.getInteractionPeakByUID($(this).data("uid"));
            if (typeof peak !== "undefined")
                Timeline.addDatabarBrushing(peak);
            if ($("#prev-frame").data("uid") == $(this).data("uid"))
                $("#prev-frame").addClass("brushing");
        }

        function screenshotMouseleaveHandler(){
            $(this).find(".tooltip").hide();
            $(this).removeClass("brushing");
            // find corresponding timeline mark
            $("#timeline-peak-" + $(this).data("uid")).removeClass("brushing");
            // brushing on the timeline itself
            var peak = Peak.getInteractionPeakByUID($(this).data("uid"));
            if (typeof peak !== "undefined")
                Timeline.removeDatabarBrushing(peak);
            if ($("#prev-frame").data("uid") == $(this).data("uid"))
                $("#prev-frame").removeClass("brushing");
        }

        function displayPip(img, uid) {
            if (params["iid"] == "con")
                return;
            var isPipSmall = $("#prev-frame").hasClass("pip-small");
            if (isPipSmall)
                $("#video").addClass("pip-small");
            else
                $("#video").addClass("pip-big");
            $("#prev-frame img").remove();
            $("<img/>")
                .attr("src", img.src)
                .appendTo($("#prev-frame"));
            $("#prev-frame")
                .data("uid", uid)
                .show();

            // if (Timeline.isDragging) {
                // $("#prev-frame").removeClass("hidden");
                // $("#video").removeClass("hidden");

                Player.videoWidth = $("#video").width();
                Player.videoHeight = $("#video").width() * Player.videoOrgHeight / Player.videoOrgWidth;
                Player.updateVideoOverlay();
            // } else {
            //     $( "#prev-frame.hidden").animate({
            //         opacity: 1,
            //         "margin-left": "-=200px",
            //       }, 2000, function() {
            //         $("#prev-frame").removeClass("hidden");
            //         $("#video").removeClass("hidden");
            //         if (isPipSmall)
            //             $("#video").addClass("pip-small");
            //         else
            //             $("#video").addClass("pip-big");
            //         Player.videoWidth = $("#video").width();
            //         Player.videoHeight = $("#video").width() * Player.videoOrgHeight / Player.videoOrgWidth;
            //         Player.updateVideoOverlay();
            //     });
            // }

        }

        // function screenshotDragendHandler(e){
        //     // console.log("dragend", e.target);
        //     // displayPip(e.target);
        //     var $screenshot = $(this).closest(".screenshot").find("img");
        //     $(".screenshot").removeClass("pinned");
        //     $(this).closest(".screenshot").addClass("pinned");
        //     if ($screenshot.length === 1)
        //         displayPip($screenshot[0]);
        //     e.preventDefault();
        //     e.stopPropagation();
        // }

        function screenshotPinClickHandler(e){
            var $screenshot = $(this).closest(".screenshot");
            $(".screenshot").removeClass("pinned");
            $screenshot.addClass("pinned");
            if ($screenshot.find("img").length === 1)
                displayPip($screenshot.find("img")[0], $screenshot.data("uid"));
            e.preventDefault();
            e.stopPropagation();
            if (!Timeline.isDragging)
                Log.add("Highlight", "screenshotPinClick", {"uid": $screenshot.data("uid")});
        }

        function hidePip() {
            if (!$("#prev-frame").is(":visible"))
                return;
            $("#video").removeClass("pip-small pip-big");
            $("#prev-frame img").remove();
            $("#prev-frame").hide();
            $(".screenshot").removeClass("pinned");
            Player.videoWidth = Player.videoOrgWidth;
            Player.videoHeight = Player.videoOrgHeight;
            Player.updateVideoOverlay();
            // if (!Timeline.isDragging) {
                // $("#prev-frame").addClass("hidden");
                // $("#video").addClass("hidden");
            // }
        }

        function pipCancelClickHandler() {
            hidePip();
            Log.add("Highlight", "pipCancelClick", {"uid": $("#prev-frame").data("uid")});
        }

        function pipSmallerClickHandler() {
            $("#prev-frame").removeClass("pip-big").addClass("pip-small");
            $("#video").removeClass("pip-big").addClass("pip-small");
            Player.videoWidth = $("#video").width();
            Player.videoHeight = $("#video").width() * Player.videoOrgHeight / Player.videoOrgWidth;
            Player.updateVideoOverlay();
            Log.add("Highlight", "pipSmallerClick", {"uid": $("#prev-frame").data("uid")});
        }

        function pipBiggerClickHandler() {
            $("#prev-frame").removeClass("pip-small").addClass("pip-big");
            $("#video").removeClass("pip-small").addClass("pip-big");
            Player.videoWidth = $("#video").width();
            Player.videoHeight = $("#video").width() * Player.videoOrgHeight / Player.videoOrgWidth;
            Player.updateVideoOverlay();
            Log.add("Highlight", "pipBiggerClick", {"uid": $("#prev-frame").data("uid")});
        }

        function pipMouseenterHandler() {
            // $(this).addClass("brushing");
            var peak = Peak.getInteractionPeakByUID($(this).data("uid"));
            if (typeof peak !== "undefined")
                Timeline.addDatabarBrushing(peak);
            // find corresponding screenshot
            $(".screenshot.pinned").addClass("brushing");
        }

        function pipMouseleaveHandler() {
            // $(this).addClass("brushing");
            var peak = Peak.getInteractionPeakByUID($(this).data("uid"));
            if (typeof peak !== "undefined")
                Timeline.removeDatabarBrushing(peak);
            // find corresponding screenshot
            $(".screenshot.pinned").removeClass("brushing");
        }

        // function pinClickHandler(e) {
        //     var $screenshot = $(this).closest(".screenshot").find("img");
        //     console.log($screenshot.length);
        //     if ($screenshot.length === 1)
        //         displayPip($screenshot[0]);
        //     e.preventDefault();
        //     e.stopPropagation();
        // }

        function timelinePeakMouseenterHandler(){
            $(this).addClass("brushing");
            console.log($(this).data("uid"));
            // find corresponding screenshot
            $("#peak_" + $(this).data("uid")).addClass("brushing");
            if ($("#prev-frame").data("uid") == $(this).data("uid"))
                $("#prev-frame").addClass("brushing");
        }

        function timelinePeakMouseleaveHandler(){
            $(this).removeClass("brushing");
            // find corresponding screenshot
            $("#peak_" + $(this).data("uid")).removeClass("brushing");
            if ($("#prev-frame").data("uid") == $(this).data("uid"))
                $("#prev-frame").removeClass("brushing");
        }

        function timelinePeakClickHandler(){
            Player.seekTo($(this).data("start"));
            Log.add("Highlight", "timelinePeakClick", {"uid": $(this).data("uid")});
        }

        function getThumbnailUrl(curTime) {
            // var imgPath = '/static/djmodules/video_analytics/img/v_' +  video_id + '_' + curTime + '.jpg';
            // var imgPath = 'http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/img/v_' +  video_id + '_' + curTime + '.jpg';// console.log(curTime, imgPath);
            return mediaUrlPrefix + "thumbs/" + course + "/v_" + video_id + '_' + curTime + '.jpg';
        }

        function addBookmarkButtonClickHandler(){
            var curTime = parseInt(Player.getCurrentTime());
            var imgPath = getThumbnailUrl(curTime);
            // if (!$(this).is(":disabled")){
                // $(this).attr("disabled", "disabled");
            if ($("#bookmark-popup").is(":visible")) {
                hideBookmarkPanel();
            } else {
                $(this).data("curTime", curTime);
                $("<img/>").attr("src", imgPath).appendTo("#bookmark-thumbnail");
                $("#bookmark-popup").show();
                $("#bookmark-thumbnail").show();
                $("#bookmark-description").show();
                $("#bookmark-description").focus()
                $("#save-bookmark-button").show();
                $("#cancel-bookmark-button").show();
                $("#bookmark-time").text(formatSeconds(curTime)).show();
                Log.add("Highlight", "addBookmarkButtonClick", {"curTime": curTime});
            }
        }

        function saveBookmarkButtonClickHandler(){
            var curTime = $("#add-bookmark-button").data("curTime");
            var description = $("#bookmark-description").val();
            //peaks.push([curTime-2, curTime, curTime+2, 100, "You bookmarked it.", description]);
            var uid = Peak.getNewBookmarkUID();
            Peak.addBookmarkPeak({
                        "uid": uid,
                        "start": curTime - 2,
                        "top": curTime,
                        "end": curTime + 2,
                        "type": "bookmark",
                        "score": 100,
                        "label": description});
            displayPeaks();
            hideBookmarkPanel();
            Log.add("Highlight", "saveBookmarkButtonClick", {
                        "uid": uid,
                        "start": curTime - 2,
                        "top": curTime,
                        "end": curTime + 2,
                        "type": "bookmark",
                        "score": 100,
                        "label": description});
        }

        function cancelBookmarkButtonClickHandler(){
            hideBookmarkPanel();
            Log.add("Highlight", "cancelBookmarkButtonClick", {});
        }

        function updatePeaks(peaks, position){
            var threshold = 100 - position;
            var count = 0;
            for (var index in peaks){
                if (peaks[index]["score"] >= threshold){
                    $("#peak_" + peaks[index]["uid"]).show();
                    $("#timeline-peak-" + peaks[index]["uid"]).show();
                    count++;
                } else {
                    $("#peak_" + peaks[index]["uid"]).hide();
                    $("#timeline-peak-" + peaks[index]["uid"]).hide();
                }
            }
            $("#highlight-count").text(count);
            // console.log(count, Highlight.api);
            refreshScrollbar();
        }

        function displayPeaks(duration, visWidth){
            var peaks = getCurrentPeaks();
            console.log("PEAKS", peaks);
            $(".screenshot").remove();
            $("#timeline .timeline-peak").remove();
            peaks.sort(Peak.sortPeaksByTime);
            for (var index in peaks){
                var imgPath = getThumbnailUrl(peaks[index]["top"]);
                var displayClass = (peaks[index]["type"] == "interaction") ? "by-others" : "by-me";

                // Part 1. update sidebar
                var labelHTML = "";
                if (peaks[index]["label"] !== "") {
                    labelHTML = "<span class='screenshot-label'>"
                        + peaks[index]["label"]
                        + "</span>";
                }
                var $highlight = $("<div/>")
                    .attr("id", "peak_" + peaks[index]["uid"])
                    .attr("draggable", "true")
                    .data("uid", peaks[index]["uid"])
                    .data("second", peaks[index]["top"])
                    .data("start", peaks[index]["start"])
                    .data("end", peaks[index]["end"])
                    .data("score", peaks[index]["score"])
                    .data("label", peaks[index]["label"])
                    // .addClass("screenshot").html("<span class='tooltip'>" + peaks[index][4] + "</span><span>" + formatSeconds(peaks[index][1]) + " </span> <span class='summary'>" + peaks[index][5] + "</span><br/>" + "<img src='" + imgPath + "'>")
                    .addClass("screenshot " + displayClass)
                    .html("<span class='screenshot-pin'></span>"
                        + labelHTML
                        + "<img src='" + imgPath + "'>");
                // "<span class='screenshot-time'>"
                        // + formatSeconds(peaks[index]["top"])
                        // + "</span> "
                if (typeof Highlight.api !== "undefined") {
                    Highlight.api.getContentPane().append($highlight);
                } else {
                    $("#highlights").append($highlight);
                }

                // Part 2. update timeline
                //timeline - width of the peak div
                var xPos = peaks[index]["top"]/duration * 100 - 8*100 / visWidth;
                var $timelinePeak = $("<div/>")
                    .addClass("timeline-peak " + displayClass)
                    .attr("id", "timeline-peak-" + peaks[index]["uid"])
                    .data("uid", peaks[index]["uid"])
                    .data("second", peaks[index]["top"])
                    .data("start", peaks[index]["start"])
                    .data("end", peaks[index]["end"])
                    .data("score", peaks[index]["score"])
                    .data("label", peaks[index]["label"])
                    .css("left", xPos + "%")
                    .appendTo("#timeline");
                $("<span/>")
                    .addClass("tooltip")
                    .text("[" + formatSeconds(peaks[index]["top"]) + "] " + peaks[index]["label"])
                    .appendTo($timelinePeak);

            }
            updatePeaks(peaks, 0);
            updatePeakColor();
            // updateTimeline(0);
        }

        // color the rollercoaster graph
        function updatePeakColor() {
            if (!isInteractionShown())
                return;
            for (var index in Peak.interactionPeaks){
                var j;
                for (j = Peak.interactionPeaks[index]["start"]; j <= Peak.interactionPeaks[index]["end"]; j++) {
                    var $databar = $(".databar[data-second='" + j + "']")
                        .attr("class", "databar peak-databar");
                }
            }
        }

        return {
            init: init,
            // isPeak: isPeak,
            displayPeaks: displayPeaks,
            updateScreenshot: updateScreenshot,
            updatePip: updatePip,
            updatePeakColor: updatePeakColor,
            getThumbnailUrl: getThumbnailUrl,
            api: api
        }
    }(jQuery, window, document);

    /* PersonalTrace.js */


    // managing personal interaction traces
    var PersonalTrace = function ($, window, document) {
        var traces = []; // personal interaction traces
        // var isSegmentOn = false; // flag for keeping track of watching segments
        var tid = 1;    // trace count used as ID

        function init() {
            addTooltip();
            bindEvents();
        }

        function bindEvents() {
            $(document).on("click", ".trace", traceClickHandler);
            $(document).on("mouseover", ".trace", traceMouseoverHandler);
            $(document).on("mousemove", ".trace", traceMousemoveHandler);
            $(document).on("mouseout", ".trace", traceMouseoutHandler);
        }

        function addTooltip() {
            $("<div/>")
                .addClass("trace-tooltip tooltip")
                .appendTo("body");
        }

        function traceClickHandler() {
            Player.seekTo($(this).data("start"));
            Log.add("PersonalTrace", "traceClick", {"sid": $(this).data("sid")});
        }

        function traceMouseoverHandler(event) {
            $(".trace-tooltip")
                .css("top", (event.pageY-10) + "px")
                .css("left", (event.pageX+10) + "px")
                .text("[" + formatSeconds($(this).data("start")) + "-" + formatSeconds($(this).data("end")) + "] " + $(this).data("label"))
                .show();
        }

        function traceMousemoveHandler(event) {
            $(".trace-tooltip")
                .css("left", (event.pageX+10) + "px");
        }

        function traceMouseoutHandler() {
            $(".trace-tooltip").hide();
        }

        function addSegment() {
            var start;
            var end;
            var segStart;
            var segEnd;
            for (var i = 0; i < traces.length; i++) {
                if (!traces[i]["processed"] && traces[i]["type"] == "play"){
                    start = traces[i];
                    // if the last one, return because it's still waiting for end
                    if (i == traces.length - 1)
                        return;
                    end = traces[i + 1];
                    break;
                }
            }
            // console.log("TRACE", start, end, getTimeDiff(end["time"], start["time"]));
            start["processed"] = true;
            // add the segment to the timeline
            if (end["type"] == "pause") {
                // console.log("play-pause", start["vtime"], end["vtime"]);
                segStart = start["vtime"];
                segEnd = end["vtime"];
                end["processed"] = true;
            } else if (end["type"] == "play") {
                // console.log("play-play", start["vtime"], start["vtime"] + getTimeDiff(end["time"], start["time"]));
                segStart = start["vtime"];
                segEnd = start["vtime"] + getTimeDiff(end["time"], start["time"]);
            }
            display(segStart, segEnd, tid);
            tid += 1;
            // isSegmentOn = false;
        }

        function display(start, end, tid) {
            var xPos = start/duration * 100;
            var width = (end - start)/duration * 100;
            var $trace = $("<div/>")
                .addClass("trace")
                .attr("id", "trace-" + tid)
                .data("sid", tid)
                .data("start", start)
                .data("end", end)
                .data("label", "You watched this segment.")
                .css("left", xPos + "%")
                .css("width", width + "%")
                .appendTo("#timeline");
            Log.add("PersonalTrace", "traceAdded", {
                "sid": tid,
                "start": start,
                "end": end,
                "label": "You watched this segment."
            });
            // $("<span/>")
            //     .addClass("tooltip")
            //     .text("You watched this segment.")
            //     .appendTo($trace);

            // opacity change only when there are more than 3 traces
            for (var i = 3; i < tid; i++) {
                var curOpacity = $("#trace-" + (i - 2)).css("opacity");
                var newOpacity = curOpacity > 0.2 ? curOpacity - 0.2 : 0.2;
                $("#trace-" + (i - 2)).css("opacity", newOpacity);
            }
        }

        return {
            init: init,
            traces: traces,
            addSegment: addSegment,
            display: display
        }
    }(jQuery, window, document);

    /* Transcript.js */



    // load and process text transcript
    var Transcript = function ($, window, document) {
        var srt; // raw subtitle
        var subtitles = {}; // parsed, segmented subtitle object array
        var orderedTimeIndices = [];
        var api;
        var isScrollLocked = false;
        var scrollLockCount = 0;
        // run scrollTo() not every time, but only when above threshold.
        // this means it's running once every "threshold" times.
        var scrollTrigger = 0;
        var scrollThreshold = 3;
        function init(transcriptUrl) {
            $.ajax(transcriptUrl)
                .done(function (data) {
                    // console.log(data);
                    srt = data;
                    parseSRT();
                    bindEvents();
                    addScrollbar();

                })
                .fail(function () {
                    console.log("transcript load FAILED");
                })
                .always(function () {
                    // do nothing
                });
        }

        function bindEvents() {
            $(document).on("keyup", "input.search-bar", searchKeyupHandler);
            $(document).on("click", ".transcript-time", transcriptClickHandler);
            $(document).on("click", ".transcript-text", transcriptClickHandler);
            $(document).on("click", ".search-found", transcriptClickHandler);
            $(document).on("click", ".search-cancel", searchCancelClickHandler);
            // s.addEventListener('keydown', find , false);
            // s.addEventListener('keyup', searchHandler, false);
        }


        function addScrollbar() {
            setTimeout(function () {
                // delay in srt display cause premature scrollbar,
                // so wait a couple seconds until everything is ready.
                $('#transcript').jScrollPane({
                    animateScroll: true
                });
                api = $('#transcript').data('jsp');
                $("#transcript .jspPane").on("mousedown mousewheel", function () {
                    // console.log("pane moved");
                    isScrollLocked = true;
                    scrollLockCount = 0;
                });
                $("#transcript .jspVerticalBar").on("click mousewheel", function () {
                    // console.log("bar moved");
                    isScrollLocked = true;
                    scrollLockCount = 0;
                    // e.stopPropagation();
                    // return false;
                });
                setInterval(checkScroll, 3000);
            }, 500);
        }


        // unlock scroll if no scroll for 5 seconds && in current viewport
        function checkScroll() {
            if ($(".transcript-entry.current").length === 0)
                return;
            // offset: location of "current" in respect to transcript
            var offset = document.querySelector(".transcript-entry.current").getBoundingClientRect().top - document.querySelector("#transcript").getBoundingClientRect().top;
            // console.log("scrollCount", scrollLockCount, offset);
            // if within the current viewport, increment count
            if ($(".transcript-entry.current").length === 1
                && offset >= 0
                && offset < document.querySelector("#transcript").getBoundingClientRect().height) {
                scrollLockCount += 1;
                if (scrollLockCount >= 3) {
                    isScrollLocked = false;
                    scrollLockCount = 0;
                    // console.log("scroll start");
                }
            }
        }


        // scroll to given time
        function scrollTo(second) {
            if (typeof api === "undefined" ||
                $(".transcript-entry.current").length === 0 ||
                isScrollLocked) {
                return;
            }
            // console.log($(".transcript-entry.current"));
            // var sh = document.querySelector('.jspPane').scrollHeight;
            // $(".transcript-entry.current")
            //     .css("top", this.offsetTop * 100 / sh + "%");
            //     document.querySelector('.transcript-entry.current').offsetTop * 100 / sh + "%"
            api.scrollTo(0, document.querySelector('.transcript-entry.current').offsetTop - 200);
        }


        // highlight the current sentence
        function highlightSentence(second) {
            $(".transcript-entry.current").removeClass("current");
            var $target;
            var closestTime = -100;
            $(".transcript-entry").each(function() {
                var currentTime = parseFloat($(this).attr("data-second"));
                if (currentTime <= second && closestTime < currentTime) {
                    // console.log(second, "updating to", currentTime);
                    closestTime = currentTime;
                    $target = $(this);
                }
            });
            if (typeof $target !== "undefined")
                $target.addClass("current");
        }


        // see if the given text contains end of sentence markers.
        // . ! ? are valid EOS markers.
        // optionally, there can be quotes at the end
        function containsEOS(text) {
            return text.match(/[.!?]['\"]?/gi) !== null;
        }


        // for the given time in the transcript,
        // return the beginning timestamp of the current sentence.
        // Algorithm:
        // if first item in the transcript, return current
        // if not, recursively traverse up until end of sentence found (eos).
        //     return the immediate next one following eos
        function getSentenceStart(second) {
            var foundIndex = -1;
            var i;
            var index = orderedTimeIndices.indexOf(second);
            if (index === -1) {
                // not found
                return -1;
            } else if (index === 0) {
                // first item
                return 0;
            } else {
                // console.log("found", index);
                for (i = index - 1; i >= 0; i--) {
                    // console.log(i);
                    var curTime = orderedTimeIndices[i];
                    var text = subtitles[curTime].t;
                    if (containsEOS(text)) {
                        foundIndex = i;
                        break;
                    }
                }
                if (foundIndex === -1) {
                    return 0; // everything from the beginning
                } else {
                    // the one after the EOS is where the sentence begins.
                    // TODO: what if the transcript has EOS in the middle?
                    return foundIndex + 1;
                }
            }
        }

        // for the given time in the transcript,
        // return the end timestamp of the current sentence.
        // Algorithm:
        // if current one has EOS, return current
        // if not, recursively traverse down until EOS found.
        //     return the one with eos
        function getSentenceEnd(second) {
            var foundIndex = -1;
            var i;
            var index = orderedTimeIndices.indexOf(second);
            if (index === -1) {
                // not found
                return -1;
            } else {
                for (i = index; i < orderedTimeIndices.length; i++) {
                    // console.log(i);
                    var curTime = orderedTimeIndices[i];
                    var text = subtitles[curTime].t;
                    if (containsEOS(text)) {
                        foundIndex = i;
                        break;
                    }
                }
                if (1 === orderedTimeIndices.length) {
                    return orderedTimeIndices.length - 1; // last one
                } else {
                    // TODO: what if the transcript has EOS in the middle?
                    return foundIndex;
                }
            }
        }


        // for the given time in the transcript,
        // return the sentence range including that moment.
        // return format: {"start": second, "end": second, "text": full_sentence_text_concatenated}
        //
        //
        function getSentenceBoundary(second) {
            var start;
            var end;
            var text = "";
            var i;
            // TODO: do something smarter
            if (second in subtitles) {
                start = subtitles[second].i;
                end = subtitles[second].o;
                text = subtitles[second].t;
            }
            return {"start": start, "end": end, "text": text};
        }

        function update(second) {
            highlightSentence(second);
            // console.log(scrollTrigger);
            scrollTrigger += 1;
            if (scrollTrigger % scrollThreshold === 0) {
                scrollTrigger = 0;
                scrollTo(second);
            }
        }


        function searchCancelClickHandler() {
            var s = document.querySelector('input.search-bar');
            $(".timeline-peak").remove();
            $(".search-tick").remove();
            $(".timeline-result").remove();
            $(".search-summary").text("");
            $(".search-found").each(function () {
                $(this).replaceWith($(this).text());
            });
            s.value = "";
            // back to the original graph
            // $("#vis-options a").eq(6).trigger("click");
            Timeline.drawPlayVis(data["play_kde"], duration);
            Highlight.updatePeakColor();
            Highlight.displayPeaks(peaks);
            $(".search-cancel").addClass("hide");
            Peak.searchPeaks = [];
            Log.add("Transcript", "searchCancelClick", {});
        }

        // add Gaussian and convolution to the timeline
        function formatSearchData(timemarks, term) {
            var searchData = [];
            // console.log(timemarks);
            var i;
            for(i = 0; i < duration; i++) {
                searchData[i] = 100;
            }

            // detect sentence boundaries
            // TODO: error checking
            var curTime;
            var foundStartIndex;
            var foundEndIndex;
            var foundStartTime;
            var foundEndTime;
            var foundStartTimeInt;
            var foundEndTimeInt;
            var foundTopTimeInt;
            var searchPeakObj;
            Peak.searchPeaks = [];
            for (i in timemarks) {
                curTime = timemarks[i];
                foundStartIndex = getSentenceStart(curTime);
                if (foundStartIndex === -1)
                    continue;
                foundEndIndex = getSentenceEnd(curTime);
                if (foundEndIndex === -1)
                    continue;
                foundStartTime = orderedTimeIndices[foundStartIndex];
                if (!(foundStartTime in subtitles))
                    continue;
                foundEndTime = orderedTimeIndices[foundEndIndex];

                // add distribution
                var foundStartTimeInt = parseInt(subtitles[foundStartTime].i);
                var foundEndTimeInt = parseInt(subtitles[foundEndTime].o);
                var foundTopTimeInt = parseInt(timemarks[i]);
                // console.log(foundStartTimeInt, foundTopTimeInt, foundEndTimeInt, timemarks[i], parseFloat(timemarks[i]));

                // add interaction data
                var interactionScoreArray = [];
                for (var j = foundStartTimeInt; j <= foundEndTimeInt; j++) {
                    interactionScoreArray.push(data.play_counts[j]);
                }
                var interactionScore = Math.max.apply( Math, interactionScoreArray ) * 1.5;
                // console.log(foundStartTimeInt, foundEndTimeInt, interactionScoreArray.length, interactionScore);

                // construct a full sentence
                var sentence = "";
                // console.log(foundStartTime, foundEndTime, subtitles[foundStartTime]);
                for (var j = foundStartIndex; j <= foundEndIndex; j++) {
                    var time = orderedTimeIndices[j];
                    if (j !== foundStartIndex)
                        sentence += " " + subtitles[time].t;
                    else
                        sentence += subtitles[time].t;
                }

                var words = sentence.split(/\s+/),
                    wordsLength = words.length,
                    word = '';
                // console.log(j, p[j].innerText, p[j].innerText.split(/\s+/), words.length);
                while(--wordsLength >= 0) {
                    word = words[wordsLength];
                    // if(word.toLowerCase() == s.value.toLowerCase()) {
                    // partial matching support
                    // console.log(term, word.toLowerCase(), term.indexOf(word.toLowerCase()));
                    if(word.toLowerCase().indexOf(term) !== -1) {
                        words[wordsLength] = "<span class='search-found'>" + word + "</span>";
                    }
                }
                sentence = words.join(' ');
                // console.log(sentence);

                // uphill
                var unit = 0;
                for (var j = foundStartTimeInt; j <= foundTopTimeInt; j++) {
                    if (foundTopTimeInt === foundStartTimeInt)
                        unit = interactionScore;
                    else
                        unit = interactionScore / (foundTopTimeInt - foundStartTimeInt);
                    searchData[j] += unit * (j - foundStartTimeInt + 1);
                }
                // downhill
                for (var j = foundTopTimeInt + 1; j <= foundEndTimeInt; j++) {
                    // if (foundTopTimeInt === foundEndTimeInt)
                    //     unit = 0;
                    // else
                    unit = interactionScore / (foundEndTimeInt - foundTopTimeInt);
                    searchData[j] += unit * (foundEndTimeInt - j + 1);
                }

                searchPeakObj = {
                    // "start": foundStartTimeInt,
                    // "end": foundEndTimeInt,
                    // "top": foundTopTimeInt,
                    "start": subtitles[foundStartTime].i,
                    "end": subtitles[foundEndTime].o,
                    "top": timemarks[i],
                    "type": "search",
                    "label": sentence, //term,
                    "score": interactionScore
                }
                Peak.searchPeaks.push(searchPeakObj);
                // console.log(searchPeakObj);
            }
            // Warning: these two lines should not be apart from Peak.searchPeaks.push
            // since UID might get messed up. We're batch-assigning IDs.
            Peak.searchPeaks.sort(Peak.sortPeaksByTime);
            Peak.assignSearchUID();
            // console.log(searchData);
            return searchData;
        }


        function searchKeyupHandler(e) {
            var s = document.querySelector('input.search-bar');
            var p = document.querySelectorAll('.transcript-text');
            var count = 0;
            var term = s.value.toLowerCase();
            var timemarks = [];
            $(".timeline-peak").remove();
            $(".search-tick").remove();
            $(".timeline-result").remove();
            $(".search-summary").text("");
            $(".search-found").each(function () {
                $(this).replaceWith($(this).text());
            });

            // if esc key is pressed, cancel search
            if (e.keyCode == 27) {
                s.value = "";
                term = "";
            }
            // if the search query is empty, return to the interaction peaks
            if (term.length == 0) {
                searchCancelClickHandler();
                // console.log("search over");
                // // back to the original graph
                // $("#vis-options a").eq(6).trigger("click");
                // Highlight.displayPeaks(peaks);
                // $(".search-cancel").addClass("hide");
                return;
            }
            $(".search-cancel").removeClass("hide");
            // search starts only for queries longer than 3 characters
            if (term.length < 3)
                return;
            // loop through each p and run the code below.
            var j = p.length;
            while (--j >= 0) {
                // console.log(j);
                var words = p[j].innerText.split(/\s+/),
                    i = words.length,
                    word = '';
                // console.log(j, p[j].innerText, p[j].innerText.split(/\s+/), words.length);
                while(--i >= 0) {
                    // console.log(i);
                    word = words[i];
                    // if(word.toLowerCase() == s.value.toLowerCase()) {
                    // partial matching support
                    // console.log(term, word.toLowerCase(), term.indexOf(word.toLowerCase()));
                    if(word.toLowerCase().indexOf(term) !== -1) {
                        count++;
                        words[i] = "<span class='search-found'>" + word + "</span>";
                        var second = $(p[j]).closest(".transcript-entry").attr("data-second");
                        // timemarks.push(parseInt(second));
                        timemarks.push(second);
                    }
                    // else{
                    // }
                }
                p[j].innerHTML = words.join(' ');
            }

            // current view height
            // var oh = $("#transcript").height();
            // var oh = document.querySelector('#transcript').offsetHeight;
            // entire div height
            var sh = document.querySelector('#transcript .jspContainer .jspPane').scrollHeight;
            // var scrollRatio =  oh / sh;
            // scroll bar height
            // var bh = scrollRatio * oh;
            // console.log("sh", sh, "oh", oh, "bh", bh);
            // var actualScrollHeight = oh - bh;
            var transcriptTop = $(".jspContainer").position().top;
            $(".search-found").each(function () {
                // console.log(this.offsetTop, (this.offsetTop - transcriptTop));
                $("<span class='search-tick'></span>")
                    // .css("top", (this.offsetTop - transcriptTop) * scrollRatio)
                    // .css("top", (this.offsetTop - transcriptTop) * 100 / sh + "%")
                    .css("top", this.offsetTop * 100 / sh + "%")
                    .appendTo("#transcript .jspVerticalBar");
                    // .appendTo("#transcript-scroll");
                // var scrollTopPosition = $(this).position().top * scrollRatio;
                // document.querySelector("html").scrollHeight
                // document.querySelector("html").clientHeight
            });

            var searchData = formatSearchData(timemarks, term);
            Timeline.drawPlayVis(searchData, duration);

            // add ticks to the timeline
            for (var i in Peak.searchPeaks) {
                var peak = Peak.searchPeaks[i];
                var xPos = parseInt(peak["top"]) / duration * 100 - 8 * 100 / visWidth;
                var $timelinePeak = $("<div/>")
                    .addClass("timeline-result by-search")
                    .attr("id", "timeline-search-" + peak["uid"]) // id cannot have periods in the middle
                    .data("uid", peak["uid"])
                    .data("second", peak["top"])
                    .data("start", peak["start"])
                    .data("end", peak["end"])
                    .data("score", peak["score"])
                    .data("label", peak["label"])
                    .css("left", xPos + "%")
                    .appendTo("#timeline");

                $("<span/>")
                    .addClass("tooltip")
                    .html("[" + formatSeconds(peak["top"]) + "] " + peak["label"])
                    .appendTo($timelinePeak);
            }

            $(".search-summary").text(count + " results found on ");
            Log.add("Transcript", "searchKeyup", {"term": term, "count": count});
        }


        function transcriptClickHandler() {
            var second = $(this).closest(".transcript-entry").attr("data-second");
            Log.add("Transcript", "transcriptClick", {"time": second});
            Player.seekTo(second);
        }


        function toSeconds(t) {
            var s = 0.0;
            if(t) {
                var p = t.split(':');
                var i;
                for(i=0;i<p.length;i++)
                    s = s * 60 + parseFloat(p[i].replace(',', '.'));
                    s = s.toFixed(2);
            }
            return s;
        }

        function strip(s) {
            return s.replace(/^\s+|\s+$/g,"");
        }
        function parseSRT() {
            // http://v2v.cc/~j/jquery.srt/jquery.srt.js
            // var videoId = subtitleElement.attr('data-video');
            // var srt = subtitleElement.text();
            // subtitleElement.text('');
            srt = srt.replace(/\r\n|\r|\n/g, '\n');
            // console.log(srt);
            // var subtitles = {};
            srt = strip(srt);
            // console.log(srt);
            var srt_ = srt.split('\n\n');
            var s, n, i, o, t, j, is, os;
            for (s in srt_) {
                var st = srt_[s].split('\n');
                if(st.length >= 2) {
                    // console.log(st);
                    n = st[0];
                    i = strip(st[1].split(' --> ')[0]);
                    o = strip(st[1].split(' --> ')[1]);
                    t = st[2];
                    if(st.length > 2) {
                        for(j=3; j<st.length;j++)
                              t += '\n'+st[j];
                    }
                    if (typeof t === "undefined")
                        continue;
                    is = toSeconds(i);
                    os = toSeconds(o);
                    subtitles[is] = {i:is, o: os, t: t};
                    orderedTimeIndices.push(is);
                    $("#transcript").append("<div class='transcript-entry' data-second='" + is + "'><span class='transcript-time'>" + formatSeconds(is) + "</span>" + "<span class='transcript-text'>" + t + "</span></div>");
                }
            }

            orderedTimeIndices.sort(function(a,b) { return a - b;});
            // console.log(subtitles);
            // console.log(orderedTimeIndices);
            // var currentSubtitle = -1;
            // var ival = setInterval(function () {
            //   var currentTime = document.getElementById(videoId).currentTime;
            //   var subtitle = -1;
            //   for(s in subtitles) {
            //     if(s > currentTime)
            //       break
            //     subtitle = s;
            //   }
            //   if(subtitle > 0) {
            //     if(subtitle != currentSubtitle) {
            //       subtitleElement.html(subtitles[subtitle].t);
            //       currentSubtitle=subtitle;
            //     } else if(subtitles[subtitle].o < currentTime) {
            //       subtitleElement.html('');
            //     }
            //   }
            // }, 100);
        }

        return {
            init: init,
            scrollTo: scrollTo,
            highlightSentence: highlightSentence,
            getSentenceBoundary: getSentenceBoundary,
            update: update
        }
    }(jQuery, window, document);

    /* TopicFlow.js */



    // Topicflow at the top of the video player
    var Topicflow = function ($, window, document) {
    /*
        var topics = [
            {"start": 0, "end": 30, "keywords":[
                {"label": "function", "importance": "high"},
                {"label": "computation", "importance": "medium"},
                {"label": "primitive", "importance": "low"}
                ]
            },
            {"start": 31, "end": 60, "keywords":[
                {"label": "loop", "importance": "high"},
                {"label": "construct", "importance": "high"},
                {"label": "bit", "importance": "low"}
                ]
            },
            {"start": 61, "end": 150, "keywords":[
                {"label": "iterate", "importance": "high"},
                {"label": "variable", "importance": "medium"},
                {"label": "state", "importance": "medium"}
                ]
            },
            {"start": 151, "end": 305, "keywords":[
                {"label": "result", "importance": "high"},
                {"label": "variable", "importance": "high"},
                {"label": "initialization", "importance": "low"}
                ]
            }
        ];
    */
        var topics = [];
        var currentTopic;
        var currentIndex = -1;

        function init(course, video_id) {
            loadTopics(course, video_id);
            bindEvents();
        }

        function bindEvents() {
            $(document).on("click", "#video-top .topic", topicClickHandler);
        }

        function topicClickHandler() {
            var clickedTopic = $(this).text();
            $("input.search-bar").val(clickedTopic).trigger("keyup");
            Log.add("Topicflow", "topicClick", {"topic": clickedTopic});
        }

        function loadTopics(course, video_id) {
            var course_name = course + "-Fall-2012";
            var segtype = gup("segtype") || "peakBoundary";
            var maxwords = parseInt(gup("maxwords")) || 4;
            console.log(course_name, segtype, maxwords);
            $.post("/app/keywords/",
              {
                videoid: video_id, //"--7OF8BOElA",
                courseid: course_name,
                segtype: segtype,
                maxwords: maxwords,
              }, function(data) {
                // console.log(data);
                topics = $.parseJSON(data);
                // for (var i=0; i<topics.length; i++)
                //     console.log(topics[i]);
              }
            );
        }
        // var topics;

        var weights = {
            0: 2,
            1: 1,
            2: 0.8,
            3: 0.5,
            4: 0.2
        };

        function update(prev, curr, next) {
            // console.log("UPDATE");
            visualize("#prev-topic", prev,  250, 0.5, 0.6);
            visualize("#current-topic", curr,  300, 1, 1);
            visualize("#next-topic", next,  250, 0.5, 0.6);
        }

        function visualize(div, wordweights, wid, opacity, sizefactor){
            var bod = d3.select(div);
            var fill = d3.scale.category20();

            d3.layout.cloud().size([200,80])
              .words(wordweights.map(function(kw, i) {
                return {text: kw["label"], size: kw["importance"] * 20 * sizefactor };
              }))
              .padding(5)
              .rotate(function() { return  0; })
              // .font("Impact")
              .fontSize(function(d) { return d.size; })
              .on("end", draw)
              .start();

            function draw(words) {
                bod.select("svg").remove();

                var width = wid;
                var height = 80;
                var xtranslate = width/2.0;
                var ytranslate = height/2.0;

                bod.append("svg")
                    .attr("width", width)
                    .attr("height", height)
                  .append("g")
                    .attr("transform", "translate(" + xtranslate + "," + ytranslate+")")
                    .style("fill-opacity", opacity)
                  .selectAll("text")
                    .data(words)
                  .enter().append("text")
                    .style("font-size", function(d) { return d.size + "px"; })
                    .style("font-family", "Impact")
                    .style("fill", function(d, i) { return fill(i); })
                    .attr("text-anchor", "middle")
                    .attr("class", "topic")
                    .attr("transform", function(d) {
                      return "translate(" + [d.x , d.y] + ")rotate(" + d.rotate + ")";
                    })
                    .text(function(d) { return d.text; });
            }
        }


        function displayTopics(currentTime) {
            var i;
            var currentTimeMS = currentTime * 1000;
            for (i = 0; i < topics.length; i++) {
                // console.log(i, topics.length, currentTimeMS, topics[i], topics[i]["keywords"]);
                if (currentTimeMS >= topics[i]["start"] && currentTimeMS <= topics[i]["end"]) {
                    Topicflow.currentTopic = topics[i];
                    // console.log(i, i+1, i==0, topics[i+1]);
                    if (i == 0)
                        update([], topics[i]["keywords"], topics[i+1]["keywords"]);
                    else if (i == topics.length - 1)
                        update(topics[i-1]["keywords"], topics[i]["keywords"], []);
                    else
                        update(topics[i-1]["keywords"], topics[i]["keywords"], topics[i+1]["keywords"]);
                }
            }

        }

        function displayTopicsOld(currentTime){
            var i, j;
            var $topic;
            $("#current-topic").empty();
            for (i in topics){
                if (currentTime >= topics[i]["start"] && currentTime <= topics[i]["end"]){
                    Topicflow.currentTopic = topics[i];
                    // console.log("topic match", Topicflow.currentTopic);
                    for (j in Topicflow.currentTopic["keywords"]){
                        $topic = $("<span>").text(Topicflow.currentTopic["keywords"][j]["label"]).addClass("topic " + Topicflow.currentTopic["keywords"][j]["importance"]);
                        $("#current-topic").append($topic);
                        // console.log("adding", Topicflow.currentTopic["keywords"][j]["label"]);
                    }
                }
            }
        }

        return {
            init: init,
            currentTopic: currentTopic,
            displayTopics: displayTopics
        };
    }(jQuery, window, document);

    /* Log.js */



    // Adding user interaction event logs
    var Log = function ($, window, document) {

        // pid: participant ID. serves as a unique session ID.
        // tid: task ID. serves as a unique task ID. N tasks in a session.
        // torder: task order in a session. starts from 1 and increments for each session.
        // ttype: task type. "vs": visual search, "ps": problem search, "sk": skimming
        // iid: interface ID. "con": control interface, "exp": experimental interface
        var conditions = {
            // "1": {
            //     "pid": 1,
            //     "tid": 1,
            //     "torder": 1,
            //     "ttype": "vs",
            //     "iid": "con"
            // },
            // "2": {
            //     "pid": 1,
            //     "tid": 2,
            //     "torder": 2,
            //     "ttype": "vs",
            //     "iid": "exp"
            // }
        };

        var part1QuestionnaireUrl = "https://docs.google.com/forms/d/1uWVFJBh6N35B9xAHir6dx876VmZKtit-wXmz16JZOgA/viewform";
        var part2QuestionnaireUrl = "https://docs.google.com/forms/d/169_1Fr2k1-I43xst9bSr0t6yO7NU0-ZqouixhslJzPA/viewform";
        var part3QuestionnaireUrl = "https://docs.google.com/forms/d/14i1J6WG85WTBhvV5gMD6gd5L_NqVnXn2H3lhe3sebss/viewform";
        var post1QuestionnaireUrl = "https://docs.google.com/forms/d/15xbuacqp3fFZukpqquObm7al8UzyKuRvlNbsBnj-Ots/viewform";
        var post2QuestionnaireUrl = "https://docs.google.com/forms/d/12aDI2Z2PqXJKR6omCUhnyt5aRSvMeaI8HAXSUBDh3lo/viewform";
        //"http://localhost:5555/app/player/6.00x/aTuYZqhEvuk/?iid=con&tid=0&torder=0&ttype=tutorial";
        //var tutorialExpUrl = "http://localhost:5555/app/player/6.00x/aTuYZqhEvuk/?iid=exp&tid=0&torder=0&ttype=tutorial";
        var tutorialCon = {
                        "tid": 0,
                        "torder": 0,
                        "ttype": "tu",
                        "iid": "con",
                        "vcode": "A",
                        "vid": "aTuYZqhEvuk"
        }
        var tutorialExp = {
                        "tid": 0,
                        "torder": 0,
                        "ttype": "tu",
                        "iid": "exp",
                        "vcode": "A",
                        "vid": "aTuYZqhEvuk"
        }

        var numParticipants = 12;
        var numTasks = 8;
        var tseq = ["vs", "vs", "vs", "vs", "ps", "ps", "sk", "sk"];
        var itype1 = ["con", "exp", "con", "exp", "con", "exp", "con", "exp"];
        var itype2 = ["exp", "con", "exp", "con", "exp", "con", "exp", "con"];

        var vsMapping1 = ["A", "C", "D", "B", "A", "B", "A", "B"];
        var vsMapping2 = ["C", "A", "B", "D", "A", "B", "A", "B"];
        // video IDs to use for tasks.
        var videos = {
            "vs": {"A": "FMGal3lXcjw", "B": "d-SBFpxf8Bk", "C": "jq7Sujh5uDA", "D": "mylsICZfBpo"},
            "ps": {"A": "pGd3WqZK4Cg", "B": "Zoy7t4LbAPY"},
            "sk": {"A": "qic9_yRWj5U", "B": "lTnTlmM33dA"}
        };
        // var vsVideos = {"A": "FMGal3lXcjw", "B": "d-SBFpxf8Bk", "C": "jq7Sujh5uDA", "D": "mylsICZfBpo"};
        // var psVideos = {"A": "pGd3WqZK4Cg", "B": "Zoy7t4LbAPY"};
        // var skVideos = {"A": "qic9_yRWj5U", "B": "lTnTlmM33dA"};

        function createTasks() {
            // var ttype = ["vs", "ps", "sk"];
            var i, j, itype, vtype, taskOrder;
            var taskCount = 0;
            for (i = 1; i <= numParticipants; i++) {
                // console.log("Participant", i);
                if (i % 2 == 1)
                    itype = itype1;
                else
                    itype = itype2;
                if (i % 4 == 1 || i % 4 == 2)
                    vtype = vsMapping1;
                else
                    vtype = vsMapping2;
                for (j = 0; j < numTasks; j++) {
                    taskCount += 1;
                    // taskOrder = taskCount % tseq.length;
                    Log.conditions[taskCount] = {
                        "pid": i,
                        "tid": taskCount,
                        "torder": j + 1,
                        "ttype": tseq[j],
                        "iid": itype[j],
                        "vcode": vtype[j],
                        "vid": Log.videos[tseq[j]][vtype[j]]
                    }
                }
            }
            console.log(taskCount, "tasks created");
            // console.log(Log.conditions);
            for (var cond in Log.conditions) {
                console.log("pid:", Log.conditions[cond].pid, "tid:", Log.conditions[cond].tid, "torder:", Log.conditions[cond].torder, "ttype:", Log.conditions[cond].ttype, "iid:", Log.conditions[cond].iid, "vcode", Log.conditions[cond].vcode, "vid:", Log.conditions[cond].vid);
            }
        }


        function add(module, action, message) {
            var pid = typeof params !== "undefined" && params["pid"] !== null ? params["pid"] : "test";
            var tid = typeof params !== "undefined" && params["tid"] !== null ? params["tid"] : 0;
            var newParams = typeof params === "undefined" ? {} : params;
            var vewVideoID = typeof video_id === "undefined" ? "" : video_id;
            $.ajax({
                type: "POST",
                url: "/app/log-ajax/",
                data: {
                    csrfmiddlewaretoken: document.getElementsByName('csrfmiddlewaretoken')[0].value,
                    pid: pid,
                    tid: tid,
                    module: module,
                    action: action,
                    message: JSON.stringify(message),
                    params: JSON.stringify(newParams),
                    video: vewVideoID
                },
            }).done(function(data){
                // console.log("add-log done");
            }).fail(function(){
                console.log("add-log failed");
            }).always(function(){
            });
        }

        return {
            conditions: conditions,
            tutorialCon: tutorialCon,
            tutorialExp: tutorialExp,
            part1QuestionnaireUrl: part1QuestionnaireUrl,
            part2QuestionnaireUrl: part2QuestionnaireUrl,
            part3QuestionnaireUrl: part3QuestionnaireUrl,
            post1QuestionnaireUrl: post1QuestionnaireUrl,
            post2QuestionnaireUrl: post2QuestionnaireUrl,
            videos: videos,
            createTasks: createTasks,
            add: add
        };
    }(jQuery, window, document);

    /* script.js */



    /* Add event handlers for tab menu and visualization options */
    function bindEvents() {

        $(document).on("click", ".nav .list", function(){
            console.log("MULTI-VIDEO MODE");
            Player.pause();
            $(".nav .prev").hide();
            $(".nav .next").hide();
            $("#timeline").css("width", "100px");
        });

        $(document).on("click", ".done-button", function() {
            console.log("DONE with the task");
            Player.pause();
            $("<div/>")
                .addClass("done-tooltip tooltip")
                .text("Thank you. Please close this window now.")
                .css("top", (event.pageY-10) + "px")
                .css("left", (event.pageX+20) + "px")
                .appendTo("body")
                .show();
            Log.add("script.js", "doneButtonClick", {"curTime": Player.getCurrentTime()});
        });


        // $("#tabs .tab-item").click(function () {
        //     if ($(this).hasClass("active")) {
        //         return;
        //     }
        //     $(".tab-item").removeClass("active");
        //     $(this).addClass("active");
        //     $("section").hide();
        //     if ($(this).attr("data-mode") === "summary"){
        //         $("#stats").show();
        //         $("#speed").show();
        //     } else if ($(this).attr("data-mode") === "heatmap"){
        //         $("#play-vis").show();
        //     } else if ($(this).attr("data-mode") === "views"){
        //         $("#time-vis").show();
        //     }
        //     return false;
        // });
    /*
        $("#vis-options a").click(function () {
            // console.log($(this).text(), "clicked");
            $("#vis-options a").removeClass("active");
            $(this).addClass("active");
            var mode = $(this).attr("data-mode");
            // var processedData = processData(data, mode, binSize, duration);
            var processedData = data[mode];
            // filter out initial play events because they are mandatory
            if (mode === "play_counts")
                processedData[0] = 0;
            // filter out final pause events because they are mandatory
            if (mode === "pause_counts"){
                processedData[0] = 0;
                processedData[processedData.length-1] = 0;
            }
            // console.log(mode, processedData);
            Timeline.drawPlayVis(processedData, duration);
            Highlight.updatePeakColor();

            // processedData = data["daily_view_counts"];
            // Timeline.drawTimeVis(processedData);

            // redrawVis(chart, processedData, duration, visWidth, visHeight);
            return false;
        });
    */
        bindSortableTableEvents();
    }

    /* Display summary stats */
    function displayStats(){
        $(".views .stat").text(data["view_count"]);
        var num_users = data["unique_student_count"];
        $(".unique-views .stat").text(num_users);
        // $(".unique-views .substat").text("x% of total enrolled");
        $(".complete-count .stat").text(data["completion_count"]);
        $(".complete-count .substat").text("completion rate: " + (data["completion_count"]*100/num_users).toFixed(1) + "%");
        // $(".replay-count").text(getObjectSize(replay_users) +
        //     " (" + (getObjectSize(replay_users)*100/num_users).toFixed(1) + "% of all viewers)");
        // $(".skip-count").text(getObjectSize(skip_users) +
        //     " (" + (getObjectSize(skip_users)*100/num_users).toFixed(1) + "% of all viewers)");
        $(".views-per-student .stat").text((data["view_count"] / num_users).toFixed(2));
        $(".watching-time .stat").text(formatSeconds(data["total_watching_time"] / num_users));
        $(".watching-time .substat").text("video length: " + formatSeconds(duration));
    }

    /*
    function displayPlayRates(){
        var total_playrate_counts = 0;
        var sorted_playrate_counts = [];
        for (var rate in data["playrate_counts"]){
            total_playrate_counts += data["playrate_counts"][rate];
            // replace _ with . in the speed display because Mongo doesn't allow . in the key
            if (rate != "")
                sorted_playrate_counts.push([rate.replace("_", ".") + "x", data["playrate_counts"][rate]]);
            else
                sorted_playrate_counts.push(["1.0x", data["playrate_counts"][rate]]);
        }
        sorted_playrate_counts.sort(function(a, b){
            return b[1] - a[1];
        });
        $.each(sorted_playrate_counts, function(){
            var $row = $("<tr/>");
            $("<td/>").text(this[0]).appendTo($row);
            $("<td/>").text(this[1]).appendTo($row);
            var percentage = (100.0 * this[1] / total_playrate_counts).toFixed(2);
            var $bar = $("<span/>").addClass("speed-bar").width(percentage + "%");
            $("<td/>").append($bar).append(percentage + "%").appendTo($row);
            $row.appendTo($("#speed-table"));
        });
    }
    */

    /* display video title */
    function displayTitle(){
        for (var index in videos){
            if (video_id == videos[index]["video_id"])
                $(".video-title").text(videos[index]["video_name"]);
        }
    }


    /* get duration information from the videos data */
    function getDuration(video_id){
        var value = 0;
        for (var index in videos){
            if (video_id == videos[index]["video_id"])
                value = videos[index]["duration"];
        }
        return value;
    }


    /* Add prev and next links in the nav bar */
    function displayNav(){
        for (var index in videos){
            if (video_id == videos[index]["video_id"]){
                var prev_index = 0;
                var int_index = parseInt(index, 10);
                if (int_index === 0)
                    prev_index = videos.length - 1;
                else
                    prev_index = int_index - 1;
                $(".nav .prev a").attr("href", "video_single?vid=" + videos[prev_index]["video_id"]);
                var next_index = 0;
                if (index == videos.length - 1)
                    next_index = 0;
                else
                    next_index = parseInt(index, 10) + 1;
                $(".nav .next a").attr("href", "video_single?vid=" + videos[next_index]["video_id"]);

            }
        }
    }

    /* Init routine that adds event handlers, displays info, and sets initial options */
    function init(){
        bindEvents();
        displayTitle();
        displayNav();
        // displayStats();
        // displayPlayRates();

        // by default, click the first item
        // $("#tabs a").first().trigger("click");
        // tab click is replaced
        $("#play-vis").show();

        // $("#vis-options a").first().trigger("click");
        // $("#vis-options a").eq(6).trigger("click");
        // $("#vis-options").hide();
        // var processedData = data["play_kde"];
        Timeline.drawPlayVis(data["play_kde"], duration);
        Highlight.updatePeakColor();

        // $("#speed-table th").first().trigger("click");
        //displayPeaks(peaks);

        if (params["iid"] == "con") {
            $("#seek-bar").show();
            $("#video-top").hide();
            $("#add-bookmark-button").hide();
            $("#timeline").hide();
            $("#bottompane").hide();
        }

        if (params["ttype"] == "vs") {
            $("#add-bookmark-button").hide();
            $("#rightpane").hide();
            $("#bottompane").hide();
            $(".search-bar").hide();
            $(".search-button").hide();
            $(".search-summary").hide();
        }
    }

    function multiInit(){
        bindEvents();
        // displayTitle(video_id);
        // displayNav(video_id);
        // displayStats();
        // displayPlayRates();

        // by default, click the first item
        // $("#tabs a").first().trigger("click");
        // tab click is replaced
        $("#play-vis").show();

        // $("#vis-options a").first().trigger("click");
        // $("#vis-options a").eq(6).trigger("click");
        // $("#vis-options").hide();
        var processedData = data["play_kde"];
        console.log(processedData.length);
        Timeline.drawPlayVis(processedData, duration);
        Highlight.updatePeakColor();

        // $("#speed-table th").first().trigger("click");
        //displayPeaks(peaks);
    }

    /* Final.js */

    var chart;
    var player;
    var options = {};
    var duration = 0;
    var visWidth = 860; //540;
    var visHeight = 70; // 80
    // var mediaUrlPrefix = "http://juhokim.com/edxanalytics/";
    //"M-600X-FA12-L5-1_100-aTuYZqhEvuk.mp4";
    // var videoUrl = "https://s3.amazonaws.com/edx-course-videos/mit-3091x/M-3091X-FA12-L22-2_100.mp4";
    // var videoUrl = "https://s3.amazonaws.com/edx-course-videos/mit-600x/M-600X-FA12-L5-1_100.mp4"
    // var transcriptUrl = "http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/videos/6.00x/M-600X-FA12-L5-1_100-aTuYZqhEvuk.en.srt";
    // var videoUrl = "http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/videos/6.00x/M-600X-FA12-L21-3_100-kbrZtHI5CSo.mp4";
    // var transcriptUrl = "http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/videos/6.00x/M-600X-FA12-L21-3_100-kbrZtHI5CSo.en.srt";

    var data = JSON.parse(runtime_data.data)
    var vtran_data = runtime_data.vtran_data;
    var vtran_peaks = runtime_data.vtran_peaks;
    var videos = JSON.parse(runtime_data.videos);
    var peaks = runtime_data.peaks;
    var mediaUrlPrefix = runtime_data.mediaUrl;
    var course = runtime_data.course;
    var video_id = runtime_data.video_id;
    var videoUrl = runtime_data.videoUrl;
    var transcriptUrl = runtime_data.transcriptUrl;
    var i;

    // Detect control condition
    var params = {};
    params["iid"] = gup("iid");
    params["pid"] = gup("pid");
    params["tid"] = gup("tid");
    params["torder"] = gup("torder");
    params["ttype"] = gup("ttype");
    params["vcode"] = gup("vcode");
    console.log(params);
    // for (i in videos) {
    //     console.log(videos[i].week_number, videos[i].sequence_number, videos[i].module_index,
    //         "http://localhost:5555/app/player/" + course + "/" + videos[i].video_id, videos[i].video_name.substr(videos[i].video_name.lastIndexOf("-")+1));
    // }

    // remove first 3% of data to prevent from overwhelming the graph
    var anchorVal = parseInt(data["duration"] * 0.03);
    for (i = 0; i < data["duration"] * 0.03; i++) {
        data["play_kde"][i] = data["play_kde"][anchorVal];
    }

    data["play_kde"] = normalizeData(data["play_kde"]);

    Player.init(videoUrl);
    Transcript.init(transcriptUrl);
    duration = getDuration(video_id);
    Timeline.init(visWidth, visHeight);
    Player.preloadThumbnails(); // has to wait until duration is set.
    $("#duration-display").text(" / " + formatSeconds(duration));
    Peak.init(JSON.parse(peaks), JSON.parse(vtran_peaks), []);
    Highlight.init(duration, visWidth);
    PersonalTrace.init();
    Topicflow.init();
    init();
    Log.add("page", "loaded", {});
}