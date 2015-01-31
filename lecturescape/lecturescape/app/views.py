"""
Store video interactions in the database, query them from the database,
and visualize video analytics with the queried data.
"""
import sys
import time
import json
from bson import json_util
from collections import defaultdict
from itertools import chain
from pymongo import MongoClient, ASCENDING, DESCENDING
from django.http import HttpResponse
from django.shortcuts import render
# from django.conf import settings
# from edinsights.core.decorators import view, query, event_handler
from common import get_prop, CONF
from video_logic import process_segments, process_heatmaps
from algorithms import get_kde, detect_peaks
from django.template.loader import render_to_string

# name of the event collection
# COURSE_NAME = 'PH207x-Fall-2012'
# COURSE_NAME = 'CS188x-Fall-2012'
# COURSE_NAME = '3.091x-Fall-2012'
# COURSE_NAME = '6.00x-Fall-2012'

# > db.videos.find({course_name:/6.00x/}).count()
# 141
# > db.videos.find({course_name:/3.091x/}).count()
# 271
# > db.videos.find({course_name:/CS188x/}).count()
# 149
# > db.videos.find({course_name:/PH207x/}).count()
# 301

# EVENTS_COL = 'video_events_vda101'  #Quanta workshop
# EVENTS_COL = 'video_events_harvardx_ph207x_fall2012'
# EVENTS_COL = 'video_events_test'
EVENTS_COL = 'video_events'  #mitx fall2012
# EVENTS_COL = 'video_events_berkeleyx_cs188x_fall2012'
# EVENTS_COL = 'video_events_odk_20140216'  #ODK

# SEGMENTS_COL = 'video_segments_vda101'  #Quanta workshop
# SEGMENTS_COL = 'video_segments_harvardx_ph207x_fall2012'
# SEGMENTS_COL = 'video_segments_test'
SEGMENTS_COL = 'video_segments'  #mitx fall2012
# SEGMENTS_COL = 'video_segments_berkeleyx_cs188x_fall2012'
# SEGMENTS_COL = 'video_segments_odk_20140216'  #ODK

# HEATMAPS_COL = 'video_heatmaps_vda101'  #Quanta workshop
# HEATMAPS_COL = 'video_heatmaps_harvardx_ph207x_fall2012'
# HEATMAPS_COL = 'video_heatmaps_test'
HEATMAPS_COL = 'video_heatmaps_mitx_fall2012'  #mitx fall2012
# HEATMAPS_COL = 'video_heatmaps_odk_20140216'  #ODK
# HEATMAPS_COL = 'video_heatmaps_berkeleyx_cs188x_fall2012'

VIDEOS_COL = 'videos'
# VIDEOS_COL = 'videos_odk'


def get_db():
    client = MongoClient()
    # mongodb = client['edxmodules_video_analytics_video_analytics']
    mongodb = client['edxmodules_video_analytics_video_analytics']
    print "connected"
    print mongodb
    return mongodb


# @view(name="multiplayer")
def multiplayer(request, course):
    """
    Example: http://localhost:5555/app/multiplayer/6.00x/
    """
    # print course, vid
    mongodb = get_db()
    # [data, peaks, vtran_data, vtran_peaks] = video_multiple_query(vid)
    videos = video_info_query(course)
    [all_data, all_interaction_peaks] = video_multiple_query(course)
    # from edinsights.core.render import render
    # 'vtran_data': vtran_data, 'vtran_peaks': vtran_peaks,
    return render(request, "app/multiplayer.html", {
        'course': course , 'all_data': all_data, 'videos': videos, 'all_interaction_peaks': all_interaction_peaks
    })


# @view(name="player")
def player(request, course, vid):
    """
    http://localhost:5555/app/player/6.00x/aTuYZqhEvuk/
    """
    # print course, vid
    mongodb = get_db()
    [data, peaks, vtran_data, vtran_peaks] = video_single_query(vid)
    videos = video_info_query(course)
    #print "videos"
    #print videos
    #print [data, peaks, vtran_data, vtran_peaks]
    # from edinsights.core.render import render

    # return render(request, "app/player.html", {
    #     'course': course , 'video_id': vid, 'data': data, 'vtran_data': vtran_data, 'vtran_peaks': vtran_peaks, 'videos': videos, 'peaks': peaks
    # })

    rendering = render_to_string("app/player.html", {
        'course': course , 'video_id': vid, 'data': data, 'vtran_data': vtran_data, 'vtran_peaks': vtran_peaks, 'videos': videos, 'peaks': peaks
    })
    f = open("/tmp/rendering.html", "w")
    f.write(rendering)
    f.close()
    from django.http import HttpResponse
    return HttpResponse(rendering)


