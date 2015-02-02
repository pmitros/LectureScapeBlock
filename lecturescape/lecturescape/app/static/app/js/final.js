var chart;
var player;
var options = {};
var duration = 0;
var visWidth = 860; //540;
var visHeight = 70; // 80
// var mediaUrlPrefix = "http://juhokim.com/edxanalytics/";
var videoUrl = "{{ videoUrl }}"
var transcriptUrl = "{{ transcriptUrl }}";
//"M-600X-FA12-L5-1_100-aTuYZqhEvuk.mp4";
// var videoUrl = "https://s3.amazonaws.com/edx-course-videos/mit-3091x/M-3091X-FA12-L22-2_100.mp4";
// var videoUrl = "https://s3.amazonaws.com/edx-course-videos/mit-600x/M-600X-FA12-L5-1_100.mp4"
// var transcriptUrl = "http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/videos/6.00x/M-600X-FA12-L5-1_100-aTuYZqhEvuk.en.srt";
// var videoUrl = "http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/videos/6.00x/M-600X-FA12-L21-3_100-kbrZtHI5CSo.mp4";
// var transcriptUrl = "http://localhost:8888/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/static/videos/6.00x/M-600X-FA12-L21-3_100-kbrZtHI5CSo.en.srt";

var data = {{data|safe}};
var vtran_data = {{vtran_data|safe}};
var vtran_peaks = {{vtran_peaks|safe}};
var videos = {{videos|safe}};
var peaks = {{peaks|safe}};
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
$(document).ready(function(){
    // Load the IFrame Player API code asynchronously.
    // var tag = document.createElement('script');
    // tag.src = "https://www.youtube.com/iframe_api";
    // var firstScriptTag = document.getElementsByTagName('script')[0];
    // firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    Player.init("{{videoUrl}}");
    Transcript.init("{{transcriptUrl}}");
    Timeline.init(visWidth, visHeight);
    duration = getDuration("{{video_id}}");
    Player.preloadThumbnails(); // has to wait until duration is set.
    $("#duration-display").text(" / " + formatSeconds(duration));
    Peak.init(peaks, vtran_peaks, []);
    Highlight.init();
    PersonalTrace.init();
    Topicflow.init();
    init();
    Log.add("page", "loaded", {});
});