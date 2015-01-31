# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding field 'Log.params'
        db.add_column(u'app_log', 'params',
                      self.gf('django.db.models.fields.CharField')(default='', max_length=256),
                      keep_default=False)

        # Adding field 'Log.video'
        db.add_column(u'app_log', 'video',
                      self.gf('django.db.models.fields.CharField')(default='', max_length=32),
                      keep_default=False)


    def backwards(self, orm):
        # Deleting field 'Log.params'
        db.delete_column(u'app_log', 'params')

        # Deleting field 'Log.video'
        db.delete_column(u'app_log', 'video')


    models = {
        u'app.log': {
            'Meta': {'object_name': 'Log'},
            'action': ('django.db.models.fields.CharField', [], {'max_length': '64'}),
            'added_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_admin': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'message': ('django.db.models.fields.CharField', [], {'max_length': '256'}),
            'module': ('django.db.models.fields.CharField', [], {'max_length': '64'}),
            'params': ('django.db.models.fields.CharField', [], {'max_length': '256'}),
            'pid': ('django.db.models.fields.CharField', [], {'max_length': '16'}),
            'tid': ('django.db.models.fields.IntegerField', [], {'default': '0'}),
            'video': ('django.db.models.fields.CharField', [], {'max_length': '32'})
        }
    }

    complete_apps = ['app']