# @view(name="prototype_interface")
def prototype_interface(request, vid):
    """
    Example: http://localhost:9999/view/prototype_interface?vid=2deIoNhqDsg
    """
    mongodb = get_db()
    [data, peaks, vtran_data, vtran_peaks] = video_single_query(vid)
    videos = video_info_query()
    # from edinsights.core.render import render
    return render(request, "app/prototype-view.html", {
        'video_id': vid, 'data': data, 'videos': videos, 'peaks': peaks
    })


# @view(name="video_single")
def video_single(request, vid):
    """
    Visualize students' interaction with video content
    for a single video segment.
    Example: http://localhost:9999/view/video_single?vid=2deIoNhqDsg
    """
    mongodb = get_db()
    [data, peaks, vtran_data, vtran_peaks] = video_single_query(vid)
    videos = video_info_query()
    # from edinsights.core.render import render
    return render(request, "app/single-view.html", {
        'video_id': vid, 'data': data, 'videos': videos, 'peaks': peaks
    })


# @view(name="video_list")
def video_list(request):
    """
    Visualize students' interaction with video content
    for all videos in the events database
    """
    mongodb = get_db()
    data = video_list_query()
    videos = video_info_query()
    # from edinsights.core.render import render
    return render(request, "app/list-view.html", {
        'data': data, 'videos': videos
    })


# @query(name="video_single")
def video_single_query(vid):
    """
    Return heatmap information from the database for a single video.
    Example: http://localhost:9999/query/video_single?vid=2deIoNhqDsg
    """

    import numpy as np
    mongodb = get_db()
    start_time = time.time()

    collection = mongodb['visual_transition']
    vtran_temp_data = list(collection.find({"vid": vid}))
    # print vtran_temp_data
    vtran_data = vtran_temp_data[0]["visual_diff"]
    # vtran_np_data = np.array(vtran_data)
    # print vtran_data
    # print vtran_data[:,1]
    vtran_peaks_raw = detect_peaks(np.array(vtran_data)[:,1], 3, "vtran")
    # print vtran_peaks
    vtran_peaks = json.dumps(vtran_peaks_raw, default=json_util.default)

    collection = mongodb[HEATMAPS_COL]
    # entries = list(collection.find({"video_id": vid}, {"completion_counts": 0}))
    entries = list(collection.find({"video_id": vid}, {"daily_view_counts": 0, "raw_counts": 0, "playrate_counts": 0, "pause_counts": 0, "unique_counts": 0, "replay_counts": 0, "skip_counts": 0, "completion_counts": 0}))

    # print vid, entries
    # L@S 2014 analysis
    # collection = mongodb["video_heatmaps_mitx_fall2012"]
    # entries = list(collection.find({"video_id": vid}, {"completion_counts": 0}))
    # if len(entries) == 0:
    #     collection = mongodb["video_heatmaps_harvardx_ph207x_fall2012"]
    #     entries = list(collection.find({"video_id": vid}, {"completion_counts": 0}))
    # if len(entries) == 0:
    #     collection = mongodb["video_heatmaps_berkeleyx_cs188x_fall2012"]
    #     entries = list(collection.find({"video_id": vid}, {"completion_counts": 0}))

    if len(entries):
        # First, smooth the points and run peak detection
        play_points = entries[0]["play_counts"]
        play_points[0] = 0
        #play_points[0:int(len(play_points)*0.03)] = [0]*int(len(play_points)*0.03)
        play_kde = get_kde(np.array(play_points), 0.02)
        # mask nan values
        #print "contains nan:", np.all(np.isnan(play_kde[:,1]), 0)
        #if np.all(np.isnan(play_kde[:,1]), 0):
        #    play_kde = [[index, point] for index, point in enumerate(play_points)]
        for index, point in enumerate(play_kde[:,1]):
            if np.isnan(point):
              play_kde[:,1][index] = play_points[index]
        masked_play_kde = np.ma.array(play_kde, mask=np.isnan(play_kde))
        #print masked_play_kde, "max", np.max(masked_play_kde[:,1])
        play_kde = masked_play_kde
        play_peaks_raw = detect_peaks(play_kde[:,1], 2.2, "interaction")
        entries[0]["play_kde"] = play_kde[:,1].tolist()
        interaction_peaks = json.dumps(play_peaks_raw, default=json_util.default)
        result = json.dumps(entries[0], default=json_util.default)
    else:
        result = ""
    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    return [result, interaction_peaks, vtran_data, vtran_peaks]


