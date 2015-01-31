"use strict";

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