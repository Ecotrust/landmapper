from django.conf import settings
from app.models import MenuPage
from app.models import MenuPopup

def menus(request):
    return {'menu_items': MenuPage.objects.all().order_by('order')}

def popups(request):
    return {'menu_popups': MenuPopup.objects.all()}

def study_region(request):
    return {
        'STUDY_REGION': settings.STUDY_REGION
    }

def google_analytics(request):
    return {
        'GOOGLE_ANALYTICS_KEY': settings.GOOGLE_ANALYTICS_KEY
    }