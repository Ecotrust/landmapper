"""
URL configuration for landmapper project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/dev/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path, include
from django.views.decorators.cache import cache_page
from app.views import *

urlpatterns = [
    path('', home, name="home"),
    path('identify/', identify, name="identify"),
    path('create_property_id/', create_property_id_from_request, name='create_property_id'),
    path('record/delete/<str:property_record_id>', delete_record, name='delete_record'),
    path('record/<str:property_record_id>', record_report, name='record_report'),
    path('report/<str:property_id>', report, name='report'),
    # map_type expects one of the following: aerial, street, terrain, stream, soil_types, forest_types
    path('report/<str:property_id>/<str:map_type>/map', get_property_map_image, name='get_property_map_image'),
    path('report/<str:property_id>/pdf', get_property_pdf, name='get_property_pdf'),
    path('report/<str:property_id>/<str:map_type>/pdf', get_property_map_pdf, name='get_property_map_pdf'),
    path('report/<str:property_id>/scalebar', get_scalebar_as_image, name='get_scalebar_as_image'),
    path('report/<str:property_id>/scalebar/<str:scale>', get_scalebar_as_image, name='get_scalebar_as_image'),
    path('report/<str:property_id>/scalebar/pdf/<str:scale>', get_scalebar_as_image_for_pdf, name='get_scalebar_as_pdf_image'),
    path('get_taxlot_json/', get_taxlot_json, name='get taxlot json'),
    path('auth/login/', login, name='login'),
    path('auth/profile/', user_profile, name='user_profile'),
    path('tou/', terms_of_use, name='tou'),
    path('privacy/', privacy_policy, name='privacy'),
    path('user_profile/', userProfileSurvey, name='user_profile_survey'),
    path('user_followup/', userProfileFollowup, name='user_profile_followup'),
    path('register/', accountsRedirect, name='accounts_redirect'),
    path('admin_export_property_records/', exportPropertyRecords, name='export_property_records'),
    path('accounts/profile/', homeRedirect, name='account_confirm_email'),
    path('auth/email/', homeRedirect, name='auth_email'),
]
