#!/bin/bash

APPS_ROOT=/usr/local/apps
MANAGE=$APPS_ROOT/landmapper/landmapper/manage.py
ENV_PYTHON=$APPS_ROOT/env/bin/python

sudo apt update
sudp apt upgrade
sudo apt install python3-pip postgresql postgresql-contrib postgresql-server-dev-14 postgis python3-gdal libgdal-dev redis-server pdftk msttcorefonts -y
# export CPLUS_INCLUDE_PATH=/usr/include/gdal
# export C_INCLUDE_PATH=/usr/include/gdal

sudo chown $USER $APPS_ROOT/
mkdir $APPS_ROOT/pdf
# sudo chown www-data $APPS_ROOT/pdf

# setup_env.sh
python3 -m pip install --user virtualenv
cd $APPS_ROOT
python3 -m virtualenv env
source $APPS_ROOT/env/bin/activate
pip install update pip
pip install -r $APPS_ROOT/landmapper/requirements.txt
GDAL_VERSION=`gdal-config --version`
pip install "pygdal==$GDAL_VERSION.*"

# TODO: If no landmapper/landmapper/local_settings.py, copy (configure?) local_settings.py.template in

# setup_database.sh
PG_HBA="/etc/postgresql/14/main/pg_hba.conf"
NEXT_LINE="local[[:space:]]+all[[:space:]]+postgres[[:space:]]+peer"
NEW_LINES="local     landmapper      postgres        trust\nlocal     all      postgres        peer"
sudo sed -i -E "s/$NEXT_LINE/$NEW_LINES/g" $PG_HBA
sudo service postgresql reload
sudo -u postgres createdb landmapper

# TODO: Do we need to add the postGIS extension, or does migrate do that (looks like it does...)
# psql -U postgres -d landmapper -c 'CREATE EXTENSION postgis'

python $MANAGE migrate
python $MANAGE loaddata $APPS_ROOT/landmapper/landmapper/app/fixtures/initial_data.json
# python $MANAGE enable_sharing all

# TODO: if no $APPS_ROOT/landmapper/data/OR_TAXLOTS.sql file, download it
psql -U postgres -d landmapper -f $APPS_ROOT/landmapper/data/OR_TAXLOTS.sql
# TODO: if no $APPS_ROOT/landmapper/data/FOREST_TYPES.sql file, download it
psql -U postgres -d landmapper -f $APPS_ROOT/landmapper/data/FOREST_TYPES.sql
# TODO: if no $APPS_ROOT/landmapper/data/POPULATION_GRID.sql file, download it
psql -U postgres -d landmapper -f $APPS_ROOT/landmapper/data/POPULATION_GRID.sql
# TODO: if no $APPS_ROOT/landmapper/data/SOIL_GRID.sql file, download it
psql -U postgres -d landmapper -f $APPS_ROOT/landmapper/data/SOIL_GRID.sql

DJ_ALIAS='alias dj="'$ENV_PYTHON' '$MANAGE'"'
RUN_ALIAS='alias djrun="dj runserver 0:8000"'
echo $DJ_ALIAS >> ~/.bashrc
echo $RUN_ALIAS >> ~/.bashrc
