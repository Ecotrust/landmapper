# https://geocoder.readthedocs.io/
from app import properties, reports
from app.forms import ProfileForm, FollowupForm
from app.models import *
from datetime import datetime
import decimal, json, geocoder
from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth import authenticate,login as django_login
from django.contrib.auth.forms import (
    AuthenticationForm, PasswordChangeForm, PasswordResetForm, SetPasswordForm,
)
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.views import PasswordContextMixin
from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import GEOSGeometry
from django.core.cache import cache
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect
from django.template import RequestContext, Template
from django.urls import reverse_lazy
from django.utils.decorators import method_decorator
from django.utils.timezone import localtime
from django.utils.translation import gettext_lazy as _
from django.views.decorators.clickjacking import xframe_options_sameorigin
from django.views.decorators.csrf import csrf_protect
from django.views.generic.edit import FormView
from flatblocks.models import FlatBlock
from PIL import Image
import requests
import ssl
import sys
from urllib.error import URLError
from urllib.parse import quote
import urllib.request, urllib.parse

def unstable_request_wrapper(url, params=False, retries=0):
    # """
    # unstable_request_wrapper
    # PURPOSE: As mentioned above, the USDA wfs service is weak. We wrote this wrapper
    # -   to fail less.
    # IN:
    # -   'url': The URL being requested
    # -   'retries': The number of retries made on this URL
    # OUT:
    # -   contents: The html contents of the requested page
    # """

    original_url = url
    if params:
        url = "?".join([url, urllib.parse.urlencode(params)])

    try:
        contents = urllib.request.urlopen(url)
    except URLError as e:
        contents = urllib.request.urlopen(url, context=ssl.SSLContext(protocol=ssl.PROTOCOL_TLS))
    except ConnectionError as e:
        if retries < 10:
            print('failed [%d time(s)] to connect to %s' % (retries, url))
            contents = unstable_request_wrapper(original_url, params, retries + 1)
        else:
            print("ERROR: Unable to connect to %s" % url)
            contents = None
    except Exception as e:
        # print(e)
        # print(url)
        contents = False
    return contents

def geocode(search_string, srs=4326, service='arcgis', with_context=False):
    # """
    # geocode
    # PURPOSE: Convert a provided place name into geographic coordinates
    # IN:
    # -   search_string: (string) An address or named landmark/region
    # -   srs: (int) The EPSG ID for the spatial reference system in which to output coordinates
    # -       defaut: 4326
    # -   service: (string) The geocoding service to query for a result
    # -       default = 'arcgis'
    # -       other supported options: 'google'
    # OUT:
    # -   coords: a list of two coordinate elements -- [lat(y), long(x)]
    # -       projected in the requested coordinate system
    # CALLED BY:
    # -   identify
    # """

    hits = []
    g_hits = []
    hit_names = []

    # Query desired service
    # TODO: support more than just ArcGIS supplied geocodes
    #       Use other services if no matches are found.
    # if service.lower() == 'arcgis':
    g_matches = geocoder.arcgis(search_string, maxRows=100)
    for match in g_matches:
        if (match.latlng[0] <= settings.STUDY_REGION['north'] and
                match.latlng[0] >= settings.STUDY_REGION['south'] and
                match.latlng[1] <= settings.STUDY_REGION['east'] and
                match.latlng[1] >= settings.STUDY_REGION['west']):
            if not match.raw['name'] in hit_names:
                g_hits.append(match)
                hit_names.append(match.raw['name'])
    for hit in g_hits:
        hits.append({
            'name': hit.raw['name'],
            'coords': hit.latlng,
            'confidence': hit.confidence
        })

    if not with_context:

        if len(hits) == 0:
            for context in settings.STUDY_REGION['context']:
                new_hits = geocode("%s%s" % (search_string, context), srs=srs, service=service, with_context=True)
                for hit in new_hits:
                    if not hit['name'] in hit_names:
                        hits.append(hit)
                        hit_names.append(hit['name'])
                        # TODO: If new hits match but have better confidence, replace

        # Transform coordinates if necessary
        if not srs == 4326:

            if ':' in srs:
                try:
                    srs = srs.split(':')[1]
                except Exception as e:
                    pass
            try:
                int(srs)
            except ValueError as e:
                print(
                    'ERROR: Unable to interpret provided srs. Please provide a valid EPSG integer ID. Providing coords in EPSG:4326'
                )
                return coords

            hits_transform = []
            for hit in hits:
                coords = hit.latlng
                point = GEOSGeometry('SRID=4326;POINT (%s %s)' %
                                     (coords[1], coords[0]),
                                     srid=4326)
                point.transform(srs)
                coords = [point.coords[1], point.coords[0]]
                hits_transform.append(coords)
            hits = hits_transfrom

    hits = sorted(hits, key = lambda i: i['confidence'], reverse=True)
    if len(hits) > 5:
        hits = hits[:5]

    return hits

