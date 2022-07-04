import json
import matplotlib.pyplot as plt
import os
import pandas as pd
import csv
import numpy as np

plt.rcParams.update({'font.size': 24})
plt.rcParams["figure.figsize"] = (10, 7)
plt.rcParams["font.weight"] = "bold"
plt.rcParams["axes.labelweight"] = "bold"
plt.grid(alpha=0.2)

col_names = ['datenow', 'timenow', 'rangeIdx', 'dopplerIdx', 'numDetectedObj', 'range', 'peakVal', 'x_coord', 'y_coord',
             'rp_y', 'noiserp_y', 'azimuthz', 'doppz', 'interFrameProcessingTime',
             'interFrameProcessingMargin', 'interChirpProcessingMargin',
             'transmitOutputTime', 'activeFrameCPULoad', 'interFrameCPULoad', 'activity']

maxNumObj = -1
maxlength = -1


def max_numObj(file, maxNumObj):
    df = pd.read_csv(file)
    noObjs = df['numDetectedObj'].to_numpy()
    for noObj in noObjs:
        noObj = int(noObj)
        if noObj > maxNumObj:
            maxNumObj = noObj
            print('maxNumObj', maxNumObj)
    return maxNumObj


def find_files_in_path(old_path):
    files = []
    # old_path = 'data_collection/day2Argha/'
    all_files = os.listdir(old_path)
    for file in all_files:
        filename = file.split('.')
        if filename[-1] == 'json':
            files.append(old_path + file)
    return files


def process_json_to_df(files):
    dfs = []
    for file in files:
        data = [json.loads(line) for line in open(file, 'r')]
        output = pd.DataFrame()
        for d in data:
            activity = {'activity': str(file.split('.')[0].split('/')[-1])}
            d.update(activity)
            output = output.append(d, ignore_index=True)

        output = output[col_names]
        print('len(output[\'doppz\'][0][0])', len(output['doppz'][0][0]))
        dfs.append(output)
    return dfs


def process_txt_to_csv(files):
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
                    writer = csv.DictWriter(csvfile, fieldnames=data.keys())
                    # writer.writeheader()
                    writer.writerow(data)
        print('done writing file', filepath)


def plot_range_vs_frame(df):
    range_vals = []
    time_vals = []
    range_arr = df['range'].to_numpy()
    counter = 0
    for data in range_arr:
        counter += 1
        for d in data:
            range_vals.append(d)
            time_vals.append(counter)
    plt.title('Range vs frame {filename}'.format(filename=df['activity'][0]))
    plt.xlabel('Frames')
    plt.ylabel('Range')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + df['activity'][0]
    plotfile += '_range'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_rangeIdx_vs_frame(file):
    range_vals = []
    time_vals = []
    range_arr = df['rangeIdx'].to_numpy()
    counter = 0
    for data in range_arr:
        counter += 1
        for d in data:
            range_vals.append(d)
            time_vals.append(counter)
    plt.title('rangeIdx vs frame {filename}'.format(filename=df['activity'][0]))
    plt.xlabel('Frames')
    plt.ylabel('rangeIdx')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + df['activity'][0]
    plotfile += '_rangeIdx'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_dopplerIdx_vs_frame(file):
    range_vals = []
    time_vals = []
    range_arr = df['dopplerIdx'].to_numpy()
    counter = 0
    for data in range_arr:
        counter += 1
        for d in data:
            range_vals.append(d)
            time_vals.append(counter)
    plt.title('dopplerIdx vs frame {filename}'.format(filename=df['activity'][0]))
    plt.xlabel('Frames')
    plt.ylabel('dopplerIdx')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + df['activity'][0]
    plotfile += '_dopplerIdx'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_peakVal_vs_frame(file):
    range_vals = []
    time_vals = []
    range_arr = df['peakVal'].to_numpy()
    counter = 0
    for data in range_arr:
        counter += 1
        for d in data:
            range_vals.append(d)
            time_vals.append(counter)
    plt.title('peakVal vs frame {filename}'.format(filename=df['activity'][0]))
    plt.xlabel('Frames')
    plt.ylabel('peakVal')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + df['activity'][0]
    plotfile += '_peakVal'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_x_coord_vs_frame(file):
    range_vals = []
    time_vals = []
    range_arr = df['x_coord'].to_numpy()
    counter = 0
    for data in range_arr:
        counter += 1
        for d in data:
            range_vals.append(d)
            time_vals.append(counter)
    plt.title('x_coord vs frame {filename}'.format(filename=df['activity'][0]))
    plt.xlabel('Frames')
    plt.ylabel('x_coord')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + df['activity'][0]
    plotfile += '_x_coord'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_y_coord_vs_frame(file):
    range_vals = []
    time_vals = []
    range_arr = df['y_coord'].to_numpy()
    counter = 0
    for data in range_arr:
        counter += 1
        for d in data:
            range_vals.append(d)
            time_vals.append(counter)
    plt.title('y_coord vs frame {filename}'.format(filename=df['activity'][0]))
    plt.xlabel('Frames')
    plt.ylabel('y_coord')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + df['activity'][0]
    plotfile += '_y_coord'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def zero_padding(df):
    rangeIdxarr = df['rangeIdx'].to_numpy()
    print('rangeIdxarr.shape', rangeIdxarr.shape)
    dopplerIdxarr = df['dopplerIdx'].to_numpy()
    rangearr = df['range'].to_numpy()
    peakValarr = df['peakVal'].to_numpy()
    x_coordarr = df['x_coord'].to_numpy()
    y_coordarr = df['y_coord'].to_numpy()
    output = pd.DataFrame()
    col_name = ['datenow', 'timenow', 'rangeIdx', 'dopplerIdx', 'numDetectedObj', 'range', 'peakVal', 'x_coord',
                'y_coord', 'rp_y', 'noiserp_y', 'azimuthz', 'doppz', 'activity']
    print('len(y_coordarr)', len(y_coordarr))
    print('y_coordarr.shape', y_coordarr.shape)
    for e in range(0, len(y_coordarr)):
        t = 20 - len(rangeIdxarr[e])
        datenow = df['datenow'][e]
        timenow = df['timenow'][e]
        rangeIdxarre = np.pad(rangeIdxarr[e], pad_width=(0, t), mode='constant')
        t = 20 - len(dopplerIdxarr[e])
        dopplerIdxarre = np.pad(dopplerIdxarr[e], pad_width=(0, t), mode='constant')
        numDetectedObj = df['numDetectedObj'][e]
        t = 20 - len(rangearr[e])
        rangearre = np.pad(rangearr[e], pad_width=(0, t), mode='constant')
        t = 20 - len(peakValarr[e])
        peakValarre = np.pad(peakValarr[e], pad_width=(0, t), mode='constant')
        t = 20 - len(x_coordarr[e])
        x_coordarre = np.pad(x_coordarr[e], pad_width=(0, t), mode='constant')
        t = 20 - len(y_coordarr[e])
        y_coordarre = np.pad(y_coordarr[e], pad_width=(0, t), mode='constant')
        rp_ye = df['rp_y'][e]
        noiserp_ye = df['noiserp_y'][e]
        azimuthze = df['azimuthz'][e]
        print('azimuthze.shape', azimuthze.shape)
        doppze = df['doppz'][e]
        activitye = df['activity'][e]

        dicts = {'datenow': datenow, 'timenow': timenow, 'rangeIdx': rangeIdxarre, 'dopplerIdx': dopplerIdxarre,
                 'numDetectedObj': numDetectedObj, 'range': rangearre, 'peakVal': peakValarre, 'x_coord': x_coordarre,
                 'y_coord': y_coordarre, 'rp_y': rp_ye, 'noiserp_y': noiserp_ye, 'azimuthz': azimuthze, 'doppz': doppze,
                 'activity': activitye}
        output = output.append(dicts, ignore_index=True)
    output = output[col_name]
    return output