# @query(name="video_multiple")
def video_multiple_query(course=""):
    """
    Return heatmap information from the database for a single video.
    Example: http://localhost:9999/query/video_single?vid=2deIoNhqDsg
    """

    import numpy as np
    mongodb = get_db()
    start_time = time.time()

    all_result = []
    all_interaction_peaks = []

    collection = mongodb[VIDEOS_COL]

    #UIST 2014
    if course == "6.00x":
        course_name = "6.00x-Fall-2012"
    elif course == "3.091x":
        course_name = "3.091x-Fall-2012"
    else:
        course_name = "6.00x-Fall-2012"
    entries = list(collection.find({"course_name":course_name})
        .sort([("week_number", ASCENDING), ("sequence_number", ASCENDING), ("module_index", ASCENDING)]))

    for entry in entries:
        # vtran data might not be necessary for the multiplayer view
        # collection = mongodb['visual_transition']
        # vtran_temp_data = list(collection.find({"vid": vid}))
        # vtran_data = vtran_temp_data[0]["visual_diff"]
        # vtran_peaks_raw = detect_peaks(np.array(vtran_data)[:,1], 3, "vtran")
        # vtran_peaks = json.dumps(vtran_peaks_raw, default=json_util.default)

        collection = mongodb[HEATMAPS_COL]
        vid = entry["video_id"]
        # entries = list(collection.find({"video_id": vid}, {"completion_counts": 0}))
        single_entries = list(collection.find({"video_id": vid}, {"total_watching_time": 0, "daily_view_counts": 0, "raw_counts": 0, "playrate_counts": 0, "pause_counts": 0, "unique_counts": 0, "replay_counts": 0, "skip_counts": 0, "completion_counts": 0}))

        if len(single_entries):
            # First, smooth the points and run peak detection
            play_points = single_entries[0]["play_counts"]
            play_points[0] = 0
            #play_points[0:int(len(play_points)*0.03)] = [0]*int(len(play_points)*0.03)
            play_kde = get_kde(np.array(play_points), 0.02)
            # mask nan values
            #print "contains nan:", np.all(np.isnan(play_kde[:,1]), 0)
            #if np.all(np.isnan(play_kde[:,1]), 0):
            #    play_kde = [[index, point] for index, point in enumerate(play_points)]
            for index, point in enumerate(play_kde[:,1]):
                if np.isnan(point):
                  play_kde[:,1][index] = play_points[index]
            masked_play_kde = np.ma.array(play_kde, mask=np.isnan(play_kde))
            #print masked_play_kde, "max", np.max(masked_play_kde[:,1])
            play_kde = masked_play_kde
            play_peaks_raw = detect_peaks(play_kde[:,1], 3, "interaction")
            single_entries[0]["play_kde"] = play_kde[:,1].tolist()
            interaction_peaks = json.dumps(play_peaks_raw, default=json_util.default)
            result = json.dumps(single_entries[0], default=json_util.default)
            all_result.append(result)
            all_interaction_peaks.append(interaction_peaks)
        else:
            result = ""
    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    # return [result, interaction_peaks, vtran_data, vtran_peaks]
    return [all_result, all_interaction_peaks]


