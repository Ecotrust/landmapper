# Generated by Django 4.2.7 on 2024-07-31 22:32

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0009_rename_contenttinymce_menupage_content'),
    ]

    operations = [
        migrations.DeleteModel(
            name='MenuPopup',
        ),
    ]