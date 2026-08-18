#!/bin/sh
set -e

# This script runs automatically when the PostgreSQL container is first initialized
# It will only run if the database is empty (first time setup)
TAXLOTS_FILE="/tmp/OR_TAXLOTS_2021.sql"
POPULATION_GRID_FILE="/tmp/OR_POPULATION_2021.sql"
FOREST_TYPES_FILE="/tmp/FOREST_TYPES_2021.sql"
SOIL_GRID_FILE="/tmp/OR_SOIL_2021.sql"


echo "Importing database dump..."

# Import the SQL dump, ignoring meta-command errors
PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=0 < "$TAXLOTS_FILE"

PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=0 < "$POPULATION_GRID_FILE"

PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=0 < "$FOREST_TYPES_FILE"

PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=0 < "$SOIL_GRID_FILE"


echo "Database import completed!"