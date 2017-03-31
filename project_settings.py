import sys, os
#globals().update(vars(sys.modules['marineplanner.settings']))

STATIC_ROOT = os.path.join(BASE_DIR, 'static')

INSTALLED_APPS += [
    ### BEGIN INSERTED INSTALLED APPS ###
    'features', 
    'manipulators', 
    'mapgroups', 
    'accounts', 
    'data_manager', 
    'visualize', 
    'nursery', 
    ### END INSERTED INSTALLED APPS ###
]

try:
    ### START MODULE SETTINGS IMPORT ###
    from features.settings import *
    from accounts.settings import *
    from data_manager.settings import *
    ### END MODULE SETTINGS IMPORT ###
except ImportError:
    pass

# If using postgres user with trust authentication, don't give host, password, or port.
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        # 'NAME': os.path.join(BASE_DIR, 'db.sqlite3'),
        'NAME': 'marineplanner',
        'USER': 'postgres',
        # 'HOST': 'localhost',
        # 'PASSWORD': 'SetInProjectSettings123!',
        # 'PORT': 5432,
    }
}

DEBUG = True
ALLOWED_HOSTS = ['localhost']
