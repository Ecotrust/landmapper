from ckeditor_uploader.fields import RichTextUploadingField
from django.db import models
from django.contrib.auth.models import User
from django.contrib.gis.db.models import MultiPolygonField, PointField
from django.db.models.signals import post_save
from django.dispatch import receiver
from features.models import MultiPolygonFeature
from features.registry import register

def sq_meters_to_sq_miles(area_m2):
    return area_m2/2589988.11

def sq_meters_to_acres(area_m2):
    return area_m2/4046.86

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    date_created = models.DateField(auto_now_add=True)
    date_modified = models.DateField(auto_now=True)

    FORM_STATUS_CHOICES = (
        (None, 'User has not seen questions'),
        ('seen', 'User has seen the form'),
        ('done', 'User has filled out the questions.')
    )

    profile_questions_status = models.CharField(max_length=5, null=True, blank=True, choices=FORM_STATUS_CHOICES, default=None)
    # followup_questions_status = models.CharField(max_length=5, null=True, blank=True, choices=FORM_STATUS_CHOICES, default=None)

    #Q1
    USER_TYPE_CHOICES = (
        (None, '----------------'),
        ('1', 'Private forest owner'),
        ('2', 'Professional service provider (e.g., forester, conservationist)'),
        ('3', 'Student or educator'),
        ('4', 'Just curious'),
        ('5', 'Other [please specify]')
    )
    # strict set of selection, or text (to support 'other' feedback in same field)?
    type_selection = models.CharField(max_length=2, choices=USER_TYPE_CHOICES, blank=True, null=True, default=None, verbose_name="Which of the following roles best captures your primary use of this website?")
    type_other = models.CharField(max_length=255, blank=True, null=True, default=None, verbose_name="Other primary use:")

    #Q2
    Y_N_CHOICES = (
        (None, '----------------'),
        (False, 'No'),
        (True, 'Yes'),
    )
    has_plan = models.BooleanField(blank=True, null=True, default=None, choices=Y_N_CHOICES, verbose_name="Do you have a written Forest Management Plan or Stewardship Plan for your property?")

    PLAN_AGE_CHOICES = (
        (None, '----------------'),
        ('1', 'I Have No Plan'),
        ('2', 'Less than 1 year ago'),
        ('3', '1 to 5 years ago'),
        ('4', '5 to 10 years ago'),
        ('5', 'Over 10 years ago'),
        ('6', 'I am not sure'),
    )
    plan_date = models.CharField(max_length=2, blank=True, null=True, choices=PLAN_AGE_CHOICES, default=None, verbose_name="If so, when was your most recent Plan prepared?")

    #Q3
    PRIORITY_CHOICES = (
        (None, '----------------'),
        ('1', 'Not a Priority'),
        ('2', 'Low Priority'),
        ('3', 'Medium Priority'),
        ('4', 'High Priority'),
        ('5', 'Essential'),
    )
    q3_1_health = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Maintaining long-term forest health and productivity")
    q3_2_habitat = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Protecting or improving wildlife habitat")
    q3_3_beauty = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Maintaining natural beauty and aesthetics")
    q3_4_next_gen = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Preserving the land for the next generation")
    q3_5_risks = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Reducing fire or pest risks")
    q3_6_climate_change = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Adapting the land for climate change")
    q3_7_carbon = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Sequestering carbon")
    q3_8_invasive_species = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Addressing invasive species")
    q3_9_timber = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Harvesting and selling timber")
    q3_10_profit = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Earning a profit from the land")
    q3_11_cultural_uses = models.CharField(max_length=2, choices=PRIORITY_CHOICES, blank=True, null=True, default=None, verbose_name="Maintaining personal or cultural uses of the land (hunting, gathering, hiking, camping, fishing, etc.)")

