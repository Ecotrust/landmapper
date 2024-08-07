# Generated by Django 4.2.7 on 2024-07-30 19:47

from django.db import migrations, models
import tinymce.models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0004_coa'),
    ]

    operations = [
        migrations.CreateModel(
            name='MenuPopup',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255, verbose_name='Popup Name')),
                ('order', models.SmallIntegerField(default=10)),
                ('staff_only', models.BooleanField(default=False)),
                ('header', models.CharField(blank=True, default=None, max_length=255, null=True, verbose_name='Popup Header')),
                ('content', tinymce.models.HTMLField(blank=True, default='<p>Popup content goes here.</p>', null=True, verbose_name='Popup Body')),
            ],
        ),
    ]
