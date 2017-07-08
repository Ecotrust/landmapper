# Land Mapper

Simple Woodland Discovery

## Installation
### Via Vagrant
#### Vanilla Bootstrap:
* Clone marineplanner-core onto your local system
* Copy scripts/configure_project.sh.template to scripts/configure_project.sh
* make configure_project.sh executable
* run your new configure_project script (may need to open in vim and enter :set fileformat=unix)
  * `./configure_project.sh landmapper landmapper`
* `vagrant up`
* wait 30 minutes (or more if you don't have the base box or have a slow connection)

###### MAC
If you have [Vagrant](https://www.vagrantup.com/downloads.html) installed on Mac:
```bash
git clone https://github.com/Ecotrust/marineplanner-core.git
cd marineplanner-core/scripts
cp configure_project.sh.template.mac configure_project.sh
chmod +x configure_project.sh
./configure_project.sh
vagrant up
```

###### Linux
If you have [Vagrant](https://www.vagrantup.com/downloads.html) installed on Linux:
```bash
git clone https://github.com/Ecotrust/marineplanner-core.git
cd marineplanner-core/scripts
cp configure_project.sh.template configure_project.sh
chmod +x configure_project.sh
./configure_project.sh landmapper landmapper
vagrant up
```

###### Run test server
```bash
vagrant ssh
cd /usr/local/apps/marineplanner-core/
source env/bin/activate
cd marineplanner
python manage.py runserver 0.0.0.0:8000
```
Then go [here](http://localhost:8111/visualize)


### On Standalone Server (Ubuntu 16.04 LTS)
#### Initial setup and downloading MP Core
1. `sudo apt-get update`
2. `sudo apt-get upgrade`
3. `sudo apt-get install git`
4. `mkdir /usr/local/apps`
5. `sudo chgrp adm /usr/local/apps`
6. `cd /usr/local/apps`
7. `git clone https://github.com/Ecotrust/marineplanner-core.git`

#### Install PostgreSQL/PostGIS and a few Dependencies
1. `cd /usr/local/apps/marineplanner-core/scripts/`
2. `sudo chmod +x vagrant_provision0.sh`
3. `sudo vagrant_provision0.sh xenial 3.5.0 9.5` #Ubuntu xenial, GEOS 3.5.0, PostgreSQL 9.5

#### Installing Your App
1. `cd /usr/local/apps/marineplanner-core/apps`
2. `git clone https://github.com/Ecotrust/landmapper.git`
3. `cp landmapper/scripts/production_configure.sh ../scripts/`
4. `cd ../scripts/`
5. `./production_configure.sh landmapper landmapper`
6. Upload the taxlot data sql (GIS/projects/LandMapper_Woodland_Discovery_2017/taxlot_planning_grid.sql)
7. `psql -U [dbusername] -d marineplanner -f ../apps/landmapper/data/taxlot_planning_grid.sql`

#### Serving Your App
1. `sudo apt-get install libpcre3 libpcre3-dev uwsgi uwsgi-plugin-python3 nginx`
2. `pip3 install uwsgi`
3. `cp /usr/local/apps/marineplanner-core/apps/landmapper/deploy/landmapper.conf /etc/nginx/sites-available/landmapper`
4. `sudo rm /etc/nginx/sites-enabled/default`
5. `sudo ln -s /etc/nginx/sites-available/landmapper /etc/nginx/sites-enabled/landmapper`
6. `sudo cp /usr/local/apps/marineplanner-core/apps/landmapper/deploy/rc.local.template /etc/rc.local`
7. `sudo touch /var/logs/nginx/landmapper.access.log`
8. `sudo touch /var/logs/nginx/landmapper.error.log`
9. `sudo chmod 640 /var/logs/nginx/*`
10. `sudo chown www-data:adm /var/logs/nginx/*`
11. Reboot your system.