@xframe_options_sameorigin
def get_taxlot_json(request):
    status = 400
    lot_id = None
    lot_json= []
    coords = request.GET.getlist('coords[]')  # must be [lon, lat]
    intersect_pt = GEOSGeometry('POINT(%s %s)' % (coords[0], coords[1]))
    try:
        lot = Taxlot.objects.get(geometry__intersects=intersect_pt)
        lot_json = lot.geometry.wkt
        lot_id = lot.id
        status = 200
    except:
        lots = Taxlot.objects.filter(geometry__intersects=intersect_pt)
        if len(lots) > 0:
            lot = lots[0]
            lot_json = lot.geometry.json
            lot_id = lot.id
            status = 200
    return HttpResponse(json.dumps({
                            "id": lot_id,
                            "geometry": lot_json
                        }),
                        status=status)
# TODO: Consolidate home, index, and Identify
# TODO: Re-write logic to avoid page reload on Identify
def home(request):
    '''
    Land Mapper: Home Page
    '''

    if request.user and request.user.is_authenticated:
        person = Person.objects.get(pk=request.user.pk)
        if person.show_survey():
            return person.get_survey(request)

    # Get aside content Flatblock using name of Flatblock
    aside_content = 'aside-home'
    if len(FlatBlock.objects.filter(slug=aside_content)) < 1:
        # False signals to template that it should not evaluate
        aside_content = False

    request_context = {
        'aside_content': aside_content,
        'show_panel_buttons': False,
        'overlay': 'overlay',
    }

    return render(request, 'landmapper/landing.html', request_context)

def userProfileSurvey(request):
    profile = Profile.objects.get(user=request.user)
    context = {
        'title': 'User Profile Form',
        'description': 'Welcome to LandMapper. Please tell us more about yourself:',
        'action': '/landmapper/user_profile/',
        'scripts': ['/landmapper/js/profile_survey.js',],
    }
    if request.method == 'POST':
        form = ProfileForm(request.POST, instance=profile)
        if form.is_valid():
            profile = form.save()
            profile.profile_questions_status = 'done'
            profile.save()
            return redirect('/')
        context['form'] = form
    else:
        form = ProfileForm(instance=profile)
        context['form'] = form
    return render(request, 'surveys/initial_profile.html', context)

def userProfileFollowup(request):
    instances = TwoWeekFollowUpSurvey.objects.filter(user=request.user, survey_complete=False).order_by('date_created')
    if instances.count() > 0:
        instance = instances[0]
    else:
        instance = False
    context = {
        'title': 'User Follow-Up Form',
        'description': 'Thank you for your continued use of LandMapper. You\'ve had an account for a couple of weeks now, and we\'re curious to know more about your experience so far.',
        'action': '/landmapper/user_followup/',
        'scripts': [],
    }
    if request.method == 'POST':
        # Ensure front-end didn't hack their user value:
        post = request.POST.copy()
        post.update({'user': request.user})
        request.POST = post
        if instance:
            form = FollowupForm(request.POST, instance=instance)
        else:
            form=FollowupForm(request.POST)
        if form.is_valid():
            followup = form.save()
            followup.survey_complete = True
            followup.save()
            return redirect('/')
    else:
        if instance:
            form = FollowupForm(instance=instance)
        else:
            form = FollowupForm(initial={"user": request.user})
    context['form'] = form
    return render(request, 'surveys/2w_followup_survey.html', context)

