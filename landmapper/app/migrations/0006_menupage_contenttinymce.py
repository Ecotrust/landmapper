# Generated by Django 4.2.7 on 2024-07-31 22:08

from django.db import migrations
import tinymce.models

class Migration(migrations.Migration):

    dependencies = [
        ('app', '0005_menupopup'),
    ]

    operations = [
        migrations.AddField(
            model_name='menupage',
            name='contentTinyMCE',
            field=tinymce.models.HTMLField(blank=True, default='<p>Popup content goes here.</p>', null=True, verbose_name='Popup Body'),
        ),
    ]
