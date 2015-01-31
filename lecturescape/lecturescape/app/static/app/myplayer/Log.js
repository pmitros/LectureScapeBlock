"use strict";

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