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

# Load default lookups only if no lookups exist. Use MenuPage as the check.
echo "Checking for existing initial data..."
if [ "$(python manage.py shell -c 'from app.models import MenuPage; print(MenuPage.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
    echo "No initial data found, loading default initial data fixture..."
	python manage.py loaddata app/fixtures/initial_data.json
else
	echo "Initial data already exists, skipping fixture load."
fi

echo "Starting python development server on :8000"
python manage.py runserver 0.0.0.0:8000
# else
#     # Default to the passed command if not 'prod' or 'dev'
#     exec "$@"
# fi