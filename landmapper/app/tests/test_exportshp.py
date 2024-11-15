from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch, MagicMock
from django.conf import settings
from django.http import HttpResponse
from app.models import PropertyRecord, User
from app import properties
import os
import io
import zipfile
import subprocess
import unittest

class ExportLayerTests(TestCase):

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testy', password='astrongpassword')
        self.property_record = PropertyRecord.objects.create(
            user=self.user,
            name='Test Property',
            geometry_final='POINT(0 0)'
        )
        self.url = reverse('export_layer', args=[self.property_record.id])

    @patch('app.views.properties.get_property_by_id')
    @patch('app.views.export_shapefile')
    @patch('app.views.zip_shapefile')
    def test_export_layer_success(self, mock_zip_shapefile, mock_export_shapefile, mock_get_property_by_id):
        mock_get_property_by_id.return_value = self.property_record
        mock_zip_shapefile.return_value = io.BytesIO(b'some_zip_data')

        self.client.login(username='testy', password='astrongpassword')
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/zip')
        self.assertIn('attachment; filename=', response['Content-Disposition'])
        mock_export_shapefile.assert_called_once()
        mock_zip_shapefile.assert_called_once()

    @patch('app.views.properties.get_property_by_id')
    def test_export_layer_property_not_found(self, mock_get_property_by_id):
        mock_get_property_by_id.side_effect = PropertyRecord.DoesNotExist

        self.client.login(username='testuser', password='astrongpassword')
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.content.decode(), 'Property not found or you do not have permission to access it.')

    @patch('app.views.properties.get_property_by_id')
    @patch('app.views.export_shapefile')
    @patch('app.views.zip_shapefile')
    def test_export_layer_export_error(self, mock_zip_shapefile, mock_export_shapefile, mock_get_property_by_id):
        mock_get_property_by_id.return_value = self.property_record
        mock_export_shapefile.side_effect = subprocess.CalledProcessError(1, 'pgsql2shp')

        self.client.login(username='testy', password='astrongpassword')
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.content.decode(), 'Error exporting shapefile.')
        mock_export_shapefile.assert_called_once()
        mock_zip_shapefile.assert_not_called()

    # Test case to ensure that unauthenticated users are redirected to the login page.
    def test_export_layer_user_not_authenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 302)  # Redirect to login

    @patch('app.views.properties.get_property_by_id')
    @patch('app.views.export_shapefile')
    @patch('app.views.zip_shapefile')
    def test_export_layer_cleanup(self, mock_zip_shapefile, mock_export_shapefile, mock_get_property_by_id):
        mock_get_property_by_id.return_value = self.property_record
        mock_zip_shapefile.return_value = io.BytesIO(b'some_zip_data')

        # Patch os.remove and os.rmdir to prevent actual file system changes during the test
        with patch('os.remove') as mock_remove, patch('os.rmdir') as mock_rmdir:
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 200)
            mock_remove.assert_called()
            mock_rmdir.assert_called_once()

