# Generated by Django 2.0.5 on 2018-07-29 01:34

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('webapp', '0003_boroughs'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='stations',
            options={'ordering': ['station_name'], 'verbose_name_plural': 'Stations'},
        ),
    ]
