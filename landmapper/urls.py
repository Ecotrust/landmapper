from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^about/', views.about, name='about'),
    url(r'^help/', views.help, name='help'),
    url(r'^user/', views.index, name='user'),
    url(r'^search/', views.index, name='search'),
    url(r'^portfolio/', views.index, name='portfolio'),
    url(r'^', views.index, name='index'),
]
