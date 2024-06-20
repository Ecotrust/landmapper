from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
import sys, os
from allauth.account.models import EmailAddress
from django.contrib.auth.models import User
from app.models import Profile, TwoWeekFollowUpSurvey, PropertyRecord
from django.core.management import call_command

class Command(BaseCommand):
    help = 'Identifies accounts with duplicate emails to help resolve cleaning them up.'

    # def add_arguments(self, parser):
    #     parser.add_argument('infiles', nargs=2, type=str)

    def handle(self, *args, **options):

        PREFIX = "==="
        for email in EmailAddress.objects.all():
            users = User.objects.filter(email=email.email)
            if users.count() > 1:
                print("+++++++++++++++++++++++++++++++++++++++++++++++++++++++")
                print("'{}' -- Has {} users:".format(email.email, users.count()))
                for user in users.order_by('-last_login'):
                    print("-----------------------------------------")
                    print("{} Username:\t\t\t{}".format(PREFIX, user.username))
                    print("{} ID:\t\t\t\t{}".format(PREFIX, user.pk))
                    print("{} Is Address Owner:\t\t{}".format(PREFIX, user == email.user))
                    profile = Profile.objects.filter(user=user)
                    if len(profile) == 1:
                        profile_status = profile[0].profile_questions_status
                    else:
                        profile_status = 'None'
                    print("{} Profile status:\t\t{}".format(PREFIX, profile_status))
                    if not user.last_login == None:
                        print("{} Last login:\t\t\t{}".format(PREFIX, user.last_login.strftime("%Y-%m-%d")))
                    else:
                        print("{} Last login:\t\t\tNEVER".format(PREFIX))
                    print("{} Date joined:\t\t{}".format(PREFIX, user.date_joined.strftime("%Y-%m-%d")))
                    survey = TwoWeekFollowUpSurvey.objects.filter(user=user)
                    if len(survey) == 1:
                        survey_status = survey[0].survey_complete
                    else:
                        survey_status = 'None'
                    print("{} Survey completed:\t\t{}".format(PREFIX, survey_status))
                    records = PropertyRecord.objects.filter(user=user)
                    print("{} Properties:\t\t\t{}".format(PREFIX, records.count()))

                print("-----------------------------------------")

        # # Find all users with duplicate email accounts
        # email_list = []
        # for user in User.objects.all():
        #     if User.objects.filter(email=user.email).count() > 1:
        #         if user.email not in email_list:
        #             email_list.append(user.email)


        # # for each email dupe's users:
        #     # for each user:
        #         # Is the user associated with the EmailAddress record?
        #         # What is the status of the User's profile?
        #         # When was the user created?
        #         # When was the user last logged in?
        #         # What is the status of the user's survey?
        #         # Does the user have any property records?

        # # Identify which users
        # for email in email_list:
        #     email_properties = PropertyRecord.objects.filter(user__email=email)
        #     users = []
        #     for prop in email_properties:
        #         if prop.user not in users:
        #             users.append(prop.user)
        #     if len(users)>1:
        #         print("{} has {} users with property records".format(email, len(users)))
