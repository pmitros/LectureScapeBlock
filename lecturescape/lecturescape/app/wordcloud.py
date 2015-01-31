# Create your views here.
from django.http import HttpResponseRedirect, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt
from django.db import IntegrityError
from django.utils import simplejson
import json


@csrf_exempt
def handle_keywords(request):
    import operator
    courseid = request.POST['courseid']
    segtype = request.POST['segtype']
    videoid = request.POST['videoid']
    maxwords = int(request.POST['maxwords'])
    new_distance = 1.2
    shift = 0.8

    obj = []
    filepath = "app/data-keywords/v2/%s/%s/%s" % (courseid, segtype, videoid)
    with open(filepath, "r") as fil:
        for line in fil:
            segmentobj = {}
            segmentdata = line.split(" ")
            segmentobj["start"] = segmentdata[0]
            segmentobj["end"] = segmentdata[1]
            segmentobj["keywords"] = []

            # grab all the keyword info
            allkws = {}
            for kwdata in segmentdata[2:]:
                kw, weight = kwdata.split(":")
                allkws[kw] = float(weight.strip())
            # sort and filter so that only highest weighted keywords exist (limiting to 'maxwords' number of keywords)
            sorted_kws = sorted(allkws.iteritems(), key=operator.itemgetter(1))
            sorted_kws.reverse()
            highest_kws = sorted_kws[0:maxwords]
            scaled_kws = scale(highest_kws, new_distance, shift)
            for wd, weight in scaled_kws:
                segmentobj["keywords"].append({"label": wd, "importance": weight})
            obj.append(segmentobj)
    # print "obj", obj
    return HttpResponse(json.dumps(obj))

def scale(sorted_kws, new_distance, shift):
    scaled = []
    # dist between highest and lowest weight
    orig_distance = sorted_kws[0][1] - sorted_kws[len(sorted_kws)-1][1]
    old_shift = sorted_kws[len(sorted_kws)-1][1]
    for kw, weight in sorted_kws:
        scaled_weight = ((weight - old_shift) * new_distance / orig_distance) + shift
        scaled.append((kw,scaled_weight))
    return scaled