def index(request):
    '''  ## LANDING PAGE
    Land Mapper: Index Page
    (landing: slide 1)
    '''
    return render(request, 'landmapper/landing.html', context)

def identify(request):
    '''
    Land Mapper: Identify Pages
    IN
        coords
        search string
        (opt) taxlot ids
        (opt) property name
    OUT
        Rendered Template
    '''
    # Get aside content Flatblock using name of Flatblock
    aside_content = 'aside-map-pin'
    if len(FlatBlock.objects.filter(slug=aside_content)) < 1:
        # False signals to template that it should not evaluate
        aside_content = False

    if request.method == 'POST':
        if request.POST.get('q-address'):
            q_address = request.POST.get('q-address')
            q_address_value = request.POST.get('q-address')
            geocode_hits = geocode(q_address)
        else:
            q_address = '12345 Loon Lake Rd'
            

        if geocode_hits and len(geocode_hits) > 0:
                coords = geocode_hits[0]['coords']
                geocode_error = False
        else:
            coords = [
                (settings.STUDY_REGION['south'] + settings.STUDY_REGION['north'])/2,
                (settings.STUDY_REGION['east'] + settings.STUDY_REGION['west'])/2
            ]
            geocode_error = True
        context = {
            'coords': coords,
            'geocode_hits': geocode_hits,
            'geocode_error': geocode_error,
            'q_address': q_address,
            'q_address_value': q_address_value,
            'aside_content': aside_content,
            'show_panel_buttons': True,
            'search_performed': True,
            # """Says where buttons go when you're using the UI mapping tool."""
            'btn_back_href': '/landmapper/',
            'btn_next_href': 'property_name',
            'btn_create_maps_href': '/landmapper/report/',
            'btn_next_disabled': 'disabled',
        }
    else:
        # User wants to bypass address search
        context = {
            'aside_content': aside_content,
            'show_panel_buttons': True,
            'search_performed': True,
            # """Says where buttons go when you're using the UI mapping tool."""
            'btn_back_href': '/landmapper/',
            'btn_next_href': 'property_name',
            'btn_create_maps_href': '/landmapper/report/',
            'btn_next_disabled': 'disabled',
        }

    return render(request, 'landmapper/landing.html', context)

def create_property_id(property_name, user_id, timestamp, taxlot_ids):

    sorted_taxlots = sorted(taxlot_ids)

    timestamp = "time_{}".format(timestamp)

    id_elements = [str(x) for x in [
            property_name, user_id, timestamp
        ] + sorted_taxlots]
    property_id = '|'.join(id_elements)

    return property_id

def create_property_id_from_request(request):
    '''
    Land Mapper: Create Property Cache ID
    IN

    '''
    if request.method == 'POST':
        property_name = request.POST.get('property_name')
        taxlot_ids = request.POST.getlist('taxlot_ids[]')
        timestamp = int(datetime.now().timestamp())

        # modifies request for anonymous user
        if not (hasattr(request, 'user') and request.user.is_authenticated
                ) and settings.ALLOW_ANONYMOUS_DRAW:
            user = User.objects.get(pk=settings.ANONYMOUS_USER_PK)
        else:
            user = request.user

        property_name = quote(property_name, safe='')
        
        if request.user.is_anonymous:
            user_id = 'anon'
        else:
            user_id = request.user.pk

        property_id =  create_property_id(property_name, user_id, timestamp, taxlot_ids)

        return HttpResponse(json.dumps({'property_id': property_id}), status=200)
        
    else:
        return HttpResponse('Improper request method', status=405)
    return HttpResponse('Create property failed', status=402)

