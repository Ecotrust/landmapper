from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
import sys, os
from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from app.models import Profile, TwoWeekFollowUpSurvey, PropertyRecord
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Replaces users, emails, properties, profiles, and surveys with provided fixture -- provide 1 fixture for user/emails/properties/surveys, and a second for profiles'

    def add_arguments(self, parser):
        parser.add_argument('infiles', nargs=2, type=str)

    def handle(self, *args, **options):

        if 'infiles' in options.keys() and len(options['infiles']) == 2 and options['infiles'][0][-4:].lower() == 'json' and options['infiles'][1][-4:].lower() == 'json':
            USERS_FIXTURE = options['infiles'][0]
            PROFILES_FIXTURE = options['infiles'][1]
        else:
            print('Usage: manage.py replaceusers /full/path/to/input/users_file.json  /full/path/to/input/profiles_file.json (must be a two JSON fixtures)')
            sys.exit()

        if not os.path.isfile(USERS_FIXTURE):
            print("ERROR -- File does not exist: '{}'".format(USERS_FIXTURE))
            sys.exit()

        if not os.path.isfile(PROFILES_FIXTURE):
            print("ERROR -- File does not exist: '{}'".format(PROFILES_FIXTURE))
            sys.exit()

        code_deleted = False
        USERS_OUTFILE = '/usr/local/apps/landmapper/backups/management_temp/temp_userpropertyfixture.json'
        PROFILES_OUTFILE = '/usr/local/apps/landmapper/backups/management_temp/temp_userpropertyfixture.json'
        try:
            # Create a nice temp backup in case you need it
            sysout = sys.stdout
            sys.stdout = open(USERS_OUTFILE, 'w')
            call_command('dumpdata', '--natural-foreign', '--exclude=auth.permission', '--exclude=contenttypes', '--indent=2', 'auth.user', 'account.emailaddress', 'app.twoweekfollowupsurvey', 'app.propertyrecord')
            sys.stdout = open(PROFILES_OUTFILE, 'w')
            call_command('dumpdata', '--natural-foreign', '--exclude=auth.permission', '--exclude=contenttypes', '--indent=2', 'app.profile')
            sys.stdout = sysout
            if os.path.isfile(USERS_FIXTURE) and os.path.isfile(PROFILES_FIXTURE):
                # Deleting a user will also delete their email address record, surveys, profiles, and properties
                User.objects.all().delete()
                code_deleted = True
                call_command('loaddata', USERS_FIXTURE)
                # When users are created, so are profiles. To prevent clashing IDs, we blow the default profiles away:
                Profile.objects.all().delete()
                call_command('loaddata', PROFILES_FIXTURE)
        except Exception as e:
            print(e)
            if code_deleted:
                User.objects.all().delete()
                call_command('loaddata', USERS_OUTFILE)
                Profile.objects.all().delete()
                call_command('loaddata', PROFILES_OUTFILE)
                
        cache.clear()
