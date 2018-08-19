from django.db import models
from django.contrib.gis.db import models as models_gis
from django.contrib.postgres.fields import JSONField

# Create your models here.
class Bikes(models.Model):
    bike_id = models.PositiveIntegerField(verbose_name='Bike Id', primary_key= True, unique= True, null= False)

    class Meta:
        verbose_name_plural = 'Bikes'

    def __str__(self):
        return f'{self.bike_id}'

class Stations(models_gis.Model):
    station_id = models_gis.PositiveIntegerField(verbose_name= 'Station Id',primary_key= True, unique= True, null= False)
    station_name = models_gis.CharField(verbose_name='Name',max_length= 500, null = False)
    location = models_gis.MultiPointField(srid= 4326,null= True, blank= True, unique=True)
    freq = models_gis.PositiveIntegerField(null = True, blank = True)

    class Meta:
        verbose_name_plural = 'Stations'
        ordering = ['station_name']

    def __str__(self):
        return f'{self.station_id} -{self.station_name} - {self.location}'

class Stations_Pairs_Routes(models_gis.Model):
    start_station_id = models_gis.ForeignKey(Stations,on_delete=models_gis.CASCADE,related_name='start_stations',db_column='start_station_id', verbose_name='Start Station Id', null=False)
    end_station_id = models_gis.ForeignKey(Stations,on_delete=models_gis.CASCADE, related_name='end_stations',db_column='end_station_id', verbose_name='End Station Id', null= False)
    balanced_ref_dist = models_gis.FloatField(verbose_name='Balanced Ref Distance', null = True, blank = True)
    balanced_ref_time = models_gis.PositiveIntegerField(verbose_name='Balanced Ref Time', null = True, blank=True)
    balanced_ref_geom = models_gis.LineStringField(srid=4326, null= True, blank=True)
    freq = models_gis.PositiveIntegerField(verbose_name='Frequency', null =True,blank = True)

    def __str__(self):
        return f'{self.start_station_id} - {self.end_station_id}'

class Routes(models.Model):
    rental_id = models.PositiveIntegerField(verbose_name='Rental Id',primary_key= True, unique= True, null = False)
    start_date = models.DateTimeField(verbose_name='Start Date',null = False)
    end_date = models.DateTimeField(verbose_name='End Date',null = False)
    duration = models.PositiveIntegerField(verbose_name= 'Duration',null= False)
    bike_id = models.ForeignKey(Bikes, verbose_name='Bike Id',null = False, on_delete= models.CASCADE,db_column='bike_id', related_name= 'bike_routes')
    station_pairs_id = models.ForeignKey(Stations_Pairs_Routes, on_delete = models.CASCADE, db_column='station_pairs_id',related_name = 'station_pairs',null= False, verbose_name='Station Pairs Id')

    class Meta:
        verbose_name_plural = 'Routes'
        ordering = ['-start_date'] # orders the routes base on start_date attribute in reversed order

    def __str__(self):
        return f'{self.rental_id}'

class Boroughs(models_gis.Model):
    name = models_gis.CharField(unique=True,max_length=22)
    gss_code = models_gis.CharField(max_length=9)
    hectares = models_gis.FloatField()
    nonld_area = models_gis.FloatField()
    geom = models_gis.MultiPolygonField(srid=4326)
    freq = models_gis.PositiveIntegerField(null= True, blank = True)

    class Meta:
        verbose_name_plural = 'Boroughs'
    def __str__(self):
        return f'{self.name}'



