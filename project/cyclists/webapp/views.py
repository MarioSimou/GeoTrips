from django.shortcuts import render
from django.shortcuts import get_object_or_404, get_list_or_404, Http404
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.core.serializers import serialize
from django.core.paginator import Paginator
from . import models
from sklearn.cluster import KMeans
import numpy as np
from matplotlib import pyplot as plt
from functools import reduce
from datetime import datetime
import json
from requests import get
from re import findall
from time import time
import timeit

import pdb
from tqdm import tqdm

# Create your views here.
# request -> an HttpRequest object that can be accessed.
# views -> functions that process an HttpRequest and return an HttpResponse
def index(request):
    stations = get_list_or_404(models.Stations)
    return render(request, 'webapp/index.html', {'stations' : stations })
# request a unique station based on pk
def load_unique_station(request,pk):
    try:
        station_pk = serialize('geojson',models.Stations.objects.filter(station_id = pk))
    except:
        raise Http404('Unknown station')
    return HttpResponse(station_pk,content_type='json')

# stations GeoJSON load
def load_stations(request):
    try:
        stations = serialize('geojson', models.Stations.objects.all())
    except:
        raise Http404('Stations could not be found')
    return HttpResponse(stations, content_type='json')

def load_kmeans(request, layer,n_cluster):
    mat = []
    if layer == 'stations':
        stations = get_list_or_404(models.Stations.objects.all())
        for station in stations:
            coords = station.location.coords[0]
            mat.append([coords[0],coords[1],station.freq])
    elif layer == 'boroughs':
        boroughs = get_list_or_404(models.Boroughs.objects.all())
        for borough in boroughs:
            coords = borough.geom.centroid.coords
            mat.append([coords[0],coords[1],borough.freq])
    else:
        raise Http404('Call not found')

    clusters = [[[],[],[]] for i in range(int(n_cluster))]
    for i,j in np.ndenumerate(KMeans(n_clusters=int(n_cluster)).fit_predict(mat)):
        index = i[0]
        clusters[j][0].append(mat[index][0]) # longitude
        clusters[j][1].append(mat[index][1]) # latitude
        clusters[j][2].append(mat[index][2]) # frequency
    return JsonResponse(clusters,safe=False)

def load_frequencies(request,sid):
    boroughs_freq = [borough.freq for borough in models.Boroughs.objects.all()]
    stations_freq = [station.freq for station in models.Stations.objects.all()]
    ref_routes = [ref_route.freq for ref_route in models.Stations_Pairs_Routes.objects.filter(start_station_id=sid)]

    return JsonResponse({'boroughs': boroughs_freq, 'stations': stations_freq, 'refRoutes': ref_routes},safe = True)

# boroughs GeoJSON load
def load_boroughs(request):
    try:
        boroughs = serialize('geojson', models.Boroughs.objects.all())
    except:
        raise Http404('Boroughs could not be loaded..')

    return HttpResponse(boroughs, content_type= 'json')

# baseline routes GeoJSON load
def load_reference_routes(request,year,sid):
    start = time()
    try:
        # selects routes of a certain year and sid
        l = set([route.station_pairs_id.id for route in models.Routes.objects.filter(start_date__gte=f'{year}-01-01 00:00').select_related().filter(station_pairs_id__start_station_id=sid)])
        ref_routes = serialize('geojson', models.Stations_Pairs_Routes.objects.filter(id__in = l))
    except:
        raise Http404('Reference Routes could not be loaded...')
    stop = time()
    print(stop-start)
    return HttpResponse(ref_routes, content_type='json')


def load_routes_of_station(request,year,sid):

    # only specific routes of a year
    routes_of_sid = models.Routes.objects.filter(start_date__gte = f'{year}-01-01 00:00').filter(station_pairs_id__start_station_id=sid)
    routes = [{'start_date': route.start_date,'end_date':route.end_date,'duration':route.duration,'bike_id': route.bike_id.bike_id, 'id': route.station_pairs_id.id} for route in routes_of_sid]
    return JsonResponse(routes, safe=False)

def stations_info(request):
    # Load the boroughs and stations
    stations_list = models.Stations.objects.all().order_by('station_id')
    boroughs_list = models.Boroughs.objects.all()
    paginator = Paginator(stations_list, 18) # Show 20 contacts per page

    # Requests the corresponding page and create a paginator
    page = request.GET.get('page')
    stations = paginator.get_page(page)
    # identify at which borough each station belongs
    stations_borough = dict([(station.station_id,borough.name) for station in stations if (station.location is not None) for borough in boroughs_list if borough.geom.contains(station.location)])

    return render(request, 'webapp/stations-info.html', {'stations' : stations, 'stations_borough' : stations_borough})

def station_info(request,pk):
    # Gets the user selected station
    station = get_list_or_404(models.Stations.objects.get(station_id=pk))
    # Creates a paginator of the routes related to the selected station
    routes_paginator = Paginator(station.start_stations.all(), 16)

    # Requests the correspond page from the routes_paginator and creates the routes and assigns the routes variable
    page = request.GET.get('page')
    routes = routes_paginator.get_page(page)

    return render(request, 'webapp/station-info.html', {'station' : station, 'routes' : routes})

def load_heatmap_data(request, name):
    # Gets the station data
    l_model = None
    if name == 'stations':
        stations = get_list_or_404(models.Stations)
        l_model = [{'lat': station.location.coords[0][1], 'lng': station.location.coords[0][0], 'freq': station.freq } for station in stations if station.location is not None]
    elif name == 'boroughs':
        boroughs = get_list_or_404(models.Boroughs)
        l_model = [{'lat': borough.geom.centroid.coords[1], 'lng': borough.geom.centroid.coords[0], 'freq': borough.freq } for borough in boroughs if borough.geom is not None]

    return JsonResponse(l_model, safe = False)

