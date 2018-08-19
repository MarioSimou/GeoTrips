from django.shortcuts import render
from django.shortcuts import get_object_or_404, get_list_or_404, Http404
from django.http import HttpResponse, JsonResponse, StreamingHttpResponse
from django.core.serializers import serialize
from django.core.paginator import Paginator
from . import models
from sklearn.cluster import KMeans
import numpy as np
from time import time
from django.db import connection

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
        l = set(models.Routes.objects.filter(start_date__gte=f'{year}-01-01 00:00').select_related().filter(station_pairs_id__start_station_id=sid).values_list('station_pairs_id',flat=True).distinct())
        # gets the reference routes that have been covered this on the specified year
        ref_routes = serialize('geojson', get_list_or_404(models.Stations_Pairs_Routes, id__in = l))
    except:
        raise Http404('Reference Routes could not be loaded...')
    stop = time()
    print(f'{stop-start} to load Station_Pairs_ROutes model...')
    return HttpResponse(ref_routes, content_type='json')


def load_routes_of_station(request,year,sid):
    start = time()
    # only specific routes of a year
    # gets a list of the filtered routes
    routes_of_sid = get_list_or_404(models.Routes, start_date__gte = f'{year}-01-01 00:00', station_pairs_id__start_station_id=sid)
    # serialize the results to a json format
    r = serialize('json',routes_of_sid,fields = ('start_date','end_date','duration','bike_id', 'station_pairs_id'))
    stop = time()
    print(f'{stop-start} to load Routes model')
    # loads the json
    return HttpResponse(r,content_type='json')

def load_routes_temporal_data(request, year,sid):
    cursor = connection.cursor()
    cursor.execute(f"SELECT date_trunc('month',start_date) as date, COUNT(start_date) FROM webapp_routes as a LEFT JOIN webapp_stations_pairs_routes as b ON a.station_pairs_id=b.id WHERE a.start_date > '{year}-01-01 00:00' AND a.start_date < '{int(year)+1}-01-01' AND b.start_station_id = {sid} GROUP BY date_trunc('month', start_date);")
    monthly_routes = dict([(str(month[0].date()), {'month' : str(month[0].date()), 'count' : month[1]})for month in cursor.fetchall()])
    return JsonResponse(monthly_routes, safe= True)

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

def station_info(request,sid):
    # Gets the user selected station
    cursor = connection.cursor()
    cursor.execute(f"SELECT * FROM webapp_stations")
    stations = dict([(station[0],station[1]) for station in cursor.fetchall()])
    # call of routes
    cursor.execute(f"SELECT b.end_station_id,c.start_date, c.end_date, c.duration FROM webapp_stations as a LEFT JOIN webapp_stations_pairs_routes as b ON a.station_id = b.start_station_id LEFT JOIN webapp_routes as c ON b.id = c.station_pairs_id WHERE a.station_id = {sid} ORDER BY c.start_date DESC")
    # Creates a paginator of the routes related to the selected station
    routes_paginator = Paginator(cursor.fetchall(), 16)

    # Requests the correspond page from the routes_paginator and creates the routes and assigns the routes variable
    page = request.GET.get('page')
    routes = routes_paginator.get_page(page)

    return render(request, 'webapp/station-info.html', {'station' : models.Stations.objects.get(pk=sid), 'routes' : routes, 'stations' : stations })

def load_heatmap_data(request, name, id = all):
    # Gets the station data
    l_model = None
    if name == 'stations':
        stations = get_list_or_404(models.Stations)
        l_model = [{'lat': station.location.coords[0][1], 'lng': station.location.coords[0][0], 'freq': station.freq } for station in stations if station.location is not None]
    elif name == 'boroughs':
        boroughs = get_list_or_404(models.Boroughs)
        l_model = [{'lat': borough.geom.centroid.coords[1], 'lng': borough.geom.centroid.coords[0], 'freq': borough.freq } for borough in boroughs if borough.geom is not None]

    return JsonResponse(l_model, safe = False)