class TwoWeekFollowUpSurvey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date_created = models.DateField(auto_now_add=True)
    date_modified = models.DateField(auto_now=True)
    email_sent = models.BooleanField(default=False)
    survey_complete = models.BooleanField(default=False)

    # Q4
    AGREEMENT_CHOICES = (
        (None, '----------------'),
        ('1', 'Strongly Disagree'),
        ('2', 'Disagree'),
        ('3', 'Neither Agree Nor Disagree'),
        ('4', 'Agree'),
        ('5', 'Strongly Agree'),
    )
    q4a_1_land_management = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app helped me learn more about land I own or manage")
    q4a_2_issue = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app helped me learn more about an issue")
    q4a_3_coordinate = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app helped me coordinate with others")
    q4a_4_decision = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app helped me make a decision")
    q4a_5_activity = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app helped me implement or maintain a specific activity")
    q4a_6_information = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app influenced me to pursue additional information or services")
    q4a_7_plan = models.CharField(max_length=2, choices=AGREEMENT_CHOICES, blank=True, null=True, default=None, verbose_name="The app helped me complete a written Stewardship Plan or Forest Management Plan")

    feedback = models.TextField(blank=True, null=True, default=None, verbose_name="Is there anything else you’d like us to know about your experience using the app?")

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if Profile.objects.filter(user=instance).count() <= 0:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class MenuPage(models.Model):
    name = models.CharField(max_length=255, verbose_name="Menu Item")
    order = models.SmallIntegerField(default=10)
    staff_only = models.BooleanField(default=False)
    header = models.CharField(max_length=255, null=True, blank=True, default=None, verbose_name="Popup Header")
    content = RichTextUploadingField(null=True, blank=True, default=None, verbose_name="Popup Body",
                                        external_plugin_resources=[(
                                            'youtube',
                                            '/static/landmapper/vendor/ckeditor/youtube/',
                                            'plugin.js'
                                        )])

    def __str__(self):
        return "%s" % self.name
    
class Taxlot(models.Model):
    class Meta:
        verbose_name = 'Taxlot'
        verbose_name_plural = 'Taxlots'
        app_label = 'landmapper'

    # ODF_FPD
    odf_fpd = models.CharField(max_length=25, null=True, blank=True, default=None)
    # Agency
    agency = models.CharField(max_length=100, null=True, blank=True, default=None)
    # orZDesc - "Elevation?"
    orzdesc = models.CharField(max_length=255, null=True, blank=True, default=None)
    # HUC12 - "Watershed"
    huc12 = models.CharField(max_length=12, null=True, blank=True, default=None)
    # Name
    name = models.CharField(max_length=120, null=True, blank=True, default=None)
    # TWNSHPNO
    # twnshpno = models.CharField(max_length=3, null=True, blank=True, default=None)
    # RANGENO
    # rangeno = models.CharField(max_length=3, null=True, blank=True, default=None)
    # FRSTDIVNO
    # frstdivno = models.CharField(max_length=10, null=True, blank=True, default=None)
    # TWNSHPLAB
    # twnshplab = models.CharField(max_length=20, null=True, blank=True, default=None)
    # MEAN, formerly ele_mean
    # mean_elevation = models.FloatField(null=True, blank=True, default=None)
    # MIN, formerly ele_min
    min_elevation = models.FloatField(null=True, blank=True, default=None)
    # MAX, formerly ele_max
    max_elevation = models.FloatField(null=True, blank=True, default=None)
    # legal_label Fully formatted legal description
    legal_label = models.CharField(max_length=255, null=True, blank=True, default=None)
    # county -- The county name that the taxlot belongs to.
    county = models.CharField(max_length=255, null=True, blank=True, default=None)
    # source -- The source for the taxlot data
    source = models.CharField(max_length=255, null=True, blank=True, default=None)
    # map_id -- the identifier of the map used by the source provider
    map_id = models.CharField(max_length=255, null=True, blank=True, default=None)
    # map_taxlot -- the identifier of the taxlot used by the source map
    map_taxlot = models.CharField(max_length=255, null=True, blank=True, default=None)

    geometry = MultiPolygonField(
        srid=3857,
        null=True, blank=True,
        verbose_name="Grid Cell Geometry"
    )
    objects = models.Manager()

    @property
    def area_in_sq_miles(self):
        true_area = self.geometry.transform(2163, clone=True).area
        return sq_meters_to_sq_miles(true_area)

    @property
    def area_in_acres(self):
        return sq_meters_to_acres(self.geometry.transform(2163, clone=True).area)

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

