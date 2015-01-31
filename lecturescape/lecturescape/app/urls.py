from django.conf.urls import patterns, include, url

from app import views, wordcloud, logs

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'project.views.home', name='home'),
    # url(r'^project/', include('project.foo.urls')),

    url(r'^study/(?P<pid>\d+)$', logs.study, name='study'),

	# url(r'^player/(?P<course>.+)/(?P<vid>\w+)/$', views.player, name='player'),
    url(r'^player/(?P<course>.+)/(?P<vid>[a-zA-Z0-9-_]+)/$', views.player, name='player'),
    url(r'^multiplayer/(?P<course>.+)/$', views.multiplayer, name='multiplayer'),
	url(r'^prototype/(?P<vid>[a-zA-Z0-9-_]+)/$', views.prototype_interface, name='prototype_interface'),
	url(r'^video-single/(?P<vid>[a-zA-Z0-9-_]+)/$', views.video_single, name='video_single'),
	url(r'^video-list/$', views.video_list, name='video_list'),
	url(r'^process-data/$', views.process_data, name='process_data'),

    url(r'^keywords/', wordcloud.handle_keywords, name="handle_keywords"),

	url(r'^data-dashboard/$', views.data_dashboard, name='data_dashboard'),
	url(r'^heatmap-dashboard/$', views.heatmap_dashboard, name='heatmap_dashboard'),
	url(r'^export-heatmaps/$', views.export_heatmaps, name='export_heatmaps'),

	url(r'^process-data-ajax/(?P<index>\d+)$', views.process_data_ajax, name='process_data_ajax'),
	url(r'^process-heatmaps-ajax/(?P<index>\d+)$', views.process_heatmaps_ajax, name='process_heatmaps_ajax'),

    url(r'^log-ajax/$', logs.add_log, name='add_log'),
)
