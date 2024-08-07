from django.contrib import admin
from django.db import models
from .models import MenuPage, Taxlot, ForestType, PropertyRecord, Profile, TwoWeekFollowUpSurvey, COA
from tinymce.widgets import TinyMCE


# Register your models here.
class MenuPageAdmin(admin.ModelAdmin):
    formfield_overrides = {
        models.TextField: {'widget': TinyMCE}
    }
    class Meta:
        fields = '__all__'

class PropertyRecordAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'date_created', 'property_id')
    readonly_fields = ('date_created', 'date_modified')
    fieldsets = (
        ('Property Record', {
            'fields': (
                'user', 'name', 'geometry_orig', 'geometry_final', 'record_taxlots',
                ('date_created', 'date_modified'),
            )
        }),
    )

class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'profile_questions_status', 'date_created')

class TwoWeekFollowUpSurveyAdmin(admin.ModelAdmin):
    list_display = ('user', 'email_sent', 'survey_complete')

# admin.site.unregister(FlatBlock)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(TwoWeekFollowUpSurvey, TwoWeekFollowUpSurveyAdmin)
admin.site.register(Taxlot)
admin.site.register(MenuPage, MenuPageAdmin)
admin.site.register(ForestType)
admin.site.register(COA)
admin.site.register(PropertyRecord, PropertyRecordAdmin)
