# Kernel estimation for heatmap smoothing
# from scipy.stats import skew, kurtosis
def get_kde(points, frac_val=0.02):
    import numpy as np
    import statsmodels.api as sm
    kde = sm.nonparametric.lowess(np.array(points), np.array(range(len(points))), frac=frac_val, it=3, return_sorted=True)
    #print "kde", kde
    #print kde[:,1]
    return kde


# TwitInfo Peak Detection Algorithm

def detect_peaks_update(oldmean, oldmeandev, updatevalue):
    import math
    ALPHA = 0.125
    diff = math.fabs(oldmean - updatevalue)
    newmeandev = ALPHA * diff + (1-ALPHA) * oldmeandev
    newmean = ALPHA * updatevalue + (1-ALPHA) * oldmean
    return [newmean, newmeandev]


def detect_peaks(data, tau=2, type="interaction"):
    """
    peak detection algorithm
    """
    import numpy as np
    import numpy.ma as ma
    import math
    #bins = data["pause_counts"]
    bins = data
    P = 5
    TAU = tau

    # for i, count in enumerate(bins):
    #     print i, count

    # list of peaks - their start, end, and peak time
    windows = []
    #print np.mean(bins), bins[5], np.isnan(bins[5]), bins[5] is ma.masked
    if len(bins) <= 5:
        return windows

    if np.isnan(bins[5]) or bins[5] is ma.masked or bins[5] == 0:
        mean = np.mean(bins)
    else:
        mean = bins[5]
    if np.isnan(np.var(bins[5:5+P])) or np.var(bins[5:5+P]) is ma.masked or np.var(bins[5:5+P]) == 0:
        meandev = np.var(bins)
    else:
        meandev = np.var(bins[5:5+P])
    #print mean, meandev
    # for i in range(1, len(bins)-1):
    i = 5
    while i < len(bins):
        #print "dev", i, mean, meandev, bins[i], math.fabs(bins[i] - mean) / meandev
        if np.isnan(bins[i]) or bins[i] is ma.masked:
            i = i + 1
            continue
        rise_rate = math.fabs(bins[i] - mean) / meandev
        if rise_rate > TAU and bins[i] > bins[i-1]:
            start = i - 1
            #print "start", start
            while i < len(bins) and bins[i] > bins[i-1]:
                [mean, meandev] = detect_peaks_update(mean, meandev, bins[i])
                i = i + 1
            #print "peak", i - 1
            peak = i - 1
            end = i
            while i < len(bins) and bins[i] > bins[start]:
                # until the bin counts are back at the level they started
                if math.fabs(bins[i] - mean) / meandev > TAU and bins[i] > bins[i-1]:
                    # another significant rise found, so quit the downhill climbing
                    #print "another hill", i
                    i = i - 1
                    end = i
                    break
                else:
                    [mean, meandev] = detect_peaks_update(mean, meandev, bins[i])
                    # print "downhill", i
                    end = i
                    i = i + 1

            #windows.append([start, peak, end, int(rise_rate*100)])
            windows.append({"start": start, "top": peak, "end": end, "score": int(rise_rate*100), "type": type, "label": "Other learners rewatched this part."})
            #print "window added", start, peak, end
        else:
            [mean, meandev] = detect_peaks_update(mean, meandev, bins[i])
            # print mean
        i = i + 1
    return windows


# Run peak detection for the smoothed kde
# def get_peaks(kde, tau=2):
#     peaks = np.array(detect_peaks(kde[:,1], tau))
#     stats_data = {}
#     #print len(peaks), "peaks detected"
#     for peak in peaks:
#         st = {}
#         st["peak_width"] = peak[2] - peak[0]
#         st["peak_norm_width"] = st["peak_width"] * 100 / len(kde)
#         st["peak_height"] = kde[:,1][peak[1]] - kde[:,1][peak[0]]
#         st["peak_norm_height"] = st["peak_height"] * 100 / np.max(kde[:,1])
#         st["peak_area"] = 0
#         end = peak[2] + 1
#         if peak[2] == len(kde):
#             end = peak[2]
#         for x in range(peak[0], end):
#             st["peak_area"] += kde[:,1][x]
#         st["peak_norm_area"] = st["peak_area"] * 100 / np.sum(kde[:,1])
#         st["skew"] = skew(kde[:,1][peak[0]:end])
#         st["kurt"] = kurtosis(kde[:,1][peak[0]:end])
#         stats_data[str(peak[1])] = st

#         #print format_time(peak[0]), format_time(peak[1]), format_time(peak[2]),
#         #print "T:", peak[3], "W:", st["peak_width"], "H:", int(st["peak_height"]), "A:", int(st["peak_area"]),
#         #print "NW:", "%.2f" % st["peak_norm_width"], "NH:", "%.2f" % st["peak_norm_height"], "NA:", "%.2f" % st["peak_norm_area"],
#         #print "skew:", "%.2f" % st["skew"], "kurt:", "%.2f" % st["kurt"]
#     return [peaks, stats_data]


"""
Deprecated.
"""

def detect_peaks_org(data):
    """
    peak detection algorithm
    """
    import numpy
    import math
    bins = data["pause_counts"]

    P = 5
    TAU = 4

    # for i, count in enumerate(bins):
    #     print i, count

    # list of peaks - their start, end, and peak time
    windows = []
    mean = bins[5]

    meandev = numpy.var(bins[5:5+P])
    print mean, meandev
    # for i in range(1, len(bins)-1):
    i = 2
    while i < len(bins):
        # print "dev", i, math.fabs(bins[i] - mean) / meandev
        if math.fabs(bins[i] - mean) / meandev > TAU and bins[i] > bins[i-1]:
            start = i - 1
            print "start", start
            while i < len(bins) and bins[i] > bins[i-1]:
                [mean, meandev] = detect_peaks_update(mean, meandev, bins[i])
                i = i + 1
            print "peak", i - 1
            peak = i - 1
            end = i
            while i < len(bins) and bins[i] > bins[start]:
                # until the bin counts are back at the level they started
                if math.fabs(bins[i] - mean) / meandev > TAU and bins[i] > bins[i-1]:
                    # another significant rise found, so quit the downhill climbing
                    print "another hill", i
                    i = i - 1
                    end = i
                    break
                else:
                    [mean, meandev] = detect_peaks_update(mean, meandev, bins[i])
                    # print "downhill", i
                    end = i
                    i = i + 1

            windows.append([start, peak, end])
            print "window added", start, peak, end
        else:
            [mean, meandev] = detect_peaks_update(mean, meandev, bins[i])
            # print mean
        i = i + 1
    return windows