def record_report(request, property_record_id):
    try:
        property_record = PropertyRecord.objects.get(pk=property_record_id)
        return report(request, property_record.property_id)
    except Exception as e:
        return render(request, '404.html')

def delete_record(request, property_record_id):
    response_status = 'error'
    response_message = 'Unknown error occurred'
    if not request.user.is_authenticated:
        response_message = 'User not authenticated. Please log in.'
    else:
        record_matches = PropertyRecord.objects.filter(pk=int(property_record_id))
        if record_matches.count() < 1:
            response_message = 'No records found matching given ID'
        elif record_matches.count() > 1:
            response_message = 'Multiple records match given ID. Please contact the site maintainer.'
        elif not request.user == record_matches[0].user:
            response_message = 'You do not own this property.'
        else:
            try:
                record_matches[0].delete()
                response_status = 'success'
                response_message = 'success'
            except Exception as e:
                response_status = 'error'
                response_message = f"Unable to delete your property. Unknown error: \"{e}\""
    return JsonResponse({
        'status': response_status,
        'message': response_message
    })
    
def report(request, property_id):
    '''
    Land Mapper: Report Pages
    Report (slides 5-7a)
    IN
        taxlot ids
        property name
    OUT
        Rendered Template
        Uses: CreateProperty, CreatePDF, ExportLayer, BuildLegend, BuildTables
    '''
    error_message = None
    
    try:
        property = properties.get_property_by_id(property_id, request.user)
        (bbox, orientation) = property.bbox()
        property_fit_coords = [float(x) for x in bbox.split(',')]
        property_width = property_fit_coords[2]-property_fit_coords[0]
        render_detailed_maps = True if property_width < settings.MAXIMUM_BBOX_WIDTH else False
        property_name = property.name
        property_report = property.report_data
    except ValueError:
        error_type, error_instance, traceback = sys.exc_info()
        error_message = str(error_instance.args[0])
        bbox = None
        orientation = None
        property_fit_coords = None
        property_width = None
        render_detailed_maps = False
        property_name = None
        property_report = None
        property = None

    context = {
        'property_id': property_id,
        'property_name': property_name,
        'property': property,
        'property_report': property_report,
        'overview_scale': settings.PROPERTY_OVERVIEW_SCALE,
        'aerial_scale': settings.AERIAL_SCALE,
        'street_scale': settings.STREET_SCALE,
        'topo_scale': settings.TOPO_SCALE,
        'stream_scale': settings.STREAM_SCALE,
        'soil_scale': settings.SOIL_SCALE,
        'forest_type_scale': settings.FOREST_TYPES_SCALE,
        'forest_size_scale': settings.FOREST_SIZE_SCALE,
        'forest_density_scale': settings.FOREST_DENSITY_SCALE,
        'forest_canopy_scale': settings.FOREST_CANOPY_SCALE,
        'SHOW_COAS': settings.SHOW_COAS,
        'SHOW_AERIAL_REPORT': settings.SHOW_AERIAL_REPORT,
        'SHOW_STREET_REPORT': settings.SHOW_STREET_REPORT,
        'SHOW_TERRAIN_REPORT': settings.SHOW_TERRAIN_REPORT,
        'SHOW_STREAMS_REPORT': settings.SHOW_STREAMS_REPORT,
        'SHOW_SOILS_REPORT': settings.SHOW_SOILS_REPORT,
        'SHOW_FOREST_TYPES_REPORT': settings.SHOW_FOREST_TYPES_REPORT,
        'SHOW_FOREST_SIZE_REPORT': settings.SHOW_FOREST_SIZE_REPORT,
        'SHOW_FOREST_DENSITY_REPORT': settings.SHOW_FOREST_DENSITY_REPORT,
        'SHOW_FOREST_CANOPY_REPORT': settings.SHOW_FOREST_CANOPY_REPORT,
        'RENDER_DETAILS': render_detailed_maps,
        'NO_RENDER_MESSAGE': settings.NO_RENDER_MESSAGE,
        'ATTRIBUTION_KEYS': settings.ATTRIBUTION_KEYS,
        'user_id': request.user.pk,
        'STUDY_REGION_ID': settings.STUDY_REGION_ID,
        'error_message': error_message,
    }    

    return render(request, 'landmapper/report/report.html', context)

