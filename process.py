import json
import matplotlib.pyplot as plt

col_names = ['datenow', 'timenow', 'rangeIdx', 'dopplerIdx', 'numDetectedObj', 
            'rp_y', 'noiserp_y', 'azimuthz', 'doppz', 'interFrameProcessingTime', 
            'interFrameProcessingMargin', 'interChirpProcessingMargin', 
            'transmitOutputTime', 'activeFrameCPULoad', 'interFrameCPULoad']

range_val = []
time_val = []
counter = 0
with open('data.txt', 'r') as file:
    lines = file.readlines()
    for line in lines:
        data = json.loads(line)
        counter += 1
        time_val.append(counter)
        print(data['doppz'])
        break
