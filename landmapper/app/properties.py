from datetime import datetime
from django.conf import settings
from django.contrib.auth.models import User, AnonymousUser
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.core.cache import cache
from app.models import Taxlot, PropertyRecord, Property
from app import reports
from urllib.parse import unquote

def create_property(taxlot_ids, property_name, user=None):
    # '''
    # Land Mapper: Create Property
    #
    # TODO:
    #     can a memory instance of feature be made as opposed to a database feature
    #         meta of model (ref: madrona.features) to be inherited?
    #         don't want this in a database
    #         use a class (python class) as opposed to django model class?
    #     add methods to class for
    #         creating property
    #         turn into shp
    #         CreatePDF, ExportLayer, BuildLegend, BuildTables?
    #     research caching approaches
    #         django docs
    #         django caching API
    # '''
    '''
    (called before loading 'Report', cached)
    IN:
        taxlot_ids[ ]
        property_name
    OUT:
        Madrona polygon feature
    NOTES:
        CACHE THESE!!!!
    '''

    if user.is_anonymous:
        user = None

    taxlot_multipolygon = False

    taxlots = Taxlot.objects.filter(pk__in=taxlot_ids)

    for lot in taxlots:
        # lot = Taxlot.objects.get(pk=lot_id)
        if not taxlot_multipolygon:
            taxlot_multipolygon = lot.geometry
        else:
            taxlot_multipolygon = taxlot_multipolygon.union(lot.geometry)

    # Create Property object (don't use 'objects.create()'!)
    # now create property from cache id on report page
    if type(taxlot_multipolygon) == Polygon:
        taxlot_multipolygon = MultiPolygon(taxlot_multipolygon)

    property_record, created = PropertyRecord.objects.get_or_create(
                        user=user,
                        geometry_orig=taxlot_multipolygon,
                        name=property_name)

    property_record.record_taxlots = {'taxlots': taxlot_ids}
    property_record.save()

    property = Property(
                        pk=property_record.pk,
                        user=user,
                        geometry_orig=taxlot_multipolygon,
                        name=property_name)

    reports.get_property_report(property, taxlots)

    return property

def get_property_by_id(property_id, user=None):
    property = cache.get('%s' % property_id)

    if not property:
        taxlot_start_pos = 3
        # property_id = {NAME}|{USER_ID}|{TAXLOT_ID_1}|{TAXLOT_ID_2}|....
        id_elements = property_id.split('|')
        property_name = unquote(id_elements[0])
        user_id = unquote(id_elements[1])
        timestamp = unquote(id_elements[2])
        if 'time_' in timestamp:
            time = int(timestamp[5:])
            if settings.ENFORCE_TIMESTAMP and time < settings.TAXLOT_IMPORT_TIMESTAMP:
                raise ValueError('Your property report is out of date and contains incorrect information. Please recreate your property report.')
        else:
            if settings.ENFORCE_TIMESTAMP:
                raise ValueError('Your property report is out of date and contains incorrect information. Please recreate your property report.')
            else:
                taxlot_start_pos = 2
        
        taxlot_ids = id_elements[taxlot_start_pos:]
        if user_id == 'anon':
            user = AnonymousUser()
        else:
            try:
                user = User.objects.get(pk=int(user_id))
            except Exception:
                # User may have old link prior to user_id being in the URL, so assume 'anonymous' and 1st val is taxlot
                user = AnonymousUser()
                taxlot_ids = id_elements[1:]

        # Url Decode property's name
        property = create_property(taxlot_ids, property_name, user)
        # Cache for 1 week
        cache.set('%s' % property_id, property, 60 * 60 * 24 * 7)

    return property
    