class SoilType(models.Model):
    mukey = models.CharField(max_length=100, null=True, blank=True, default=None)
    areasym = models.CharField(max_length=100, null=True, blank=True, default=None)
    spatial = models.FloatField(null=True, blank=True, default=None)
    musym = models.CharField(max_length=100, null=True, blank=True, default=None)
    shp_lng = models.FloatField(null=True, blank=True, default=None)
    shap_ar = models.FloatField(null=True, blank=True, default=None)
    si_label = models.CharField(max_length=255, null=True, blank=True, default=None)
    muname = models.CharField(max_length=255, null=True, blank=True, default=None)
    drclssd = models.CharField(max_length=100, null=True, blank=True, default=None)
    frphrtd = models.CharField(max_length=100, null=True, blank=True, default=None)
    avg_rs_l = models.FloatField(null=True, blank=True, default=None)
    avg_rs_h = models.FloatField(null=True, blank=True, default=None)

    geometry = MultiPolygonField(
        srid=3857,
        null=True, blank=True,
        verbose_name="Grid Cell Geometry"
    )
    objects = models.Manager()

    class Options:
        verbose_name = 'Soil Type'

@register
class PropertyRecord(MultiPolygonFeature):
    def taxlots_default():
        return {'taxlots': []}

    record_taxlots = models.JSONField('record_taxlots', default=taxlots_default)
    user = models.ForeignKey(User, related_name="%(app_label)s_%(class)s_related", on_delete=models.CASCADE, null=True, blank=True, default=None)

    @property
    def property_id(self):
        from .views import create_property_id
        if not self.user or self.user.is_anonymous:
            user_id = 'anon'
        else:
            user_id = str(self.user.pk)
        taxlot_ids = self.record_taxlots['taxlots']
        return create_property_id(self.name, user_id, taxlot_ids)

    class Options:
        form = 'features.forms.SpatialFeatureForm'
        manipulators = []

    class Meta:
        abstract = False


class PopulationPoint(models.Model):
    classification = models.CharField(max_length=100, default='city')
    state = models.CharField(max_length=30, default='OR')
    population = models.IntegerField()
    place_fips = models.IntegerField()
    density_sqmi = models.FloatField(null=True, blank=True, default=None)
    area_sqmi = models.FloatField(null=True, blank=True, default=None)
    population_class = models.SmallIntegerField(null=True, blank=True, default=None)

    geometry = PointField(
        srid=3857,
        null=True, blank=True,
        verbose_name="Population Center Geometry"
    )

    class Options:
        verbose_name = 'Population Center'

class ForestType(models.Model):
    id = models.BigIntegerField(primary_key=True)
    # row_id = models.BigIntegerField()
    # col_id = models.BigIntegerField()
    # tile_id = models.CharField(max_length=255, null=True, blank=True, default=None, verbose_name="Row, Col")
    fortype = models.CharField(max_length=255, null=True, blank=True, default=None, verbose_name="Forest Type")
    symbol = models.CharField(max_length=10, default=None)
    # comp_over = models.CharField(max_length=255, null=True, blank=True, default=None, verbose_name="Overall Composition")
    # comp_ab = models.TextField(null=True, blank=True, default=None, verbose_name="Abundant Species")
    # comp_min = models.TextField(null=True, blank=True, default=None, verbose_name="Minor Species")
    can_class = models.CharField(max_length=255, null=True, blank=True, default=None, verbose_name="Cover Class")
    # can_cr_min = models.FloatField(null=True, blank=True, default=None, verbose_name="Canopy Cover Min Range")
    # can_cr_max = models.FloatField(null=True, blank=True, default=None, verbose_name="Canopy Cover Max Range")
    # can_h_min = models.FloatField(null=True, blank=True, default=None, verbose_name="Canopy Height Min")
    # can_h_max = models.FloatField(null=True, blank=True, default=None, verbose_name="Canopy Height Max")
    diameter = models.CharField(max_length=255, null=True, blank=True, default=None, verbose_name="Tree Size Class")
    # tree_r_min = models.FloatField(null=True, blank=True, default=None, verbose_name="Tree Size Est. Range Min")
    # tree_r_max = models.FloatField(null=True, blank=True, default=None, verbose_name="Tree Size Est. Range Max")

    geometry = MultiPolygonField(
        srid=3857,
        null=True, blank=True,
        verbose_name="Grid Cell Geometry"
    )
    objects = models.Manager()

    class Options:
        verbose_name = 'Forest Type'



