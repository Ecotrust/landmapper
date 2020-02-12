"""marineplanner URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/1.10/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  url(r'^$', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  url(r'^$', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.conf.urls import url, include
    2. Add a URL to urlpatterns:  url(r'^blog/', include('blog.urls'))
"""
from django.urls import include, re_path
from django.contrib import admin
### INSERT ADDITIONAL IMPORTS HERE ###
import accounts.urls
from landmapper.views import account
### END PROJECT URL IMPORTS ###

app_name="landmapper"

urlpatterns = [
    re_path(r"^admin/?", admin.site.urls),
    ### INSERT PROJECT URL INCLUDES HERE ###
    # url(r"^features/", include("features.urls")),
    re_path(r"^manipulators/", include("manipulators.urls")),
    re_path(r"^account/auth/", include("social.apps.django_app.urls", namespace="social")),
    # url(r"^accounts/$", account, name="login"),
    re_path(r"^accounts/", include("accounts.urls", namespace="account")),
    re_path(r'^data_manager/', include('data_manager.urls')),
    # url(r"^visualize/", include("visualize.urls")),
    re_path(r"^scenario/", include("scenarios.urls")),
    re_path(r"^drawing/", include("drawing.urls")),
    re_path(r"^landmapper/", include(("landmapper.urls", "landmapper"), namespace="landmapper")),
    re_path(r"", include("landmapper.urls")),
    ### END PROJECT URL INCLUDES ###
    # url(r'^visualize/', include('visualize.urls')),
    # url(r'^account/auth/', include('social.apps.django_app.urls', namespace='social')),
    # url(r'^account/', include('accounts.urls', namespace="account")),
    # url(r'^data_manager/', include('data_manager.urls', namespace="data_manager")),
]

def urls(namespace='landmapper'):
    """Returns a 3-tuple for use with include().

    The including module or project can refer to urls as namespace:urlname,
    internally, they are referred to as app_name:urlname.
    """
    return (urlpatterns, 'landmapper', namespace)
