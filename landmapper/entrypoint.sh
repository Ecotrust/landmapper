#!/bin/sh

# Exit on errors
set -e

# If a SQL_HOST is provided, wait for Postgres to become available before running
# migrations. This prevents race conditions when using docker-compose where the
# web container starts before the DB is ready.
if [ -n "$SQL_HOST" ]; then
	echo "Waiting for database at ${SQL_HOST}:${SQL_PORT:-5432}..."
	# pg_isready is available after installing postgresql-client in the image
	until pg_isready -h "$SQL_HOST" -p "${SQL_PORT:-5432}" >/dev/null 2>&1; do
		echo "Postgres is unavailable - sleeping"
		sleep 1
	done
	echo "Postgres is up"
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput
echo "Applying database migrations..."
python manage.py migrate --noinput
# Load default users only if no users exist
# echo "Checking for existing users..."
# if [ "$(python manage.py shell -c 'from django.contrib.auth import get_user_model; print(get_user_model().objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
# 	echo "No users found, loading default users fixture..."
#     python manage.py loaddata TEKDB/fixtures/default_users_fixture.json
# fi

# Load default lookups only if no lookups exist. Use LookupPlanningUnit as the check.
echo "Checking for existing initial data..."
if [ "$(python manage.py shell -c 'from app.models import MenuPage; print(MenuPage.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
    echo "No initial data found, loading default initial data fixture..."
	python manage.py loaddata app/fixtures/initial_data.json
fi

# if [ "$1" = "prod" ]; then
#     echo "Starting uWSGI (socket) on :8000"
#     uwsgi --socket :8000 --master --enable-threads --module TEKDB.wsgi
# elif [ "$1" = "prod-local" ]; then
# 	echo "Starting uWSGI (http) on :8000 with local settings"
# 	uwsgi --http :8000 --master --enable-threads --module TEKDB.wsgi
# elif [ "$1" = "dev" ]; then
echo "Starting python development server on :8000"
python manage.py runserver 0.0.0.0:8000
# else
#     # Default to the passed command if not 'prod' or 'dev'
#     exec "$@"
# fi