from django.db import models
from django.contrib.gis.db.models import MultiPolygonField, GeoManager
from drawing.models import AOI as drawing_AOI
from features.registry import register

# Create your models here.
@register
class AOI(drawing_AOI):

    class Options:
        verbose_name = 'Area of Interest'
        icon_url = 'marco/img/aoi.png'
        export_png = False
        manipulators = []
        # optional_manipulators = ['clipping.manipulators.ClipToShoreManipulator']
        optional_manipulators = []
        form = 'drawing.forms.AOIForm'
        # form_template = 'aoi/form.html'
        form_template = 'landmapper/aoi/form.html'
        show_template = 'aoi/show.html'

class Taxlot(models.Model):
    class Meta:
        verbose_name = 'Taxlot'
        verbose_name_plural = 'Taxlots'
        app_label = 'landmapper'

    shape_leng = models.FloatField(null=True, blank=True)
    shape_area = models.FloatField(null=True, blank=True)

    geometry = MultiPolygonField(
        srid=3857,
        null=True, blank=True,
        verbose_name="Grid Cell Geometry"
    )
    objects = GeoManager()

    @property
    def area_in_sq_miles(self):
        true_area = self.geometry.transform(2163, clone=True).area
        return sq_meters_to_sq_miles(true_area)

    @property
    def formatted_area(self):
        return int((self.area_in_sq_miles * 10) + .5) / 10.

    def serialize_attributes(self):
        attributes = []
        attributes.append({'title': 'Area', 'data': '%.1f sq miles' % (self.area_in_sq_miles)})
        # attributes.append({'title': 'Description', 'data': self.description})
        return { 'event': 'click', 'attributes': attributes }

    # @classmethod
    # def fill_color(self):
    #     return '776BAEFD'

    @classmethod
    def outline_color(self):
        return '776BAEFD'

    class Options:
        verbose_name = 'Taxlot'
        icon_url = None
        export_png = False
        manipulators = []
        optional_manipulators = []
        form = None
        form_template = None
        show_template = None