files = find_files_in_path('data_collection/day3ArghaAnirbanFine/')
dfs = process_json_to_df(files)
print('len(dfs)', len(dfs))

# outputdfs = []
# for df in dfs:
#     output = zero_padding(df)
#     outputdfs.append(output)
#     print('Done with ', output['activity'][0])
#     break
#
# final_df = pd.concat(outputdfs, axis=0, ignore_index=False, keys=None, levels=None, names=None)
# print('final_df.shape', final_df.shape)
# print(final_df.head())
# print('len(final_df[\'doppz\'][0])', len(final_df['doppz'][0]))
# print('len(final_df[\'doppz\'][0][0])', len(final_df['doppz'][0][0]))
# print('len(final_df[\'noiserp_y\'][0])', len(final_df['noiserp_y'][0]))
# print('len(final_df[\'range\'][0])', len(final_df['range'][0]))


def plot_doppler_frame(df):
    framenoarr = []
    dopplerarrvalue = []
    framenoarr1 = []
    dopplerarrvalue1 = []
    rangeIdxarr = df['rangeIdx'].to_numpy()
    doppvalarr = df['doppz']
    counter = 0
    for e in range(0, len(rangeIdxarr)):
        counter += 1
        for elem in rangeIdxarr[e]:
            if 18 < elem < 25:
                #argha
                doppvalarrframe = np.array(doppvalarr[e])
                print(doppvalarrframe.shape)
                doppvalarrframe = doppvalarrframe.transpose()
                for dope in doppvalarrframe[elem]:
                    if dope > 28000:
                        dopplerarrvalue.append(dope)
                        framenoarr.append(counter)
            if 70 < elem < 140:
                #anirban
                doppvalarrframe = np.array(doppvalarr[e])
                print(doppvalarrframe.shape)
                doppvalarrframe = doppvalarrframe.transpose()
                for dope in doppvalarrframe[elem]:
                    if dope > 28000:
                        dopplerarrvalue1.append(dope)
                        framenoarr1.append(counter)
    plt.scatter(framenoarr, dopplerarrvalue, color='r', label='argha')
    plt.scatter(framenoarr1, dopplerarrvalue1, color='b', label='anirban')
    plt.title('Activity = {activity}'.format(activity=df['activity'][0]))
    plt.legend()
    plt.show()

rangearrval = []
countarr = []
for df in dfs:
    plot_doppler_frame(df)
    # print(df['activity'])