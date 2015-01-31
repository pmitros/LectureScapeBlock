"use strict";

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