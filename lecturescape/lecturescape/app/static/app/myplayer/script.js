"use strict";

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
function displayTitle(video_id, videos){
    for (var index in videos){
        if (video_id == videos[index]["video_id"])
            $(".video-title").text(videos[index]["video_name"]);
    }
}


/* get duration information from the videos data */
function getDuration(video_id, videos){
    var value = 0;
    for (var index in videos){
        if (video_id == videos[index]["video_id"])
            value = videos[index]["duration"];
    }
    return value;
}


/* Add prev and next links in the nav bar */
function displayNav(video_id, videos){
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
function init(video_id, data, params, videos, duration){
    bindEvents();
    displayTitle(video_id, videos);
    displayNav(video_id, videos);
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