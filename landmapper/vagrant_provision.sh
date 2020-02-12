#!/bin/bash
PROJECT_NAME=$1
APP_NAME=$2

PROJECT_DIR=/usr/local/apps/$PROJECT_NAME
VIRTUALENV_DIR=$PROJECT_DIR/env

APP_DB_NAME=$3

PYTHON=$VIRTUALENV_DIR/bin/python
PIP=$VIRTUALENV_DIR/bin/pip

MODULE_DIR=$4

`ln -s $MODULE_DIR/proj_urls.py $PROJECT_DIR/$APP_NAME/marineplanner/urls.py`
`ln -s $MODULE_DIR/project_settings.py $PROJECT_DIR/$APP_NAME/marineplanner/settings.py`

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
    ### END PROJECT PROVISION FILES ###

echo "resetting DB"
$PROJECT_DIR/scripts/reset_db.sh $APP_DB_NAME #$USER

# Set execute permissions on manage.py as they get lost if we build from a zip file
chmod a+x $PROJECT_DIR/$APP_NAME/manage.py

# Add a couple of aliases to manage.py into .bashrc
cat << EOF >> /etc/bash.bashrc
alias dj="$PYTHON $PROJECT_DIR/$APP_NAME/manage.py"
alias djrun="dj runserver 0.0.0.0:8000"
EOF

echo "Initial provision complete: next is module-level provisioning"
