import unittest
from unittest.mock import patch
from map_layers.views import dem_from_tnm

class DemFromTNMTests(unittest.TestCase):

    @patch('map_layers.views.requests.get')
    @patch('map_layers.views.imread')
    def test_dem_from_tnm_success(self, mock_imread, mock_get):
        # Mock the requests.get method to return a successful response
        mock_get.return_value.content = b'some_image_data'
        
        # Mock the imread method to return a numpy array
        mock_imread.return_value = some_numpy_array
        
        # Call the dem_from_tnm function with some test data
        bbox = [0, 0, 1, 1]
        width = 100
        height = 100
        inSR = 3857
        result = dem_from_tnm(bbox, width, height, inSR)
        
        # Assert that the requests.get method was called with the correct parameters
        mock_get.assert_called_once_with(
            'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?',
            params={
                'bbox': '0,0,1,1',
                'bboxSR': 3857,
                'size': '100,100',
                'imageSR': 3857,
                'time': None,
                'format': 'tiff',
                'pixelType': 'U16',
                'noData': None,
                'noDataInterpretation': 'esriNoDataMatchAny',
                'interpolation': '+RSP_BilinearInterpolation',
                'compression': None,
                'compressionQuality': None,
                'bandIds': None,
                'mosaicRule': None,
                'renderingRule': None,
                'f': 'image'
            }
        )
        
        # Assert that the imread method was called with the correct parameters
        mock_imread.assert_called_once_with(b'some_image_data')
        
        # Assert that the result is equal to the mocked numpy array
        self.assertEqual(result, some_numpy_array)

    @patch('map_layers.views.requests.get')
    @patch('map_layers.views.imread')
    def test_dem_from_tnm_failure(self, mock_imread, mock_get):
        # Mock the requests.get method to return an unsuccessful response
        mock_get.return_value.content = b''
        
        # Mock the imread method to raise an exception
        mock_imread.side_effect = Exception('Some error')
        
        # Call the dem_from_tnm function with some test data
        bbox = [0, 0, 1, 1]
        width = 100
        height = 100
        inSR = 3857
        result = dem_from_tnm(bbox, width, height, inSR)
        
        # Assert that the requests.get method was called with the correct parameters
        mock_get.assert_called_once_with(
            'https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage?',
            params={
                'bbox': '0,0,1,1',
                'bboxSR': 3857,
                'size': '100,100',
                'imageSR': 3857,
                'time': None,
                'format': 'tiff',
                'pixelType': 'U16',
                'noData': None,
                'noDataInterpretation': 'esriNoDataMatchAny',
                'interpolation': '+RSP_BilinearInterpolation',
                'compression': None,
                'compressionQuality': None,
                'bandIds': None,
                'mosaicRule': None,
                'renderingRule': None,
                'f': 'image'
            }
        )
        
        # Assert that the imread method was called with the correct parameters
        mock_imread.assert_called_once_with(b'')
        
        # Assert that the result is None
        self.assertIsNone(result)

if __name__ == '__main__':
    unittest.main()