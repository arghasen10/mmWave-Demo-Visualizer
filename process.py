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


def find_files_in_path(old_path):
    files = []
    # old_path = 'data_collection/day2Argha/'
    all_files = os.listdir(old_path)
    for file in all_files:
        filename = file.split('.')
        if filename[-1] == 'csv':
            files.append(old_path + file)
    return files


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


def plot_range_vs_frame(file):
    df = pd.read_csv(file)
    print(file)
    range_vals = []
    time_vals = []
    range_arr = df['range'].to_numpy()
    counter = 0
    for datas in range_arr:
        counter += 1
        data = datas.split('[')[1].split(']')[0].split(',')
        for d in data:
            range_vals.append(float(d.strip()))
            time_vals.append(counter)
    filename = str(file.split('/')[-1].split('.')[0])
    plt.title('Range vs frame {filename}'.format(filename=filename))
    plt.xlabel('Frames')
    plt.ylabel('Range')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + filename
    plotfile += '_range'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()

def plot_rangeIdx_vs_frame(file):
    df = pd.read_csv(file)
    print(file)
    range_vals = []
    time_vals = []
    range_arr = df['rangeIdx'].to_numpy()
    counter = 0
    for datas in range_arr:
        counter += 1
        data = datas.split('[')[1].split(']')[0].split(',')
        for d in data:
            range_vals.append(float(d.strip()))
            time_vals.append(counter)
    filename = str(file.split('/')[-1].split('.')[0])
    plt.title('rangeIdx vs frame {filename}'.format(filename=filename))
    plt.xlabel('Frames')
    plt.ylabel('rangeIdx')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + filename
    plotfile += '_rangeIdx'
    plotfile += '.pdf'
    plt.savefig(plotfile, format="pdf")
    plt.show()


def plot_dopplerIdx_vs_frame(file):
    df = pd.read_csv(file)
    print(file)
    range_vals = []
    time_vals = []
    range_arr = df['dopplerIdx'].to_numpy()
    counter = 0
    for datas in range_arr:
        counter += 1
        data = datas.split('[')[1].split(']')[0].split(',')
        for d in data:
            range_vals.append(float(d.strip()))
            time_vals.append(counter)
    filename = str(file.split('/')[-1].split('.')[0])
    plt.title('dopplerIdx vs frame {filename}'.format(filename=filename))
    plt.xlabel('Frames')
    plt.ylabel('dopplerIdx')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + filename
    plotfile += '_dopplerIdx'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_peakVal_vs_frame(file):
    df = pd.read_csv(file)
    print(file)
    range_vals = []
    time_vals = []
    range_arr = df['peakVal'].to_numpy()
    counter = 0
    for datas in range_arr:
        counter += 1
        data = datas.split('[')[1].split(']')[0].split(',')
        for d in data:
            range_vals.append(float(d.strip()))
            time_vals.append(counter)
    filename = str(file.split('/')[-1].split('.')[0])
    plt.title('peakVal vs frame {filename}'.format(filename=filename))
    plt.xlabel('Frames')
    plt.ylabel('peakVal')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + filename
    plotfile += '_peakVal'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_x_coord_vs_frame(file):
    df = pd.read_csv(file)
    print(file)
    range_vals = []
    time_vals = []
    range_arr = df['x_coord'].to_numpy()
    counter = 0
    for datas in range_arr:
        counter += 1
        data = datas.split('[')[1].split(']')[0].split(',')
        for d in data:
            range_vals.append(float(d.strip()))
            time_vals.append(counter)
    filename = str(file.split('/')[-1].split('.')[0])
    plt.title('x_coord vs frame {filename}'.format(filename=filename))
    plt.xlabel('Frames')
    plt.ylabel('x_coord')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/' + filename
    plotfile += '_x_coord'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


def plot_y_coord_vs_frame(file):
    df = pd.read_csv(file)
    print(file)
    range_vals = []
    time_vals = []
    range_arr = df['y_coord'].to_numpy()
    counter = 0
    for datas in range_arr:
        counter += 1
        data = datas.split('[')[1].split(']')[0].split(',')
        for d in data:
            range_vals.append(float(d.strip()))
            time_vals.append(counter)
    filename = str(file.split('/')[-1].split('.')[0])
    plt.title('y_coord vs frame {filename}'.format(filename=filename))
    plt.xlabel('Frames')
    plt.ylabel('y_coord')
    plt.scatter(time_vals, range_vals)
    plotfile = 'data_collection/results/'+filename
    plotfile += '_y_coord'
    plotfile += '.pdf'
    plt.savefig(plotfile, bbox_inches='tight', format='pdf')
    plt.show()


files = find_files_in_path('data_collection/day2Argha/')
for file in files:
    plot_rangeIdx_vs_frame(file)
    plot_peakVal_vs_frame(file)
    plot_x_coord_vs_frame(file)
    plot_dopplerIdx_vs_frame(file)
    plot_range_vs_frame(file)
    plot_y_coord_vs_frame(file)
