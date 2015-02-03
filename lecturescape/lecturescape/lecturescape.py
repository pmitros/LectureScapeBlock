"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources

from xblock.core import XBlock
from xblock.fields import Scope, Integer
from xblock.fragment import Fragment
from django.template import Context, Template


from django.core.urlresolvers import reverse
import os
import sys
import time
import json
from bson import json_util
from collections import defaultdict
from itertools import chain
from pymongo import MongoClient, ASCENDING, DESCENDING
# from django.conf import settings
# from edinsights.core.decorators import view, query, event_handler
from common import get_prop, CONF
from video_logic import process_segments, process_heatmaps
from algorithms import get_kde, detect_peaks


class LSXBlock(XBlock):
    """
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    '''
    Util functions
    '''
    def load_resource(self, resource_path):
        """
        Gets the content of a resource
        """
        resource_content = pkg_resources.resource_string(__name__, resource_path)
        return unicode(resource_content)

    def render_template(self, template_path, context={}):
        """
        Evaluate a template by resource path, applying the provided context
        """
        template_str = self.load_resource(template_path)
        return Template(template_str).render(Context(context))

    '''
    Main functions
    '''

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the LSXBlock, shown to students
        when viewing courses.
        """

        vid = 'aTuYZqhEvuk'
        course = '6.00x'
        mongodb = self.get_db()
        [data, peaks, vtran_data, vtran_peaks] = self.video_single_query(vid)
        videos = self.video_info_query(course)

        static_files = os.listdir('/Users/PeterGithaiga/EdX/LectureScapeBlock/lecturescape/lecturescape/app/static/app/img')

        urls = {}
        for x in xrange(len(static_files)):
            urls[static_files[x].split('.')[0]] = self.runtime.local_resource_url(self, "public/img/" + static_files[x])

        html = self.render_template("app/templates/app/player.html", urls)
        frag = Fragment(html)
        frag.add_css(self.resource_string("app/static/app/css/jquery.jscrollpane.css"))
        frag.add_css(self.resource_string("app/static/app/myplayer/style.css"))
        frag.add_css(self.resource_string("app/static/app/css/common.css"))
        frag.add_javascript(self.resource_string("app/static/app/js/jquery-1.10.2.min.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/d3.v3.min.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/d3.layout.cloud.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/jscrollpane/jquery.mousewheel.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/jscrollpane/jquery.jscrollpane.min.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/common.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Player.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Peak.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Timeline.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Highlight.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/PersonalTrace.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Transcript.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Topicflow.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Log.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/script.js"))

        frag.add_javascript(self.resource_string("app/static/app/js/lecturescape.js"))
        frag.initialize_js('LSXBlock', {'urls':urls, 'videoUrl': self.runtime.local_resource_url(
            self, 'app/static/app/videos/6.00x/v_aTuYZqhEvuk.mp4'),
            'transcriptUrl': self.runtime.local_resource_url(
                self, 'app/static/app/videos/6.00x/v_aTuYZqhEvuk.en.srt'),
            'data': data, 'vtran_data': vtran_data, 'vtran_peaks': vtran_peaks, 'videos': videos, 'peaks': peaks,
            'video_id': 'aTuYZqhEvuk', 'course': '6.00x'})
        return frag

    def get_db(self):
        client = MongoClient()
        # mongodb = client['edxmodules_video_analytics_video_analytics']
        mongodb = client['edxmodules_video_analytics_video_analytics']
        print "connected"
        print mongodb
        return mongodb

    # @query(name="video_single")
    def video_single_query(self, vid):
        """
        Return heatmap information from the database for a single video.
        Example: http://localhost:9999/query/video_single?vid=2deIoNhqDsg
        """

        import numpy as np
        mongodb = self.get_db()
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

        collection = mongodb['video_heatmaps_mitx_fall2012']
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

    # @query(name="video_info")
    def video_info_query(self, course=""):
        """
        Get a list of all videos in the database
        """
        mongodb = self.get_db()
        start_time = time.time()

        collection = mongodb['videos']

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

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("LSXBlock",
             """<vertical_demo>
                <lecturescape/>
                </vertical_demo>
             """),
        ]