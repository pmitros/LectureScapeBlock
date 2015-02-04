"use strict";

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

    function init(visWidth, visHeight, duration, data){
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