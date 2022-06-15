import json
import matplotlib.pyplot as plt
import os
import pandas as pd
import csv

plt.rcParams.update({'font.size': 24})
plt.rcParams["figure.figsize"] = (10,7)
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
            print(maxNumObj)
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
        print(len(output['doppz'][0][0]))
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
                    writer = csv.DictWriter(csvfile, fieldnames = data.keys())
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


files = find_files_in_path('data_collection/day2Argha/')
dfs = process_json_to_df(files)
print(len(dfs))

for df in dfs:
    plot_rangeIdx_vs_frame(df)
    plot_peakVal_vs_frame(df)
    plot_x_coord_vs_frame(df)
    plot_dopplerIdx_vs_frame(df)
    plot_range_vs_frame(df)
    plot_y_coord_vs_frame(df)

