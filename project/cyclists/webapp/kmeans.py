
from sklearn.cluster import KMeans
from scipy.spatial.distance import cdist,pdist
import sys
import os
path = os.path.abspath(os.path.dirname(__file__))
print(path)
sys.path.insert(0,path)
print(sys.path)
from models import Stations,Boroughs
from django.shortcuts import get_list_or_404
from matplotlib import  pyplot as plt
import pandas as pd
import numpy as np

layer = 'stations'
#mat = [] # [longitude,latitude, flow]
df = pd.DataFrame({'longitude': [], 'latitude': [], 'freq': []})
if layer == 'stations':
    stations = get_list_or_404(Stations.objects.all())
    for station in stations:
        coords = station.location.coords[0]
        df = df.append({'longitude': coords[0], 'latitude': coords[1], 'freq': station.freq}, ignore_index=True)
        #mat.append([coords[0], coords[1], station.freq])
elif layer == 'boroughs':
    boroughs = get_list_or_404(Boroughs.objects.all())
    for borough in boroughs:
        coords = borough.geom.centroid.coords
        df = df.append({'longitude': coords[0], 'latitude': coords[1], 'freq': borough.freq}, ignore_index=True)
        #mat.append([coords[0], coords[1], borough.freq])
else:
    raise Exception('Call not found')

Nc = range(1, 21)
# fit the kmeans model for n_cluster = n
k_means_var = [KMeans(n_clusters=n).fit(df) for n in Nc]
# pull out the cluster centers for each model
centroids = [X.cluster_centers_ for X in k_means_var]

# Calculate the euclidean distance from each point of the dataset to each cluster center
k_euclid = [cdist(df,centroid, 'euclidean') for centroid in centroids] # euclidean distance from a point i to a cluster center
dist = [np.min(ke,axis=1) for ke in k_euclid]

#  within cluster sum of squares - the total distances of points to the outer clusters
wcss = [sum(d**2) for d in dist] # calculates the sum of all points i of the dataset (without the sqrt)
# Total distances of points within a set
tss = sum(pdist(df)**2)/df.shape[0]
# the between-cluster sum of squares
bss = tss - wcss
percentage_bss = list(map(lambda x: 100*(x/max(bss)), bss))


yy = percentage_bss[:4]
xx = np.ones(len(yy)) * 4 # change value to adjust it on the lahyer

plt.plot(Nc,percentage_bss, 'r--', linewidth= 2)
plt.plot(Nc[3],percentage_bss[3],'bo')
plt.plot(xx,yy,'b-.')
plt.text(Nc[3],percentage_bss[3]-8,'$Optimal\;K$')
plt.xlabel('$Number\;of\;clusters\;(k)$')
plt.ylabel('$Percentage\;of\;Variance\;Explained$')
plt.title('$Stations\;Layer$')
plt.savefig('/home/masimou/Desktop/Project-Platform/report-writing/img/stations_distances.png')
plt.show()