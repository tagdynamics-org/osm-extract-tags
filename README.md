[![Build Status](https://travis-ci.org/tagdynamics-org/osm-extract-tags.svg?branch=master)](https://travis-ci.org/tagdynamics-org/osm-extract-tags)

# osm-tag-extract

`osm-tag-extract` is a utility to extract selected tag metadata from an OpenStreetMap (OSM) history data extract. The output data is written to a JSONL file (see below).

 - Relies heavily on [node-osmium](https://github.com/osmcode/node-osmium) for reading and parsing OSM input files. For a list of supported input formats, see the node-osmium [documentation](https://github.com/osmcode/node-osmium/blob/master/doc/tutorial.md).
 - Files are processed by streaming, and the entire input file is never loaded into memory at the same time. For example, even if the entire OpenStreetMap dump with historical revisions is large (~65GB as of 7/2018), this can be processed on a low-end cloud instance w. only 4GB of memory in ~30 hours. See below for further details on this.
 - `osm-tag-extract` can also be used to extract tag metadata from latest snapshots (data exports without historical revisions).
 - Requires Node.JS version 8.

## Output format

One line is written to the output JSONL file for each map element that at some point has been tagged with any of the tags selected for extraction. Below is an example output line (pretty formatted for easy reading):

```
[
  "N40",[
    [1276372410, 1, 1, ["1:v2"]],
    [1277305733, 4, 0, []],
    [1277305733, 5, 1, []],
    [1279547722, 9, 1, ["0:v2", "1:v2", "2:v3"]]
  ]
]
```

  - `N40` indicates that this is the history for node 40. Similarly, `W40` and `R40` would refer to way 40 or relation 40.
  - The second component is an array that list changes in: 1) the selected tags and/or 2) changes in the visible status.
  - For example, for `[1276372410, 1, 1, ["1:v2"]]`,
    - the first component 1276372410 is the unix epoch timestamp (in seconds) for this version.
    - the second component 1 is the version number.
    - the third component 1 indicates visible status (0=not visible/deleted, 1=visible). 
    - the last array lists values for the selected tags. Eg. if the list of selected tags are `["amenity", "shop", "man_made"]`, then `1:v2` indicates that `shop` is set to `v2`. The indices are hexadecimal, so `a:v2` would refer to the 11th tag.

## Short summary of OpenStreetMap data format

The raw data for [OpenStreetMap](https://openstreetmap.org) is a database containing three types of map elements: nodes, ways, and relations, see the [OSM Wiki](https://wiki.openstreetmap.org/wiki/Elements):

- A **node** (or a point) describes a (latitude, longitude)-point on the map. This can eg. be used for a lampost.

- A **way** is a list of nodes forming a line or a closed polygon (area). Used eg. to model a road or a building outline.

- A **relation** describes a relationship between objects (nodes, ways, relations). A relation can eg. be used to describe that turning from one road to another is not possible.

To view the history for a map element, one can open `https://www.openstreetmap.org/[node|way|relation]/<number>/history`, and click "Download XML". (For testing, most random numbers, say, below 10000 seem to work). The meaning of map objects are described using key-value **tags**. For example, the tags `{"amenity": "bench", "backrest": "yes"}` indicate that a map element is a park bench.

Map elements are **versioned** and **timestamped**. So editing an object creates a new version of the object with updated data. Similarly, objects are **deleted** by creating a new version with a visible flag set to false. Thus, any changes or deletes can be reverted.

## OpenStreetMap data exports

Various data exports are available of the OSM data:

- the latest data (with no edit histories): [updated daily](https://wiki.openstreetmap.org/wiki/Planet.osm) (~40GB as of 7/2018).
- the full history [updated weekly](https://planet.openstreetmap.org/planet/full-history/), (~65GB as of 7/2018).

For fast processing, one should use the pbf input files (protobuf based).

## Running

The tests rely on synthetic test data which (due to its somewhat large size) is stored in a separate [testdata](https://github.com/tagdynamics-org/testdata) [git submodule](https://git-scm.com/book/en/v2/Git-Tools-Submodules). Clone the repo with `--recurse-submodules` to also fetch test data.

```bash
  git clone --recurse-submodules git@github.com:tagdynamics-org/osm-extract-tags.git
```

Fetching the test data is not needed to just run `osm-tag-extract`.

### Run unit tests

```
  npm install
  npm run test
  npm run test:watch
```

### Extract tags from an OSM file

```bash
  npm install
  npm run tag-extract --tags=tags,to,extract --input-file=<input osm file> --output-file=<output.jsonl>
```

Suitable tags to extract could be:

```bash
  export TAGS=amenity,barrier,building,highway,landuse,leisure,man_made,natural,railway,shop,sport,surface,tourism
```

The below numbers and runtimes are based on these tags.

Note: 
 - colons (or commas) are not allowed in the selected tags, see Output format above.
 - See the [taginfo](https://taginfo.openstreetmap.org/) website to explore tags and more details about tags. 

### Run on the full OSM history

Extracting data from large OSM extracts have long run times and require lots of temporary space. For this purpose cloud instances may be used. 

The below instructions describe how this can be done on AWS using: 

 - 64 bit Ubuntu Server 14.04 (Trusty) LTS.
 - AWS t2.medium (2vCPU, 4G memory). Pricing: [current gen](https://aws.amazon.com/ec2/pricing/on-demand/), [past generations](https://aws.amazon.com/ec2/previous-generation/)
 - 175G of "General purpose SSD" (TODO: check how much is really needed)

```bash
# log into instance and install dependencies
sudo apt-get -y update && sudo apt-get -y upgrade
sudo apt-get -y install git zip mg tmux
git clone --recurse-submodules https://github.com/tagdynamics-org/osm-extract-tags.git

# Install docker as described here 
#  https://docs.docker.com/install/linux/docker-ce/ubuntu/#set-up-the-repository
sudo apt-get install apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt-get update && sudo apt-get -y install docker-ce

# start shell in node8 container
tmux
sudo docker pull node:8.11.3
sudo docker run -v `pwd`/data/:/data -v `pwd`/osm-extract-tags:/code -it --rm node:8.11.3 /bin/bash

# run inside docker (as a script)
set -eux 
mkdir -p /data/osm-input                # files downloaded directly from OSM
mkdir -p /data/tag-metadata   # everything we compute

# The below takes ~30 minutes (35.1MB/s), size: ~67G.
date -I > /data/osm-input/download-date
wget -O /data/osm-input/history.osm.pbf   https://planet.openstreetmap.org/pbf/full-history/history-latest.osm.pbf
wget -O /data/osm-input/history.osm.pbf.md5 https://planet.openstreetmap.org/pbf/full-history/history-latest.osm.pbf.md5
# TODO: check that checksum is correct

cd /code
npm install
npm run test

# select tags to extract (set eg. $TAGS as above)
# The below step will take ~33.5 hours. Output JSONL size: ~29G
export TAGS=<see above>
time npm run tag-extract --tags=$TAGS --input-file=/data/osm-input/history.osm.pbf --output-file=/data/tag-metadata/tag-history.jsonl
  
## Packaging and uploading data to s3
set -eux

# Before running set output bucket name
#
# export S3_OUTPUT_BUCKET_NAME=
#

# See
# https://stackoverflow.com/questions/23929235/multi-line-string-with-extra-space-preserved-indentation
LICENSE_NOTICE=`cat << END
The data files in this zip-file are extracted from the full
OpenStreetMap data export that include all edit histories.

This data is (c) OpenStreetMap contributors and distributed
under the Open Database License (ODbL), see:

    https://www.openstreetmap.org/copyright

The download date and md5 checksum of the original .osm.pb
data export are included in this zip file. These can be used to
determine the exact data dump that was used.

For further details on how the data was extracted and
processed, please see the source repositories
  
  - https://github.com/tagdynamics-org/osm-extract-tags
  - https://github.com/tagdynamics-org/osm-tag-aggregator

matias.dahl@iki.fi
END
`

# ubuntu should have access to data directory (created by root running docker)
sudo chgrp -R ubuntu data
sudo chown -R ubuntu data

echo "$LICENSE_NOTICE" > ./data/OSM_LICENSE.txt

export DATA_DIR=./data/
export DOWNLOAD_DATE=`cat data/osm-input/download-date`

zip osm-transitions-${DOWNLOAD_DATE}.zip \
    $DATA_DIR/OSM_LICENSE.txt \
    $DATA_DIR/osm-input/download-date \
    $DATA_DIR/osm-input/history.osm.pbf.md5 \
    $DATA_DIR./tag-metadata/tag-history.jsonl

# TODO: install s3cmd v1.5+ to support AWS IAM roles. Ensure instance has a role attached with s3 access
s3cmd put osm-transitions-${DOWNLOAD_DATE}.zip s3://$S3_OUTPUT_BUCKET_NAME/  
```

## Contributions

Ideas, questions or contributions are welcome.

## License

Copyright 2018 Matias Dahl. Released under the [MIT](LICENSE.md) license.

Please note that `osm-tag-extract` is designed to process OpenStreetMap data. This data is available under the [Open Database License](https://openstreetmap.org/copyright). See also the [OSMF wiki](https://wiki.openstreetmap.org/wiki/GDPR) regarding OpenStreetMap data and the [GDPR](https://gdpr-info.eu/).

