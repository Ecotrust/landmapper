from django.conf import settings
from app.models import MenuPage
def menus(request):
    return {'menu_items': MenuPage.objects.all().order_by('order')}

def study_region(request):
    return {
        'STUDY_REGION': settings.STUDY_REGION
    }