def get_property_map_image(request, property_id, map_type):
    try:
        property = properties.get_property_by_id(property_id, request.user)
    except ValueError:
        map_type = None
    if map_type == 'stream':
        image = property.stream_map_image
    elif map_type == 'street':
        image = property.street_map_image
    elif map_type == 'aerial':
        image = property.aerial_map_image
    elif map_type == 'soil_types':
        image = property.soil_map_image
    elif map_type == 'forest_type':
        image = property.forest_type_map_image
    elif map_type == 'forest_size':
        image = property.forest_size_map_image
    elif map_type == 'forest_density':
        image = property.forest_density_map_image
    elif map_type == 'forest_canopy':
        image = property.forest_canopy_map_image
    elif map_type == 'property':
        image = property.property_map_image
    elif map_type == 'terrain':
        image = property.terrain_map_image
    elif map_type == 'property_alt':
        image = property.property_map_image_alt
    else:
        image = None

    response = HttpResponse(content_type="image/png")
    if not image == None:
        image.save(response, 'PNG')

    return response

def get_scalebar_as_image(request, property_id, scale="fit"):

    response = HttpResponse(content_type="image/png")
    try:
        property = properties.get_property_by_id(property_id, request.user)
        if scale == 'context':
            image = property.context_scalebar_image
        elif scale == 'medium':
            image = property.medium_scalebar_image
        else:
            image = property.scalebar_image
        image.save(response, 'PNG')
    except ValueError:
        pass

    return response

def get_scalebar_as_image_for_pdf(request, property_id, scale="fit"):
    response = HttpResponse(content_type="image/png")
    try:
        property = properties.get_property_by_id(property_id, request.user)
        if scale == 'context':
            image = property.context_scalebar_image
        elif scale == 'medium':
            image = property.medium_scalebar_image
        else:
            image = property.scalebar_image

        transparent_background = Image.new("RGBA", (settings.SCALEBAR_BG_W, settings.SCALEBAR_BG_H), (255,255,255,0))
        transparent_background.paste(image)

        transparent_background.save(response, 'PNG')
    except ValueError:
        pass

    return response

def get_property_cache_key(property_id):
    return str(property_id) + '_pdf'

@login_required(login_url='/auth/login/')
def get_property_pdf(request, property_id):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="property.pdf"'
    property_pdf_cache_key = property_id + '_pdf'
    property_pdf = cache.get('%s' % property_pdf_cache_key)
    try:
        if not property_pdf:
            property = properties.get_property_by_id(property_id, request.user)
            property_pdf = reports.create_property_pdf(property, property_id)
            if property_pdf:
                cache.set('%s' % property_pdf_cache_key, property_pdf, 60 * 60 * 24 * 7)
        response.write(property_pdf)
    except ValueError:
        pass
    return response

@login_required(login_url='/auth/login/')
def get_property_map_pdf(request, property_id, map_type):
    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="property.pdf"'
    property_pdf_cache_key = property_id + '_pdf'
    property_pdf = cache.get('%s' % property_pdf_cache_key)
    if property_pdf:
        try:
            property = properties.get_property_by_id(property_id, request.user)
            property_map_pdf = reports.create_property_map_pdf(property, map_type)
        except (FileNotFoundError, ValueError):
            property_pdf = False
    try:
        if not property_pdf:
            property = properties.get_property_by_id(property_id, request.user)
            property_pdf = reports.create_property_pdf(property, property_id)
            if property_pdf:
                cache.set('%s' % property_pdf_cache_key, property_pdf, 60 * 60 * 24 * 7)
            property_map_pdf = reports.create_property_map_pdf(property, map_type)
        response.write(property_map_pdf)
    except ValueError:
        pass
    return response