# @query(name="video_list")
def video_list_query():
    """
    Return heatmap information from the database for all videos.
    """
    mongodb = get_db()
    start_time = time.time()

    # Quanta workshop
    collection = mongodb[HEATMAPS_COL]
    entries = list(collection.find({}, {"raw_counts": 0, "play_counts": 0, "pause_counts": 0, "unique_counts": 0, "replay_counts": 0, "skip_counts": 0, "completion_counts": 0}))

    # L@S 2014 analysis
    # collection = mongodb["video_heatmaps_mitx_fall2012"]
    # entries1 = list(collection.find({}, {"raw_counts": 0, "play_counts": 0, "pause_counts": 0, "unique_counts": 0, "replay_counts": 0, "skip_counts": 0, "completion_counts": 0}))
    # collection = mongodb["video_heatmaps_harvardx_ph207x_fall2012"]
    # entries2 = list(collection.find({}, {"raw_counts": 0, "play_counts": 0, "pause_counts": 0, "unique_counts": 0, "replay_counts": 0, "skip_counts": 0, "completion_counts": 0}))
    # collection = mongodb["video_heatmaps_berkeleyx_cs188x_fall2012"]
    # entries3 = list(collection.find({}, {"raw_counts": 0, "play_counts": 0, "pause_counts": 0, "unique_counts": 0, "replay_counts": 0, "skip_counts": 0, "completion_counts": 0}))

    # entries = entries1 + entries2 + entries3

    if len(entries):
        result = json.dumps(entries, default=json_util.default)
    else:
        result = ""
    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    return result



# @query(name="video_info")
def video_info_query(course=""):
    """
    Get a list of all videos in the database
    """
    mongodb = get_db()
    start_time = time.time()

    collection = mongodb[VIDEOS_COL]

    #UIST 2014
    if course == "6.00x":
        course_name = "6.00x-Fall-2012"
    elif course == "3.091x":
        course_name = "3.091x-Fall-2012"
    else:
        course_name = "6.00x-Fall-2012"
    entries = list(collection.find({"course_name":course_name})
        .sort([("week_number", ASCENDING), ("sequence_number", ASCENDING), ("module_index", ASCENDING)]))

    # entries = list(collection.find().sort("video_name"))
    # entries = list(collection.find({ "$or": [{"course_name":"PH207x-Fall-2012"},{"course_name":"CS188x-Fall-2012"},{"course_name":"3.091x-Fall-2012"},{"course_name":"6.00x-Fall-2012"}]}).sort("video_name"))

    # only MIT courses
    # entries = list(collection.find({ "$or": [{"course_name":"3.091x-Fall-2012"},{"course_name":"6.00x-Fall-2012"}]}).sort("video_name"))

    # entries = list(collection.find({"course_name":"PH207x-Fall-2012"}).sort("video_name"))
    # entries = list(collection.find({"course_name":"6.00x-Fall-2012"}).sort("video_name"))
    # entries = list(collection.find({"course_name":"3.091x-Fall-2012"}).sort("video_name"))
    # entries = list(collection.find({"course_name":"CS188x-Fall-2012"}).sort("video_name"))
    # entries = list(collection.find({"course_name":"VDA101"}).sort("video_name"))
    if len(entries):
        result = json.dumps(entries, default=json_util.default)
    else:
        result = ""
    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    return result


def record_segments(mongodb):
    """
    Construct watching segments from tracking log entries.
    """
    start_time = time.time()

    collection = mongodb[EVENTS_COL]
    # For incremental updates, retrieve only the events not processed yet.
    #entries = collection.find({"processed": 0}).limit(1000) #.batch_size(1000)
    entries = collection.find().limit(200000) #.batch_size(1000)
    print entries.count(), "new events found"
    data = process_segments(mongodb, list(entries))
    collection_seg = mongodb[SEGMENTS_COL]
    # collection.remove()
    results = {}
    for video_id in data:
        results[video_id] = {}
        for username in data[video_id]:
            # TOOD: in order to implement incremental updates,
            # we need to combine existing segment data with incoming ones.
            # Maybe not worth it. Segments are unlikely to be cut in the middle.
            # remove all existing (video, username) entries
            # collection2.remove({"video_id": video_id, "user_id": username})
            for segment in data[video_id][username]["segments"]:
                result = segment
                result["video_id"] = video_id
                result["user_id"] = username
                collection_seg.insert(result)
                results[video_id][username] = segment
    # Mark all as processed
    entries.rewind()
    for entry in entries:
        collection.update({"_id": entry["_id"]}, {"$set": {"processed": 1}})
    # Make sure the collection is indexed.
    from pymongo import ASCENDING
    collection_seg.ensure_index(
        [("video_id", ASCENDING), ("user_id", ASCENDING)])

    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    # print results
    return results


