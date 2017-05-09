from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse
from django.template import loader

def index(request):
    template = loader.get_template('index.html')
    context = {
        'title': 'LandMapper',
        'self': {
            'title': 'Woodland Discovery'
        }
    }
    return HttpResponse(template.render(context, request))

def about(request):
    template = loader.get_template('generic.html')
    context = {
        'title': 'LandMapper',
        'content': {
            'title': 'Content Title',
            'copy': '<p>Stuff <b>about</b> stuff!</p>',
        }
    }
    return HttpResponse(template.render(context, request))

def help(request):
    template = loader.get_template('generic.html')
    context = {
        'title': 'LandMapper',
        'content': {
            'title': 'Help Title',
            'copy': '<p>Stuff <b>help</b> stuff!</p>',
        }
    }
    return HttpResponse(template.render(context, request))

def portfolio(request, portfolio_id):
    #TODO write this template
    template = loader.get_template('portfolio.html')
    user = request.GET.user
    #TODO Check this syntax
    #if user is authenticated
    #TODO Write this model
    from landmapper.models import Portfolio
    user_portfolio = Portfolio.objects.get(user=user)
    context = {
        'title': 'LandMapper',
        'content': {
            'title': 'Your Portfolio',
            'copy': '<p>blah blah</p>',
        },
        'portfolio': user_portfolio.as_dict()
    }
    return HttpResponse(template.render(context, request))
