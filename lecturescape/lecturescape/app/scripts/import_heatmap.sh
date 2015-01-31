#!/bin/sh
#colls=( mycoll1 mycoll2 mycoll5 )


# Harvardx
for c in {0..821}
do
  mongoimport --host localhost --db edxmodules_video_analytics_video_analytics --collection video_heatmaps_berkeleyx_cs188x_fall2012 --type json --file /Volumes/USBSTICK/mongo-data/video_heatmaps_0812_video_heatmaps_berkeleyx_cs188x_fall2012${c}.json --jsonArray
done


# Harvardx
# for c in {0..1272}
# do
#   mongoimport --host localhost --db edxmodules_video_analytics_video_analytics --collection video_heatmaps_harvardx_ph207x_fall2012 --type json --file /Volumes/USBSTICK/mongo-data/video_heatmaps_0812_video_heatmaps_harvardx_ph207x_fall2012_${c}.json --jsonArray
# done


# MITx
# for c in {0..3989}
# do
#   mongoimport --host localhost --db edxmodules_video_analytics_video_analytics --collection video_heatmaps_mitx_fall2012 --type json --file /Volumes/USBSTICK/mongo-data/video_heatmaps_0807${c}.json --jsonArray
# done
