import time
import sys
from pymongo import MongoClient
from image_similarity import is_same_image

#course = "6.00x"
#course = "CS188x"
#course = "3.091x"
course = "PH207x"

def read_file_list(filename):
    data = {}
    f = open(filename)
    lines = f.readlines()
    for index, line in enumerate(lines):
        split_str = line.split('\t')
        # print split_str
        datum = {}
        datum["vid"] = split_str[0]
        datum["duration"] = split_str[1]

        data[datum["vid"]] = datum
    f.close()
    return data


def save_file(vid, final_data):
    import json
    obj = {}
    obj[vid] = final_data
    with open("vt_" + course, 'a') as fp:
        json.dump(obj, fp, indent=4)
        # json.dump(obj, fp, sort_keys=True, indent=4, separators=(',', ': '))



def process_video(collection, vid, vdata):
    diff_vector = []
    # if index != 0:
    #     continue
    print index, vid
    for sec in range(1, int(vdata["duration"]) - 1):
        file1 = "processing/" + course + "/v_" + vdata["vid"] + "_" + str(sec) + ".jpg"
        file2 = "processing/" + course + "/v_" + vdata["vid"] + "_" + str(sec+1) + ".jpg"
        try:
            diff_vector.append([sec, is_same_image(file1, file2)[1]])
        except IOError:
            pass
    # print
    # for i, val in enumerate(diff_vector):
    #     print val[0], val[1]
    # save_file(vid, diff_vector)
    result = {}
    result["vid"] = vid
    result["visual_diff"] = diff_vector
    collection.insert(result)




if __name__ == "__main__":
    client = MongoClient()
    mongodb = client['edxmodules_video_analytics_video_analytics']
    # start_time = time.time()
    collection = mongodb['visual_transition']
    data = read_file_list("processing/" + course + "-list")
    for index, vid in enumerate(data):
        process_video(collection, vid, data[vid])
    
    # result = sys._getframe().f_code.co_name, "COMPLETED", (time.time() - start_time), "seconds"
    # print result
