from django.shortcuts import render
from django.views.decorators.cache import cache_page
from django.http import HttpResponse, HttpResponseBadRequest
from django.template import loader
from marineplanner import settings
from .models import *

def getBaseContext():
    context = {
        #title var should be used in header template
        'title': 'LandMapper',
        'header_login': 'Sign In To Your Account',
        'header_social_login': 'Sign In With',
    }
    return context

def index(request):
    template = loader.get_template('landmapper/home.html')
    context = getBaseContext()
    try:
        page_content_obj = PageContent.objects.get(page="Home")
        if page_content_obj.is_html:
            page_content = page_content_obj.html_content
        else:
            page_content = page_content_obj.content
    except Exception as e:
        page_content = "<h3>Set Home Page Content In Admin</h3>"
    #from cms.models import Content
    #copy = Content.objects.get(id="homepage-text")
    ## Use var copy in dict below
    context['content'] = {
        'title': 'Simple Woodland Discovery',
        'cta':  'Start Mapping',
        'login': 'Account',
        'copy': page_content,
    }
    return HttpResponse(template.render(context, request))

def about(request):
    template = loader.get_template('landmapper/generic.html')
    context = getBaseContext()
    try:
        page_content_obj = PageContent.objects.get(page="About")
        if page_content_obj.is_html:
            page_content = page_content_obj.html_content
        else:
            page_content = page_content_obj.content
    except Exception as e:
        page_content = "<h3>Set About Page Content In Admin</h3>"
    context['content'] = {
        'title': 'About',
        'copy': page_content,
    }
    return HttpResponse(template.render(context, request))

def help(request):
    template = loader.get_template('landmapper/generic.html')
    context = getBaseContext()
    try:
        page_content_obj = PageContent.objects.get(page="Help")
        if page_content_obj.is_html:
            page_content = page_content_obj.html_content
        else:
            page_content = page_content_obj.content
    except Exception as e:
        page_content = "<h3>Set Help Page Content In Admin</h3>"
    context['content'] = {
        'title': 'Help',
        'copy': page_content,
    }
    return HttpResponse(template.render(context, request))

def planner(request):
    template = loader.get_template('landmapper/planner.html')
    context = getBaseContext()
    context['content'] = {
        'title': 'Viz',
    }
    context['anonymousDraw'] = settings.ALLOW_ANONYMOUS_DRAW
    return HttpResponse(template.render(context, request))

def account(request):
    template = loader.get_template('landmapper/blocks/login.html')
    context = getBaseContext()
    context['content'] = {
        'header_login': 'Log into your account',
        'title': 'acct',
    }
    return HttpResponse(template.render(context, request))

def portfolio(request, portfolio_id):
    #TODO write this template
    template = loader.get_template('landmapper/portfolio.html')
    user = request.GET.user
    #TODO Check this syntax
    #if user is authenticated
    #TODO Write this model
    from landmapper.models import Portfolio
    user_portfolio = Portfolio.objects.get(user=user)
    context = getBaseContext()
    context['content'] = {
        'title': 'Your Portfolio',
        'copy': '<p>blah blah</p>',
    }
    context['portfolio'] = user_portfolio.as_dict()
    return HttpResponse(template.render(context, request))

from django.views.decorators.clickjacking import xframe_options_exempt, xframe_options_sameorigin
@xframe_options_sameorigin
def get_taxlot_json(request):
    from django.contrib.gis.geos import GEOSGeometry
    from .models import Taxlot
    import json
    coords = request.GET.getlist('coords[]') # must be [lon, lat]
    intersect_pt = GEOSGeometry('POINT(%s %s)' % (coords[0], coords[1]))
    try:
        lot = Taxlot.objects.get(geometry__intersects=intersect_pt)
        lot_json = lot.geometry.wkt
    except:
        lots = Taxlot.objects.filter(geometry__intersects=intersect_pt)
        if len(lots) > 0:
            lot = lots[0]
            lot_json = lot.geometry.json
        else:
            lot_json = []
    return HttpResponse(json.dumps({"geometry": lot_json}), status=200)

@cache_page(60 * 60 * 24 * 365)
def geosearch(request):
    """
    Returns geocoded results in MERCATOR projection
    First tries coordinates, then a series of geocoding engines
    """
    from geopy import distance, geocoders
    from geopy.point import Point
    import json
    if request.method != 'GET':
        return HttpResponse('Invalid http method; use GET', status=405)

    try:
        txt = str(request.GET['search'])
    except:
        return HttpResponseBadRequest()

    searchtype = lat = lon = None
    place = txt
    try:
        p = Point(txt)
        lat, lon, altitude = p
        searchtype = 'coordinates'
    except:
        pass  # not a point

    centerloc = Point("45.54 N 120.64 W")
    max_dist = 315  # should be everything in WA and Oregon

    searches = [
        # geocoders.GeoNames(),
        # geocoders.OpenMapQuest(),
        geocoders.Nominatim(),
        # geocoders.Yahoo(app_id=settings.APP_NAME),
        # geocoders.Bing(api_key=settings.BING_API_KEY),
        # these are tried in reverse order, fastest first
        # TODO thread them and try them as they come in.
    ]

    while not (searchtype and lat and lon):  # try a geocoder
        try:
            g = searches.pop()
        except IndexError:
            break  # no more search engines left to try

        try:
            for p, loc in g.geocode(txt, exactly_one=False):
                d = distance.distance(loc, centerloc).miles
                if d < max_dist:
                    # TODO maybe compile these and return the closest to map center?
                    # print g, p, loc
                    place = p
                    lat = loc[0]
                    lon = loc[1]
                    max_dist = d
                else:
                    pass
            searchtype = g.__class__.__name__
        except:
            pass

    if searchtype and lat and lon:  # we have a winner
        from django.contrib.gis.geos import GEOSGeometry
        cntr = GEOSGeometry('SRID=4326;POINT(%f %f)' % (lon, lat))
        cntr.transform(settings.GEOMETRY_DB_SRID)
        cntrbuf = cntr.buffer(settings.POINT_BUFFER)
        extent = cntrbuf.extent
        loc = {
            'status': 'ok',
            'search': txt,
            'place': place,
            'type': searchtype,
            'extent': extent,
            'latlon': [lat, lon],
            'center': (cntr[0], cntr[1]),
        }
        json_loc = json.dumps(loc)
        return HttpResponse(json_loc, content_type='application/json', status=200)
    else:
        loc = {
            'status': 'failed',
            'search': txt,
            'type': None,
            'extent': None,
            'center': None,
        }
        json_loc = json.dumps(loc)
        return HttpResponse(json_loc, content_type='application/json', status=404)
