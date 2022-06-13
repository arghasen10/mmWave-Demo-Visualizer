import json
import matplotlib.pyplot as plt
import os
import pandas as pd
import csv

col_names = ['datenow', 'timenow', 'rangeIdx', 'dopplerIdx', 'numDetectedObj', 
            'rp_y', 'noiserp_y', 'azimuthz', 'doppz', 'interFrameProcessingTime', 
            'interFrameProcessingMargin', 'interChirpProcessingMargin', 
            'transmitOutputTime', 'activeFrameCPULoad', 'interFrameCPULoad', 'activity']



# with open('coarse_activity.csv', 'w') as f:
#     csv.DictWriter(f, fieldnames=col_names).writeheader()

# range_val = []
# time_val = []
files = []
all_files = os.listdir()
for file in all_files:
    if file.split('.')[-1] == 'txt':
        files.append(file)
#
# counter = 0
for file in files:
    filepath = file.split('.')[0]
    filepath += '.csv'
    with open(filepath, 'w') as f:
        csv.DictWriter(f, fieldnames=col_names).writeheader()
    with open(file, 'r') as datafile:
        lines = datafile.readlines()
        for line in lines:
            data = json.loads(line)
            activity = {'activity': str(file.split('.')[0])}
            data.update(activity)
            with open(filepath, 'a') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames = data.keys())
                # writer.writeheader()
                writer.writerow(data)
    print('done writing file', filepath)


# df1 = pd.read_csv(files[0])
# print(df1['activity'].head())