def record_heatmaps(mongodb):
    """
    Record heatmap bins for each video, based on segments
    for a single video?
    """
    start_time = time.time()

    # TODO: handle cut segments (i.e., start event exists but end event missing)
    # TODO: only remove the corresponding entries in the database: (video, user)
    collection = mongodb[SEGMENTS_COL]
    segments = list(collection.find())
    collection = mongodb[HEATMAPS_COL]
    collection.remove()
    print len(segments), "segments found"

    results = defaultdict(dict)
    for segment in segments:
        if not segment["user_id"] in results[segment["video_id"]]:
            results[segment["video_id"]][segment["user_id"]] = []
        results[segment["video_id"]][segment["user_id"]].append(segment)
    vid_col = mongodb[VIDEOS_COL]
    for video_id in results:
        result = list(vid_col.find({"video_id": video_id}))
        if len(result):
            process_heatmaps(mongodb, results[video_id], video_id, int(result[0]["duration"]))
        else:
            print "ERROR in video information retrieval"
    # Make sure the collection is indexed.
    from pymongo import ASCENDING
    collection.ensure_index([("video_id", ASCENDING)])
        # [("video_id", ASCENDING), ("time", ASCENDING)])

    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"


# @event_handler()
def video_interaction_event(mongodb, events):
    """
    Store all video-related events from the tracking log
    into the database. There are three collections:
    1) video_events: raw event information
    2) video_segments: watching segments recovered from events
    3) video_heatmap: view counts for each second of a video

    To send events, refer to send_event.py
    """
    valid_events = 0
    # Store raw event information
    for event in events:
        entry = {}
        for key in event.keys():
            entry[key] = event[key]
            # flag indicating whether this item has been processed.
            entry["processed"] = 0
        collection = mongodb[EVENTS_COL]
        # get a list of event types to keep:
        # everything that starts with EVT defined in common.py
        temp_list = [CONF[key] for key in CONF if key.startswith("EVT")]
        events_type_list = list(chain(*temp_list))
        if get_prop(event, "TYPE_EVENT") in events_type_list:
            collection.insert(entry)
            valid_events += 1
    print "=========== INCOMING EVENTS", len(events), "total,", valid_events, "valid. ============="


# @query(name="process_data")
def process_data(request):
    """
    Process the tracking events in the database.
    It batch-processes all events not marked as processed.
    Generate segments and heatmaps for visualization and stat analysis.
    """
    mongodb = get_db()
    start_time = time.time()
    record_segments(mongodb)
    record_heatmaps(mongodb)
    result = sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    print result
    return HttpResponse(result)


def record_segments_ajax(mongodb, index):
    """
    Construct watching segments from tracking log entries.
    """
    bin_size = 100000
    start_time = time.time()

    collection = mongodb[EVENTS_COL]
    # For incremental updates, retrieve only the events not processed yet.
    #entries = collection.find({"processed": 0}).limit(1000) #.batch_size(1000)
    entries = collection.find().limit(bin_size).skip(index*bin_size) #.batch_size(1000)
    print entries.count(), "new events found"
    data = process_segments(mongodb, list(entries))
    collection_seg = mongodb[SEGMENTS_COL]
    # collection.remove()
    results = {}
    for video_id in data:
        results[video_id] = {}
        for username in data[video_id]:
            # TOOD: in order to implement incremental updates,
            # we need to combine existing segment data with incoming ones.
            # Maybe not worth it. Segments are unlikely to be cut in the middle.
            # remove all existing (video, username) entries
            # collection2.remove({"video_id": video_id, "user_id": username})
            for segment in data[video_id][username]["segments"]:
                result = segment
                result["video_id"] = video_id
                result["user_id"] = username
                collection_seg.insert(result)
                results[video_id][username] = segment
    # Mark all as processed
    entries.rewind()
    for entry in entries:
        collection.update({"_id": entry["_id"]}, {"$set": {"processed": 1}})
    # Make sure the collection is indexed.
    from pymongo import ASCENDING
    collection_seg.ensure_index(
        [("video_id", ASCENDING), ("user_id", ASCENDING)])

    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    # print results
    return results


