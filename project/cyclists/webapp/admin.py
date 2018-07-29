from django.contrib import admin
from leaflet.admin import LeafletGeoAdmin
from . import  models
from django.contrib.auth.admin import User,Group

# Register your models here.
admin.site.register(models.Bikes)
admin.site.register(models.Stations, LeafletGeoAdmin)
admin.site.register(models.Routes)
admin.site.register(models.Boroughs,LeafletGeoAdmin)

# Remove the default models
admin.site.unregister(User)
admin.site.unregister(Group)