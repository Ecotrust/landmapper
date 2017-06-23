from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^about/', views.about, name='about'),
    url(r'^help/', views.help, name='help'),
    url(r'^user/', views.index, name='user'),
    url(r'^search/', views.index, name='search'),
    url(r'^portfolio/', views.index, name='portfolio'),
    # TODO fix urls so account and visualize static text can be overwritten
    url(r'^visualize/', views.visualize, name='visualize'),
    url(r'^account/', views.account, name='login'),
    url(r'^get_taxlot_json', views.get_taxlot_json, name='get taxlot json'),
    url(r'^', views.index, name='index'),
]
