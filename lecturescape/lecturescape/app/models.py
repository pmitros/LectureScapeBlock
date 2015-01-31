from django.db import models
from django.utils import simplejson

# Create your models here.
class Log(models.Model):
    # Participant ID. Serves as a session ID.
    pid = models.CharField(max_length=16)

    # Task ID. Serves as a unique task ID.
    tid = models.IntegerField(default=0)

    # Which module is the action from?
    module = models.CharField(max_length=64)

    # Which action has been made by the client?
    action = models.CharField(max_length=64)

    # Details about the action (parameters, numbers, position, etc.)
    message = models.CharField(max_length=256)

    # URL parameters
    params = models.CharField(max_length=256)

    # video ID
    video = models.CharField(max_length=32)

    is_admin = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    def __unicode__(self):
        return self.username

    # def toJSON(self):
    #     return simplejson.dumps(self, default=dthandler, sort_keys=True)