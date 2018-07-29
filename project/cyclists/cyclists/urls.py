import sys
import os
sys.path.insert(0,os.path.abspath(os.path.join(os.path.dirname(__file__),'..', 'tflcrawler')))
from django.contrib import admin
from django.urls import re_path, include
from django.views.generic import RedirectView
from crawler import TflCrawler
from webapp import models
from django.shortcuts import get_list_or_404

urlpatterns = [
    # 127.0.0.1:port/admin/
    re_path(r'^admin/', admin.site.urls),
    # 127.0.0.1:port/home/
    re_path(r'^home/', include('webapp.urls')),
    # 127.0.0.1:port/ -> 127.0.0.1:port/home/
    re_path(r'^$', RedirectView.as_view(url='/home/', permanent = True)), # automatically redirect to the home website

]

def gather_files():
    print('Gather files is executed...')
    driver_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..','tflcrawler','chromedriver'))
    csv_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..','..', '..','csv'))
    print(f'DRIVER DIR : {driver_dir} ')
    print(f'CSV DIR : {csv_dir}')

    crawler = TflCrawler()
    crawler.parse()
    crawler.retrieve_csv_files(DNS='host=localhost dbname=cyclists_db user=masimou password=ma.SI3007',rel_path= csv_dir)

# Function that is called only once
#gather_files()


