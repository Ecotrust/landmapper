#!/bin/bash

# Array of directories containing ephemeral/volatile files
EPHEMERAL_DIRECTORIES=("/usr/local/apps/forestplanner/lot/landmapper/static/landmapper/report_pdf")
# Age at which they are available for deletion
DAYS_OLD=7

# for each folder containing volatile/ephemeral data...
# for folder in ${EPHEMERAL_DIRECTORIES[@]}; do
#   # get every file in the folder older than $DAYS_OLD days
#   readarray -d '' ephemeral_files < <(/usr/bin/find $folder -name "*.*" -mtime +$DAYS_OLD -print0)
#   # for every file in the folder...
#   for ephemeral_file in "${ephemeral_files[@]}"; do
#       # delete old file
#       /bin/rm "${ephemeral_file[@]}"
#   done

# done

/usr/bin/find /usr/local/apps/pdf/ -type f ! -newerat $(/usr/bin/date -d "-1 month" +%Y-%m-%d) | /usr/bin/xargs -d '\n' /usr/bin/rm -rf
/usr/bin/find /usr/local/apps/landmapper/backups/ -type f ! -newerat $(/usr/bin/date -d "-10 day" +%Y-%m-%d) | grep "_userpropertyfixture.json" | /usr/bin/xargs -d '\n' /usr/bin/rm -rf
/usr/bin/find /usr/local/apps/landmapper/backups/ -type f ! -newerat $(/usr/bin/date -d "-10 day" +%Y-%m-%d) | grep "_userprofilefixture.json" | /usr/bin/xargs -d '\n' /usr/bin/rm -rf