def record_heatmaps_ajax(mongodb, index):
    """
    Record heatmap bins for each video, based on segments
    for a single video?
    """
    bin_size = 100000
    start_time = time.time()

    collection = mongodb[HEATMAPS_COL]
    collection.remove()
    # TODO: handle cut segments (i.e., start event exists but end event missing)
    # TODO: only remove the corresponding entries in the database: (video, user)
    vid_col = mongodb[VIDEOS_COL]
    video_list = list(vid_col.find())
    num_videos = len(video_list)
    for index, video in enumerate(video_list):
        video_id = video["video_id"]
        loop_start_time = time.time()
        collection = mongodb[SEGMENTS_COL]
        segments = list(collection.find({"video_id": video_id}))
        #segments = collection.find().limit(bin_size).skip(index*bin_size) #.batch_size(1000)
        print index, "/", num_videos, video_id, ":", len(segments), "segments", (time.time() - loop_start_time), "seconds"
        if len(segments):
            loop_start_time2 = time.time()
            results = defaultdict(dict)
            for segment in segments:
                if not segment["user_id"] in results[segment["video_id"]]:
                    results[segment["video_id"]][segment["user_id"]] = []
                results[segment["video_id"]][segment["user_id"]].append(segment)
            process_heatmaps(mongodb, results[video_id], video_id, video["duration"])
            print (time.time() - loop_start_time2), "seconds"
    # Make sure the collection is indexed.
    from pymongo import ASCENDING
    collection.ensure_index([("video_id", ASCENDING)])
        # [("video_id", ASCENDING), ("time", ASCENDING)])

    print sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"


# @view(name="data_dashboard")
def data_dashboard(request):
    mongodb = get_db()
    collection = mongodb[EVENTS_COL]
    num_entries = collection.find().count()
    # from edinsights.core.render import render
    return render(request, "app/data-dashboard.html", {
        'num_entries': num_entries
    })


# @view(name="heatmap_dashboard")
def heatmap_dashboard(request):
    mongodb = get_db()
    collection = mongodb[SEGMENTS_COL]
    num_entries = collection.find().count()
    # from edinsights.core.render import render
    return render(request, "app/heatmap-dashboard.html", {
        'num_entries': num_entries
    })


# @query(name="process_data_ajax")
def process_data_ajax(request, index):
    print index
    mongodb = get_db()
    start_time = time.time()
    record_segments_ajax(mongodb, int(index))
    #record_heatmaps_ajax(mongodb, int(index))
    time_result = sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    print time_result
    result = json.dumps({"index": index, "time": time_result})
    return HttpResponse(result, mimetype='application/json')
    # return result


# @query(name="process_heatmaps_ajax")
def process_heatmaps_ajax(request, index):
    print index
    mongodb = get_db()
    start_time = time.time()
    #record_segments_ajax(mongodb, int(index))
    record_heatmaps_ajax(mongodb, int(index))
    time_result = sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    print time_result
    result = json.dumps({"index": index, "time": time_result})
    return HttpResponse(result, mimetype='application/json')
    # return result


# @query(name="export_heatmaps")
def export_heatmaps(request):
    mongodb = get_db()
    import os
    collection = mongodb[HEATMAPS_COL]
    entries = list(collection.find())
    for index, entry in enumerate(entries):
        with open("edxmodules/video_analytics/mongo-data/video_heatmaps_0812_" + HEATMAPS_COL + "_" + str(index) + ".json", "w+") as outfile:
            json.dump(entry, outfile, default=json_util.default, indent=0)
        print index, "done"
    return HttpResponse(len(entries) + " items written to " + os.path.abspath(outfile.name))


# @query(name="test")
def test(request):
    """
    Test property retrieval
    """
    """
    for index, entry in enumerate(entries):
        try:
            #json.dumps(entry, cls=MongoAwareEncoder)
            json.dumps(entry, default=json_util.default)
            #for key in entry:
            #    print key, entry[key]
        except TypeError:
            if index % 100 == 0:
                for key in entry:
                    print key, json.dumps(entry[key])
    """
        #print json.dumps(entry)
    # For incremental updates, retrieve only the events not processed yet.
    #entries = list(collection.find({"processed": 0}))
    #print "RESULT:", get_prop(entries[0], "TIMESTAMP")
    #print "RESULT:", get_prop(entries[0], "VIDEO_ID")
    #print "RESULT:", get_prop(entries[0], "VIDEO_TIME")
    #print "RESULT:", get_prop(entries[0], "VIDEO_SPEED")
    #print "RESULT:", get_prop(entries[0], "TIXXMESTAMP")
    #return "RESULT:", get_prop(entries[0], "TIMESTAMP")
    return ""


