"use strict";

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