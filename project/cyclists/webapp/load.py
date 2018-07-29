import os
from django.contrib.gis.utils import LayerMapping
from .models import Boroughs

boroughs_mapping = {
    'name': 'NAME',
    'gss_code': 'GSS_CODE',
    'hectares': 'HECTARES',
    'nonld_area': 'NONLD_AREA',
    'geom': 'MULTIPOLYGON',
}


boroughs_shp = os.path.abspath(os.path.join(os.path.dirname(__file__), 'data','boroughs','Boroughs.shp'))

def run(verbose=True):
    lm = LayerMapping(
        Boroughs, boroughs_shp,boroughs_mapping, transform=False,encoding='iso-8859-1'
    )
    lm.save(strict=True,verbose=verbose)


