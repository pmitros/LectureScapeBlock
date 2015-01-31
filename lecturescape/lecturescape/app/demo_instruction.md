
Set up a dummy course
======
Use edX Studio


delete a course in Studio
- rake cms:delete_course LOC=MITX/VD101/2014_01 COMMIT=commit

rake lms[cms.dev]
`rake lms`, or `rake lms[dev]` will start up lms using the courseware defined in xml files in the data dir. In order for the lms to use the mongo backed DB for courseware (which is where Studio creates courses), you should use:
`rake lms[cms.dev]`
This will use the settings file located at lms/envs/cms/dev.py



Startup Process
======

workon edx-platform
cd /Applications/MAMP/htdocs/edx/edxanalytics/
./scripts/run.sh


Creating Heatmaps
======

cd /Applications/MAMP/htdocs/edx/edxanalytics/src/edxanalytics/edxmodules/video_analytics/

python send_event.py -file /Applications/MAMP/htdocs/edx/log/tracking.log

open http://localhost:9999/query/process_data

open http://localhost:9999/view/video_single?vid=Gr37h-ILytE


Switching between databases
======

- change video_analytics.py EVENTS, HEATMAPS, SEGMENTS, 
- change video_analytics.py: 223  select right entries
