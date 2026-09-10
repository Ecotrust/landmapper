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

echo "Configuring Site object..."
python manage.py shell << 'EOF'
from django.contrib.sites.models import Site
from django.conf import settings

site_id = getattr(settings, 'SITE_ID', 1)
domain = getattr(settings, 'ALLOWED_HOSTS', ['localhost'])[0]
if domain == '*':
    domain = 'localhost'

site, created = Site.objects.get_or_create(
    id=site_id,
    defaults={'domain': domain, 'name': 'Landmapper'}
)
if not created and (site.domain != domain or site.name != 'Landmapper'):
    site.domain = domain
    site.name = 'Landmapper'
    site.save()
    print(f"Updated Site: {site.name} ({site.domain})")
else:
    print(f"Site configured: {site.name} ({site.domain})")
EOF

# Load default lookups only if no lookups exist. Use MenuPage as the check.
echo "Checking for existing initial data..."
if [ "$(python manage.py shell -c 'from app.models import MenuPage; print(MenuPage.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
    echo "No initial data found, loading default initial data fixture..."
	python manage.py loaddata app/fixtures/initial_data.json
else
	echo "Initial data already exists, skipping fixture load."
fi

# Load geodata SQL dumps if tables are empty
echo "Checking for existing taxlot data..."
if [ "$(python manage.py shell -c 'from app.models import Taxlot; print(Taxlot.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
    echo "No taxlot data found, loading SQL dumps..."
    
    # Check if SQL files exist and load them
    TAXLOTS_FILE="/tmp/OR_TAXLOTS.sql"
    if [ -f "$TAXLOTS_FILE" ]; then
        echo "Loading taxlots from $TAXLOTS_FILE..."
        PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$TAXLOTS_FILE"
    else
        echo "WARNING: $TAXLOTS_FILE not found"
    fi
else
	echo "Taxlot data already exists, skipping SQL dump load."
fi

echo "Checking for population data..."
if [ "$(python manage.py shell -c 'from app.models import PopulationPoint; print(PopulationPoint.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
	echo "No population data found, loading SQL dump..."

	POPULATION_FILE="/tmp/OR_POPULATION_2021.sql"
    if [ -f "$POPULATION_FILE" ]; then
        echo "Loading population data from $POPULATION_FILE..."
        PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$POPULATION_FILE"
    else
        echo "WARNING: $POPULATION_FILE not found"
    fi
else 
	echo "Population data already exists, skipping SQL dump load."
fi

echo "Checking for Forest Types data..."
if [ "$(python manage.py shell -c 'from app.models import ForestType; print(ForestType.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
	echo "No Forest Types data found, loading SQL dump..."
	FOREST_FILE="/tmp/FOREST_TYPES_2021.sql"
	if [ -f "$FOREST_FILE" ]; then
		echo "Loading Forest Types data from $FOREST_FILE..."
		PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$FOREST_FILE"
	else
		echo "WARNING: $FOREST_FILE not found"
	fi

fi

echo "Checking for Soil Types data..."
if [ "$(python manage.py shell -c 'from app.models import SoilType; print(SoilType.objects.count())' 2>/dev/null | tail -1)" = "0" ]; then
	echo "No Soil Types data found, loading SQL dump..."
	SOIL_FILE="/tmp/OR_SOIL_2021.sql"
	if [ -f "$SOIL_FILE" ]; then
		echo "Loading Soil Types data from $SOIL_FILE..."
		PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$SOIL_FILE"
	else
		echo "WARNING: $SOIL_FILE not found"
	fi
fi

echo "Starting python development server on :8000"
python manage.py runserver 0.0.0.0:8000