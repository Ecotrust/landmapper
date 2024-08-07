# Generated by Django 4.2.7 on 2024-07-31 22:25

from django.db import migrations

def ckeditor_to_tinymce(apps, schema_editor):
    MenuPage = apps.get_model('app', 'MenuPage')

    for page in MenuPage.objects.all():
        page.contentTinyMCE = page.content
        page.save()

def tinymce_to_ckeditor(apps, schema_editor):
    MenuPage = apps.get_model('app', 'MenuPage')

    for page in MenuPage.objects.all():
        page.content = page.contentTinyMCE
        page.save()

class Migration(migrations.Migration):

    dependencies = [
        ('app', '0006_menupage_contenttinymce'),
    ]

    operations = [
        migrations.RunPython(ckeditor_to_tinymce, tinymce_to_ckeditor),
    ]