@login_required(login_url='/auth/login/')
def get_property_pdf_georef(request, property_id, map_type="aerial"):
    
    """
    Generate a georeferenced PDF for a given property.

    Args:
        request (HttpRequest): The HTTP request object.
        property_id (int): The ID of the property.
        map_type (str, optional): The type of map. Defaults to "aerial".

    Returns:
        HttpResponse: The HTTP response object containing the generated PDF.
    """

    import os
    from rasterio import transform
    from app.map_layers.utilities import get_neatline_wkt

    response = HttpResponse(content_type='application/pdf')
    response['Content-Disposition'] = 'inline; filename="property_georef.pdf"'

    try:
        property = properties.get_property_by_id(property_id, request.user)
        
        # Get the path to the full (all map types) PDF for the given property
        property_pdf_path = os.path.join(settings.PROPERTY_REPORT_PDF_DIR, property.name)
        
        # Make sure the full PDF exists
        rendered_pdf_name = property_pdf_path + '.pdf'
        if not os.path.exists(rendered_pdf_name):
            # If the full PDF doesn't exist, create it
            created_property_pdf = reports.create_property_pdf(property, property_id)
        
        # Get the path to the PDF page for the given map type
        in_pdf = reports.get_property_map_pdf(property, map_type)
        
        # Specify the path for the to be created georeferenced PDF
        out_pdf = property_pdf_path + '_' + map_type + '_georef.pdf'

        # Get EPSG from settings
        EPSG = settings.GEOMETRY_CLIENT_SRID
            
        # Get bounds as string
        bounds = property.bbox()[0]
        
        # Refit bounding box maps with different zoom levels
        # TODO: Refactor this to set bounds for all map types using settings.<map_type>_SCALE
        if map_type == 'terrain':
            property_specs = reports.get_property_specs(property)
            bounds = reports.refit_bbox(property_specs, scale=settings.TOPO_SCALE)
        elif map_type == 'street':
            property_specs = reports.get_property_specs(property)
            bounds = reports.refit_bbox(property_specs, scale=settings.STREET_SCALE)

        # Get neatline as WKT
        NEATLINE = get_neatline_wkt(bounds)

        # Split bounds into list of floats
        BOUNDS = [float(x) for x in bounds.split(',')]
        
        # from_bounds(west, south, east, north, img width (px), img height (px)) and convert to gdal format 
        NTL_TRANSFORM = transform.from_bounds(
            BOUNDS[0],
            BOUNDS[1],
            BOUNDS[2],
            BOUNDS[3],
            settings.PDF_GEOREF_IMG_WIDTH,
            settings.PDF_GEOREF_IMG_HEIGHT
        ).to_gdal()
        
        #   (x,y) offset in map units or points (if in points multiply by resolution; this is done in reports.georef_pdf)
        #   note on converting points and pixels:
        #       1px = 0.75pt
        OFFSET = (
            settings.PDF_MARGIN_LEFT,
            settings.PDF_MARGIN_TOP
        )

        # Landmapper PDF DPI
        DPI = settings.PDF_DPI
        
        # Date format is D:YYYYMMDDHHmmSS
        CREATION_DATE = datetime.now().strftime('D:%Y%m%d%H%M%S')

        # Creator and Title can be anything
        CREATOR = 'Landmapper'
        TITLE = 'Georeferenced Landmapper PDF'

        # Options for GDAL PDF metadata
        options = {
            "CREATION_DATE": CREATION_DATE,
            "CREATOR": CREATOR,
            "DPI": DPI, 
            "NEATLINE": NEATLINE,
            "TITLE": TITLE,
        }
        
        # Create georeferenced PDF
        property_pdf_georef = reports.georef_pdf(
            in_pdf,
            out_pdf,
            NTL_TRANSFORM,
            OFFSET,
            EPSG,
            options,
            scaling=1.0
        )

        # Respond with georeferenced PDF
        response.write(property_pdf_georef)
    except ValueError:
        pass
    return response

