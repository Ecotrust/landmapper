from django.conf import settings
from app.models import MenuPage
import json

def menus(request):
    return {'menu_items': MenuPage.objects.all().order_by('order')}

def study_region(request):
    study_region_data = settings.STUDY_REGION.copy()
    # Convert params dict to JSON string for JavaScript consumption
    if 'params' in study_region_data:
        study_region_data['params_json'] = json.dumps(study_region_data['params'])
    return {
        'STUDY_REGION': study_region_data
    }

def google_analytics(request):
    return {
        'GOOGLE_ANALYTICS_KEY': settings.GOOGLE_ANALYTICS_KEY
    }