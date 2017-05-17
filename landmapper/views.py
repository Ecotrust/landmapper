from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse
from django.template import loader
from django.conf import settings
# TODO tax lot model
# from .models import TaxLots

def getBaseContext():
    context = {
        #title var should be used in header template
        'title': 'LandMapper'
    }
    return context

def index(request):
    template = loader.get_template('landmapper/home.html')
    context = getBaseContext()
    #from cms.models import Content
    #copy = Content.objects.get(id="homepage-text")
    ## Use var copy in dict below
    context['content'] = {
        'title':    'Welcome to Land Mapper',
        'is_auth':  'Start Mapping',
        'unauth':   'Start Mapping',
        'copy': 'Kickstarter synth quis, fashion axe street art single-origin coffee enim. Air plant sed sartorial, live-edge letterpress fugiat veniam authentic ethical. Austin normcore 8-bit reprehenderit enamel pin nihil, air plant sriracha poke kombucha godard. Crucifix +1 woke, tofu wayfarers mixtape sartorial culpa trust fund sustainable accusamus distillery esse austin iPhone. Aliqua chia placeat, +1 vaporware minim blue bottle. Vinyl copper mug mlkshk asymmetrical, consequat mixtape excepteur succulents laboris. Nisi venmo irony, minim tumblr pinterest VHS organic shabby chic cray deep v chia squid vinyl.',
    }
    return HttpResponse(template.render(context, request))

def about(request):
    template = loader.get_template('landmapper/generic.html')
    context = getBaseContext()
    context['content'] = {
        'title': 'About Title',
        'copy': '<p>Stuff <b>about</b> stuff!</p>',
    }
    return HttpResponse(template.render(context, request))

def help(request):
    template = loader.get_template('landmapper/generic.html')
    context = getBaseContext()
    context['content'] = {
        'title': 'Help Title',
        'copy': '<p>Stuff <b>help</b> stuff!</p>',
    }
    return HttpResponse(template.render(context, request))

def visualize(request):
    template = loader.get_template('landmapper/planner.html')
    context = getBaseContext()
    context['content'] = {
        'title': 'Viz',
    }
    context['anonymousDraw'] = settings.ALLOW_ANONYMOUS_DRAW
    return HttpResponse(template.render(context, request))

def account(request):
    template = loader.get_template('landmapper/login.html')
    context = getBaseContext()
    context['content'] = {
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
