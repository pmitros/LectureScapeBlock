# -*- coding: utf-8 -*-
from south.utils import datetime_utils as datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'Log'
        db.create_table(u'app_log', (
            (u'id', self.gf('django.db.models.fields.AutoField')(primary_key=True)),
            ('pid', self.gf('django.db.models.fields.CharField')(max_length=16)),
            ('tid', self.gf('django.db.models.fields.IntegerField')(default=0)),
            ('action', self.gf('django.db.models.fields.CharField')(max_length=64)),
            ('message', self.gf('django.db.models.fields.CharField')(max_length=256)),
            ('is_admin', self.gf('django.db.models.fields.BooleanField')(default=False)),
            ('added_at', self.gf('django.db.models.fields.DateTimeField')(auto_now_add=True, blank=True)),
        ))
        db.send_create_signal(u'app', ['Log'])


    def backwards(self, orm):
        # Deleting model 'Log'
        db.delete_table(u'app_log')


    models = {
        u'app.log': {
            'Meta': {'object_name': 'Log'},
            'action': ('django.db.models.fields.CharField', [], {'max_length': '64'}),
            'added_at': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            u'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'is_admin': ('django.db.models.fields.BooleanField', [], {'default': 'False'}),
            'message': ('django.db.models.fields.CharField', [], {'max_length': '256'}),
            'pid': ('django.db.models.fields.CharField', [], {'max_length': '16'}),
            'tid': ('django.db.models.fields.IntegerField', [], {'default': '0'})
        }
    }

    complete_apps = ['app']