## BELONGS IN VIEWS.py
def export_layer(request):
    '''
    (called on request for download GIS data)
    IN:
        Layer (default: property, leave modular to support forest_type, soil, others...)
        Format (default: zipped .shp, leave modular to support json & others)
        property
    OUT:
        layer file
    USES:
        pgsql2shp (OGR/PostGIS built-in)
    '''
    return render(request, 'landmapper/base.html', {})

### REGISTRATION/ACCOUNT MANAGEMENT ###
def accountsRedirect(request):
    response = redirect('/landmapper/auth/profile/')
    return response

# account login page
def login(request):
    context = {}
    context['RECAPTCHA_PUBLIC_KEY'] = settings.RECAPTCHA_PUBLIC_KEY
    login_next = request.GET.get('next')
    if login_next is not None:
        context['next'] = login_next
        redirect_to = login_next
    else:
        context['next'] = '/landmapper'
        redirect_to = '/landmapper'
    if request.method == 'POST':
        username = request.POST['login']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            django_login(request, user)
            return redirect(redirect_to)
        else:
            context['error'] = True
            context['error_message'] = "Wrong username or password"
    return render(request, 'landmapper/account/login.html', context)

# account profile page
def user_profile(request):
    if not request.user.is_authenticated:
        return redirect('%s?next=%s' % ('/landmapper/auth/login/', request.path))
    else:
        context = {}
        user_properties = PropertyRecord.objects.filter(user=request.user).order_by('name')
        if user_properties.count() > 0:
            show_properties = True
        else:
            show_properties = False
        context['properties'] = user_properties
        context['show_properties'] = show_properties
        return render(request, 'landmapper/account/profile.html', context)

def terms_of_use(request):
    context = {}
    return render(request, 'landmapper/tou.html', context)

def privacy_policy(request):
    context = {}
    return render(request, 'landmapper/privacy.html', context)

@staff_member_required
def exportPropertyRecords(request):
    import io
    import os
    import subprocess
    from tempfile import TemporaryDirectory
    import zipfile

    sep = os.sep
    today=localtime().strftime("%Y-%m-%d")
    filename='landmapper_propertyrecords'
    database_name=settings.DATABASES['default']['NAME']
    db_user = settings.DATABASES['default']['USER']
    db_password = settings.DATABASES['default']['PASSWORD']
    db_pw_command = " -P {}".format(db_password) if db_password != '' else ''

    # Create temporary dir
    with TemporaryDirectory() as shpdir:
        # Export shapefile to temporary named dir
        EXPORT_SHAPEFILE_COMMAND = "pgsql2shp -u {db_user}{db_pw_command} -f {shpdir}{sep}{today}_{filename} {database_name} \"SELECT u.first_name, u.last_name, u.email, u.is_staff, u.is_active, u.last_login, u.date_joined, p.id, p.user_id, p.name, p.date_created, p.date_modified, p.record_taxlots, p.geometry_final FROM app_propertyrecord as p left join auth_user as u on u.id = p.user_id;\"".format(
            db_user=db_user,
            db_pw_command=db_pw_command,
            shpdir=shpdir,
            sep=sep,
            today=today,
            filename=filename,
            database_name=database_name
        )
        subprocess.run(EXPORT_SHAPEFILE_COMMAND, shell=True)

        # Zip shapefile to bytestream
        os.chdir(shpdir)
        files = os.listdir(shpdir)
        zip = io.BytesIO()
        with zipfile.ZipFile(zip, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for file in files:
                zf.write(file, compress_type=zipfile.ZIP_DEFLATED)
        zip.seek(0)

        # Return zipped shapefile
        response = HttpResponse(content=zip.read(), content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename={today}_{filename}.zip'.format(today=today, filename=filename)
        return response

def homeRedirect(request):
    return redirect('/')