FROM python:3.14-slim

# Prevent Python from writing .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1

# from doc:
# sudo apt install python3-pip postgresql postgresql-contrib postgresql-server-dev-14 postgis python3-gdal libgdal-dev redis-server -y
# sudo apt install pdftk

# Install system dependencies 
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       postgresql-client \
       gdal-bin \
       libgdal-dev \
       libgeos-dev \
       pdftk \
       git \
       build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Set working directory
WORKDIR /usr/src/app

# Copy requirements first (cache pip install step when dependencies don't change)
COPY requirements.txt /usr/src/app/

# COPY src/madrona-features     /usr/local/apps/madrona-features
# COPY src/madrona-manipulators /usr/local/apps/madrona-manipulators
# COPY src/p97-nursery          /usr/local/apps/p97-nursery

# Upgrade pip and install Python dependencies
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# After installing gdal-bin and libgdal-dev, install matching version of GDAL Python bindings. This is required for Django to use GDAL.
RUN GDAL_VERSION=`gdal-config --version` && \
    pip install GDAL==$GDAL_VERSION

# Copy the application code
COPY . /usr/src/app

# Copy and make entrypoint executable. The repository contains `docker/entrypoint.sh`
# which runs collectstatic, migrations and launches uWSGI.
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Create directory for PDF reports
RUN rm -f /usr/src/app/app/static/landmapper/report_pdf \
    && mkdir -p /usr/src/app/app/static/landmapper/report_pdf

# Expose the port the app runs on (entrypoint starts django development server or uWSGI on 8000)
EXPOSE 8000

# Default settings module (can be overridden at runtime)
ENV DJANGO_SETTINGS_MODULE=landmapper.settings

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]