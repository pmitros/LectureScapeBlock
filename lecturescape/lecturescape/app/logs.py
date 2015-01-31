# -*- coding: utf-8 -*-
from django.shortcuts import get_object_or_404, render
from django.http import HttpResponseRedirect, HttpResponse, Http404
from app.models import Log
from django.db import IntegrityError
from django.utils import simplejson


def add_log(request):
    pid = request.POST['pid']
    tid = request.POST['tid']
    module = request.POST['module']
    action = request.POST['action']
    message = request.POST['message']
    params = request.POST['params']
    video = request.POST['video']
    log = Log(pid=pid, tid=tid, module=module, action=action, message=message, params=params, video=video)
    log.save()
    results = {'success': True}
    return HttpResponse(simplejson.dumps(results), mimetype='application/json')

def study(request, pid):
    return render(request, "app/study.html", {
        'pid': pid
    })
