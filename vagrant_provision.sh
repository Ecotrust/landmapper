#!/bin/bash
PROJECT_NAME=$1
APP_NAME=$2

PROJECT_DIR=/usr/local/apps/$PROJECT_NAME
VIRTUALENV_DIR=$PROJECT_DIR/env

APP_DB_NAME=$3

PYTHON=$VIRTUALENV_DIR/bin/python
PIP=$VIRTUALENV_DIR/bin/pip

# Virtualenv setup for project
echo "setting up virtualenvs"
# /usr/local/bin/virtualenv --system-site-packages $VIRTUALENV_DIR && \
/usr/bin/python3 -m venv $VIRTUALENV_DIR &&
    /usr/bin/python3 -m venv --system-site-packages $VIRTUALENV_DIR && \
    source $VIRTUALENV_DIR/bin/activate && \
    echo $PROJECT_DIR > $VIRTUALENV_DIR/.project && \
    cd $PROJECT_DIR && \
    echo "installing project dependencies"
    $PIP install --upgrade pip
    $PIP install --src ./deps -r requirements.txt
    ### INSERT PROJECT PROVISION FILES HERE ###
    $PIP install -e $PROJECT_DIR/apps/madrona-features && \ 
    $PIP install -e $PROJECT_DIR/apps/madrona-manipulators && \ 
    $PIP install -e $PROJECT_DIR/apps/marco-map_groups && \ 
    $PIP install -e $PROJECT_DIR/apps/mp-accounts && \ 
    $PIP install -e $PROJECT_DIR/apps/mp-data-manager && \ 
    $PIP install -e $PROJECT_DIR/apps/mp-visualize && \ 
    $PIP install -e $PROJECT_DIR/apps/p97-nursery && \ 
    ### END PROJECT PROVISION FILES ###

echo "resetting DB"
$PROJECT_DIR/scripts/reset_db $APP_DB_NAME #$USER

# Set execute permissions on manage.py as they get lost if we build from a zip file
chmod a+x $PROJECT_DIR/$APP_NAME/manage.py

# Run syncdb/migrate/update_index
echo "database syncing and migrations"
$PYTHON $PROJECT_DIR/$APP_NAME/manage.py migrate --noinput #&& \
# $PYTHON $PROJECT_DIR/$APP_NAME/manage.py update_index

# Load dev fixture
# echo "loading dev fixture data"
# $PYTHON $PROJECT_DIR/$APP_NAME/manage.py loaddata dev_fixture.json

#Collect static
echo "collect initial static"
yes yes | $PYTHON $PROJECT_DIR/$APP_NAME/manage.py collectstatic
rm -rf $PROJECT_DIR/static/modules

# Add a couple of aliases to manage.py into .bashrc
cat << EOF >> ~/.bashrc
alias dj="$PYTHON $PROJECT_DIR/$APP_NAME/manage.py"
alias djrun="dj runserver 0.0.0.0:8000"
EOF
