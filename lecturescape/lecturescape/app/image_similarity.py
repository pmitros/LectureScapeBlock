#!/usr/bin/env python
"""Compare two aligned images of the same size.
 
Usage: python compare.py first-image second-image
"""
 
import sys
import os.path 

from scipy.misc import imread
from scipy.linalg import norm
from scipy import sum, average
 
THRESHOLD = 10

def is_same_image(file1, file2):
    #for debugging

    try:
        # file1, file2 = sys.argv[1:1+2]
        # read images as 2D arrays (convert to grayscale for simplicity)
        img1 = to_grayscale(imread(file1).astype(float))
        img2 = to_grayscale(imread(file2).astype(float))
        # compare
        n_m, n_0 = compare_images(img1, img2)
        diff = n_m/img1.size
        # print "[Comp]", file1, file2
        # print "  Manhattan norm:", n_m, "/ per pixel:", diff
        # print "  Zero norm:", n_0, "/ per pixel:", n_0*1.0/img1.size
        if diff < THRESHOLD:
            return [True, round(diff,2)] # average over the last axis (color channels)
        else:
            return [False, round(diff,2)]
    except ValueError:
        # file error. just set to False
        return [False, 0]
    except IOError as e:
        print "I/O error", os.path.isfile(file1), file1, os.path.isfile(file2), file2
        print "I/O error({0}): {1}".format(e.errno, e.strerror)
        # print "file does not exist", file1, file2
        return [False, 0]


def compare_images(img1, img2):
    # normalize to compensate for exposure difference
    img1 = normalize(img1)
    img2 = normalize(img2)
    # calculate the difference and its norms
    diff = img1 - img2  # elementwise for scipy arrays
    m_norm = sum(abs(diff))  # Manhattan norm
    z_norm = norm(diff.ravel(), 0)  # Zero norm
    return (m_norm, z_norm)

 
def to_grayscale(arr):
    "If arr is a color image (3D array), convert it to grayscale (2D array)."
    if len(arr.shape) == 3:
        return average(arr, -1)  # average over the last axis (color channels)
    else:
        return arr

 
def normalize(arr):
    rng = arr.max()-arr.min()
    amin = arr.min()
    return (arr-amin)*255/rng

 
if __name__ == "__main__":
    is_same_image(sys.argv[1], sys.argv[2])