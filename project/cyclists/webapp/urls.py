from django.urls import re_path
from . import views

app_name = 'webapp'

urlpatterns = [
    # /home/
    re_path(r'^$', views.index, name = 'index'),
    # /home/stations_pairs_routes
    re_path(r'^stations-pairs-routes/(?P<year>\d+)/(?P<sid>\d+)$', views.load_routes_of_station, name= 'stations_pairs_routes'),
    # /home/ref-routes/
    re_path(r'^ref-routes/(?P<sid>\d+)$', views.load_reference_routes, name = 'ref-routes'),
    # home/frequencies
    re_path(r'^frequencies/(?P<sid>\d+)$', views.load_frequencies, name ='frequencies'),
    # home/stations/pk
    re_path(r'^stations/(?P<pk>\d+)$', views.load_unique_station, name= 'station-unique'),
    # home/stations/
    re_path(r'^stations/', views.load_stations, name = 'stations'),
    # home/kmeans/layer/n_cluster
    re_path(r'^kmeans/(?P<layer>\w+)/(?P<n_cluster>\d+)$',views.load_kmeans, name = 'kmeans'),
    #home/boroughs/
    re_path(r'^boroughs/', views.load_boroughs, name = 'boroughs'),
    # home/stations-info/station_id
    re_path(r'^stations-info/(?P<pk>\d+)$', views.station_info, name= 'station-info'),
    # home/stations-info/
    re_path(r'^stations-info/', views.stations_info, name= 'stations-info'),
    # home/heatmap/(?P<name>\w+)$
    re_path(r'^heatmap/(?P<name>\w+)$', views.load_heatmap_data, name = 'heatmap'),
]