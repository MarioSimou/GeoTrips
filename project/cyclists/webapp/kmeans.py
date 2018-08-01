from sklearn.cluster import KMeans
import sys
import os
path = os.path.abspath(os.path.dirname(__file__))
print(path)
sys.path.insert(0,path)
print(sys.path)
from models import Stations,Boroughs
from django.shortcuts import get_list_or_404
from matplotlib import  pyplot as plt

layer = 'stations'
mat = []
if layer == 'stations':
    stations = get_list_or_404(Stations.objects.all())
    for station in stations:
        coords = station.location.coords[0]
        mat.append([coords[0], coords[1], station.freq])
elif layer == 'boroughs':
    boroughs = get_list_or_404(Boroughs.objects.all())
    for borough in boroughs:
        coords = borough.geom.centroid.coords
        mat.append([coords[0], coords[1], borough.freq])
else:
    raise Exception('Call not found')

Nc = range(1, 20)
kmeans = [KMeans(n_clusters=i) for i in Nc]
score = [kmeans[i].fit(mat).score(mat) for i in range(len(kmeans))]
plt.plot(score, color='green', marker='o', linestyle='dashed')
plt.show()
