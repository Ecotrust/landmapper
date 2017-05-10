from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse
from django.template import loader

def getBaseContext():
    context = {
        #title var should be used in header template
        'title': 'LandMapper'
    }
    return context

def index(request):
    template = loader.get_template('generic.html')
    context = getBaseContext()
    #from cms.models import Content
    #copy = Content.objects.get(id="homepage-text")
    ## Use var copy in dict below
    context['content'] = {
        'title': 'Welcome to Land Mapper',
        'copy': '<p>Kickstarter synth quis, fashion axe street art single-origin coffee enim. Air plant sed sartorial, live-edge letterpress fugiat veniam authentic ethical. Austin normcore 8-bit reprehenderit enamel pin nihil, air plant sriracha poke kombucha godard. Crucifix +1 woke, tofu wayfarers mixtape sartorial culpa trust fund sustainable accusamus distillery esse austin iPhone. Aliqua chia placeat, +1 vaporware minim blue bottle. Vinyl copper mug mlkshk asymmetrical, consequat mixtape excepteur succulents laboris. Nisi venmo irony, minim tumblr pinterest VHS organic shabby chic cray deep v chia squid vinyl.</p>\
            <p>Hell of authentic mlkshk exercitation, consectetur vice tofu before they sold out put a bird on it everyday carry pickled readymade. Asymmetrical woke ullamco chillwave farm-to-table eu. Duis flannel gastropub venmo keytar, wolf everyday carry four dollar toast snackwave kickstarter flexitarian gentrify excepteur assumenda. Voluptate man bun accusamus, blog bicycle rights kickstarter craft beer church-key aesthetic meggings echo park enim chartreuse dolore. Veniam pabst DIY, ullamco cold-pressed tacos placeat consequat vice iceland celiac pariatur skateboard. Chartreuse cred cold-pressed, fingerstache farm-to-table seitan swag pork belly narwhal woke man braid. Edison bulb fingerstache slow-carb placeat, cred tofu actually neutra chicharrones.</p>',
    }
    return HttpResponse(template.render(context, request))

def about(request):
    template = loader.get_template('generic.html')
    context = getBaseContext()
    context['content'] = {
        'title': 'About Title',
        'copy': '<p>Stuff <b>about</b> stuff!</p>',
    }
    return HttpResponse(template.render(context, request))

def help(request):
    template = loader.get_template('generic.html')
    context = getBaseContext()
    context['content'] = {
        'title': 'Help Title',
        'copy': '<p>Stuff <b>help</b> stuff!</p>',
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
    context = getBaseContext()
    context['content'] = {
        'title': 'Your Portfolio',
        'copy': '<p>blah blah</p>',
    }
    context['portfolio'] = user_portfolio.as_dict()
    return HttpResponse(template.render(context, request))
