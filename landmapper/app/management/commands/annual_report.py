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
        prs = PropertyRecord.objects.filter(user__in=users).filter(date_created__year__lte=current_year)
        new_prs = prs.filter(date_created__year=current_year)
        last_prs = prs.filter(date_created__year=current_year-1)
        prior_prs = prs.filter(date_created__year__lt=current_year-1)

        report = []
        report.append(['', str(current_year-1), str(current_year)])
        report.append(['', '----', '----'])
        report.append(['# Registered Users', users.filter(date_joined__year__lt=current_year).count(), users.count()])
        report.append(['New Registered Users', users.filter(date_joined__year=current_year-1).count(), users.filter(date_joined__year=current_year).count()])
        report.append(['Active Registered Users*', users.filter(last_login__year=current_year-1).count(), users.filter(last_login__year=current_year).count()])
        report.append(['# Mapped Properties', prs.filter(date_created__year__lt=current_year).count(), prs.count()])
        report.append(['New Mapped Properties', last_prs.count(), new_prs.count()])

        prior_acres = 0
        last_year_acres = 0
        this_year_acres = 0

        for pr in prior_prs:
            prior_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        for pr in last_prs:
            last_year_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)
        for pr in new_prs:
            this_year_acres += sq_meters_to_acres(pr.geometry_final.transform(2163, clone=True).area)

        total_acres = prior_acres + last_year_acres + this_year_acres

        total_acres = round(total_acres)
        last_year_acres = round(last_year_acres)
        this_year_acres = round(this_year_acres)
        prior_acres = round(prior_acres)

        report.append(['Acres Mapped', last_year_acres + prior_acres, total_acres])
        report.append(['New Acres Mapped', last_year_acres, this_year_acres])

        max_length = max(len(str(word)) for row in report for word in row) + 2

        print("Annual Report Data for {}:".format(current_year))
        print("==============================".format(current_year))
        for row in report:
            print("".join(str(word).ljust(max_length) for word in row))