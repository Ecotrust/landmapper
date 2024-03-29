# Generated by Django 4.2b1 on 2023-03-17 19:46

import app.models
from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contenttypes', '0002_remove_content_type_name'),
        ('auth', '0012_alter_user_first_name_max_length'),
        ('app', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Property',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Name')),
                ('date_created', models.DateTimeField(auto_now_add=True, verbose_name='Date Created')),
                ('date_modified', models.DateTimeField(auto_now=True, verbose_name='Date Modified')),
                ('object_id', models.PositiveIntegerField(blank=True, null=True)),
                ('manipulators', models.TextField(blank=True, help_text='csv list of manipulators to be applied', null=True, verbose_name='Manipulator List')),
                ('geometry_orig', django.contrib.gis.db.models.fields.MultiPolygonField(blank=True, null=True, srid=3857, verbose_name='Original Polygon Geometry')),
                ('geometry_final', django.contrib.gis.db.models.fields.MultiPolygonField(blank=True, null=True, srid=3857, verbose_name='Final Polygon Geometry')),
                ('property_map_image', models.ImageField(null=True, upload_to=None)),
                ('aerial_map_image', models.ImageField(null=True, upload_to=None)),
                ('street_map_image', models.ImageField(null=True, upload_to=None)),
                ('terrain_map_image', models.ImageField(null=True, upload_to=None)),
                ('stream_map_image', models.ImageField(null=True, upload_to=None)),
                ('soil_map_image', models.ImageField(null=True, upload_to=None)),
                ('forest_map_image', models.ImageField(null=True, upload_to=None)),
                ('scalebar_image', models.ImageField(null=True, upload_to=None)),
                ('context_scalebar_image', models.ImageField(null=True, upload_to=None)),
                ('medium_scalebar_image', models.ImageField(null=True, upload_to=None)),
                ('property_map_image_alt', models.ImageField(null=True, upload_to=None)),
                ('report_data', models.JSONField(default=app.models.Property.report_default, verbose_name='report_data')),
                ('content_type', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='%(app_label)s_%(class)s_related', to='contenttypes.contenttype')),
                ('sharing_groups', models.ManyToManyField(blank=True, editable=False, related_name='%(app_label)s_%(class)s_related', to='auth.group', verbose_name='Share with the following groups')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='%(app_label)s_%(class)s_related', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
