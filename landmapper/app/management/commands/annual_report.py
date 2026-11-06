from django.core.management.base import BaseCommand, CommandError
from django.core.cache import cache
from datetime import datetime
from django.contrib.auth.models import User
from app.models import PropertyRecord, sq_meters_to_acres

class Command(BaseCommand):
    help = 'prints an annual report'

    def add_arguments(self, parser):
        parser.add_argument(
            '--year',
            type=int,
            default=datetime.now().year,
            help='Specify the year for the annual report'
        )

    def handle(self, *args, **options):
        current_year = options['year']
        users = User.objects.filter(is_superuser=False).filter(date_joined__year__lte=current_year)
        superusers = User.objects.filter(is_superuser=True)
        prs = PropertyRecord.objects.exclude(user__in=superusers).filter(date_created__year__lte=current_year)
        new_prs = prs.filter(date_created__year=current_year)
        anon_new_prs = new_prs.filter(user=None)
        registered_new_prs = new_prs.exclude(user=None)
        last_prs = prs.filter(date_created__year=current_year-1)
        anon_last_prs = last_prs.filter(user=None)
        registered_last_prs = last_prs.exclude(user=None)
        prior_prs = prs.filter(date_created__year__lt=current_year-1)
        anon_prior_prs = prior_prs.filter(user=None)
        registered_prior_prs = prior_prs.exclude(user=None)

        report = []
        report.append(['', str(current_year-1), str(current_year)])
        report.append(['', '----', '----'])
        report.append(['# Registered Users', users.filter(date_joined__year__lt=current_year).count(), users.count()])
        report.append(['New Registered Users', users.filter(date_joined__year=current_year-1).count(), users.filter(date_joined__year=current_year).count()])
        report.append(['Active Registered Users*', users.filter(last_login__year=current_year-1).count(), users.filter(last_login__year=current_year).count()])
        report.append(['# Mapped Properties', prs.filter(date_created__year__lt=current_year).count(), prs.count()])
        report.append(['# Mapped Properties by Registered Users', registered_prior_prs.count() + registered_last_prs.count(), registered_prior_prs.count() + registered_last_prs.count() + registered_new_prs.count()])
        report.append(['# Mapped Properties by Anonymous Users', anon_prior_prs.count() + anon_last_prs.count(), anon_prior_prs.count() + anon_last_prs.count() + anon_new_prs.count()])
        report.append(['New Mapped Properties', last_prs.count(), new_prs.count()])
        report.append(['New Mapped Properties by Registered Users', registered_last_prs.count(), registered_new_prs.count()])
        report.append(['New Mapped Properties by Anonymous Users', anon_last_prs.count(), anon_new_prs.count()])

        prior_acres = 0
        anon_prior_acres = 0
        registered_prior_acres = 0
        last_year_acres = 0
        anon_last_acres = 0
        registered_last_acres = 0
        this_year_acres = 0
        anon_new_acres = 0
        registered_new_acres = 0

        for pr in registered_prior_prs:
            registered_prior_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        for pr in anon_prior_prs:
            anon_prior_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        prior_acres = anon_prior_acres + registered_prior_acres
        for pr in registered_last_prs:
            registered_last_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        for pr in anon_last_prs:
            anon_last_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        last_year_acres = anon_last_acres + registered_last_acres
        for pr in registered_new_prs:
            registered_new_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        for pr in anon_new_prs:
            anon_new_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        this_year_acres = anon_new_acres + registered_new_acres

        total_acres = round(prior_acres + last_year_acres + this_year_acres)
        total_acres_registered = round(registered_prior_acres + registered_last_acres + registered_new_acres)
        total_acres_anon = round(anon_prior_acres + anon_last_acres + anon_new_acres)
        last_year_acres = round(last_year_acres)
        last_year_acres_registered = round(registered_last_acres)
        last_year_acres_anon = round(anon_last_acres)
        this_year_acres = round(this_year_acres)
        this_year_acres_registered = round(registered_new_acres)
        this_year_acres_anon = round(anon_new_acres)
        prior_acres = round(prior_acres)
        prior_acres_registered = round(registered_prior_acres)
        prior_acres_anon = round(anon_prior_acres)

        report.append(['Total Acres Mapped', last_year_acres + prior_acres, total_acres])
        report.append(['Total Acres Mapped [Registered]', last_year_acres_registered + prior_acres_registered, total_acres_registered])
        report.append(['Total Acres Mapped [Anon]', last_year_acres_anon + prior_acres_anon, total_acres_anon])
        report.append(['New Acres Mapped', last_year_acres, this_year_acres])
        report.append(['New Acres Mapped [Registered]', last_year_acres_registered, this_year_acres_registered])
        report.append(['New Acres Mapped [Anon]', last_year_acres_anon, this_year_acres_anon])

        max_length = max(len(str(word)) for row in report for word in row) + 2

        print("Annual Report Data for {}:".format(current_year))
        print("==============================".format(current_year))
        for row in report:
            print("".join(str(word).ljust(max_length) for word in row))