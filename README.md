# Land Mapper

Simple Woodland Discovery

## Installation
### Via Vagrant
#### Vanilla Bootstrap:
The following two gray boxes represent the OS-specific steps to performing the following tasks. Please copy and paste from the appropriate box.
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
./configure_project.sh landmapper landmapper
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

###### SSH into VM and activate virtual environment
You will need to activate your virtual environment every time you log in:
```bash
vagrant ssh
cd /usr/local/apps/marineplanner-core/
source env/bin/activate
```
If performed correctly, you will see `(env)` before your prompt

###### Load base data into DB
* Be sure you have logged into your VM and activated your virtual environment
```bash
cd /usr/local/apps/marineplanner-core/marineplanner
python manage.py loaddata ../apps/landmapper/fixtures/data_manager_data.json
python manage.py loaddata ../apps/landmapper/fixtures/page_contents.json
```

###### Load Taxlot data into DB
* This data cannot be included in the repo due to both size and sensitivity of content. You will need to get the correct taxlot layer from Ecotrust or you will need to create your own.
* Be sure you have logged into your VM and activated your virtual environment
* Copy the shapefile onto your VM so that it appears inside the VM as `/usr/local/apps/marineplanner-core/apps/landmapper/data/ORtaxlot_allCounties.shp`
* Note that these files are large - be sure you have a good 8 GB of space ready for this to land
```bash
cd /usr/local/apps/marineplanner-core/apps/landmapper/scripts
./process_taxlot_grid.sh
psql -U postgres -d marineplanner -f /usr/local/apps/marineplanner-core/apps/landmapper/data/OR_TAXLOTS.sql
```

###### Run test server
* Be sure you have logged into your VM and activated your virtual environment
```bash
cd /usr/local/apps/marineplanner-core/marineplanner
python manage.py runserver 0:8000
```
Then go [here](http://localhost:8111/visualize)

Note that you tell your Django dev server to run on port 8000 (on the VM), but point your browser at port 8111. If you want to know why, refer to `Vagrantfile` or read online about port forwarding.


### On Standalone Server (Ubuntu 16.04 LTS)
#### Initial setup and downloading MP Core
1. `sudo apt-get update`
2. `sudo apt-get upgrade`
3. `sudo apt-get install git`
4. `sudo mkdir /usr/local/apps`
5. `sudo chgrp adm /usr/local/apps`
6. `sudo chmod 775 /usr/local/apps`
7. `cd /usr/local/apps`
8. `git clone https://github.com/Ecotrust/marineplanner-core.git`

#### Install PostgreSQL/PostGIS and a few Dependencies
1. `cd /usr/local/apps/marineplanner-core/scripts/`
2. `sudo chmod +x vagrant_provision0.sh`
3. `sudo ./vagrant_provision0.sh xenial 3.5.0 9.5` #Ubuntu xenial, GEOS 3.5.0, PostgreSQL 9.5

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
3. `sudo cp /usr/local/apps/marineplanner-core/apps/landmapper/deploy/landmapper.conf /etc/nginx/sites-available/landmapper`
4. `sudo rm /etc/nginx/sites-enabled/default`
5. `sudo ln -s /etc/nginx/sites-available/landmapper /etc/nginx/sites-enabled/landmapper`
6. `sudo cp /usr/local/apps/marineplanner-core/apps/landmapper/deploy/rc.local.template /etc/rc.local`
7. `sudo touch /var/log/nginx/landmapper.access.log`
8. `sudo touch /var/log/nginx/landmapper.error.log`
9. `sudo chmod 640 /var/log/nginx/*`
10. `sudo chown www-data:adm /var/log/nginx/*`
11. Reboot your system.


---  

[See Wiki For Additional Documentation](https://github.com/Ecotrust/landmapper/wiki)
