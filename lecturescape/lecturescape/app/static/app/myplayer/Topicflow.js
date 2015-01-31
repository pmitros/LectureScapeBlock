"use strict";

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

    function init() {
        loadTopics();
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

    function loadTopics() {
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