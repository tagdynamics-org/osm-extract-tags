## osm-tag-extract

`osm-tag-extract` is a utility built around [node-osmium](https://github.com/osmcode/node-osmium) for extracting selected tags from OpenStreetMap (OSM) history dumps. The output data is written to an JSONL file (one line per map element containing data for all revisions for that map element).

 - The entire input file never needs to be loaded into memory. For example, even if the entire OpenStreetMap dump with historical revisions is ~66G (as of 7/2018), this can be processed by streaming on a low-end machine w. only 4G of memory in ~30 hours.
 - Can read input OSM files in various formats, see node-osmium for details. `osm-streamer` can also be used on snapshots without historical revisions.
 - With some modifications, it could also be used to extract other data.
 - Requires Node.JS v. 8.

## Output format

Each map element that at some point in its history has had at least one of the selected tags outputs a line to the JSON file with the below format (pretty formatted for easier reading):

```
[
  "N40",[
    [1276372410, 1, 1, ["1:v2"]],
    [1277305733, 4, 0, []],
    [1277305733, 5, 0, []],
    [1279547722, 9, 1, ["0:v2", "1:v2", "2:v3"]]
  ]
]
```

  - `N235` indicates that this is the history for node 40. Similarly, `W40` and `R40` would refer to way 40 or relation 40.
  - The second component is an array that show tag changes in: 1) the selected tags and 2) changes in the visible status.
  - For example, for `[1276372410, 1, 1, ["1:v2"]]`,
    - the first component 1276372410 is the unix epoch timestamp (in seconds). 
    - the second component 1 is the version number.
    - the third component 1 indicates visible status (0=not visible/deleted, 1=visible). 
    - the last array lists which of the selected tags are set. Eg. if the list of selected tags are `["amenity", "shop", "man_made"]`, then `1:v2` indicates that `shop` is set to `v2`.

## Short summary of OpenStreetMap data format

The raw data for [OpenStreetMap](https://openstreetmap.org) is a database containing three types of map elements: nodes, ways, and relations:

- A **node** (or a point) describes a (latitude, longitude)-point on the map. This can eg. be used for a lampost.

- A **way** is a list of nodes forming a line or a closed polygon (area). Used eg. to model a road or a building outline.

- A **relation** describes a relationship between objects (nodes, ways, relations). A relation can eg. be used to describe that turning from one road to another is not possible.

See [OSM Wiki](https://wiki.openstreetmap.org/wiki/Elements).

To view the history for a map element, one can open `https://www.openstreetmap.org/[node|way|relation]/<number>/history`, and click "Download XML". (For nodes, most random numbers, say, <1e6 seem to work). The meaning of map objects are described using key-value **tags**. For example, the tags `{"amenity": "bench", "backrest": "yes"}` indicate that a map element is a park bench.

Map elements are **versioned** and **timestamped**. So editing an object creates a new version of the object with updated data. Similarly, objects are **deleted** by creating a new version with a visible flag set to false. Thus, any changes or deletes can be reverted.

## OpenStreetMap data dumps

Various snapshots are available of the full OSM data:

- the latest data (with no edit histories): [updated daily](https://wiki.openstreetmap.org/wiki/Planet.osm), ~40GB (as of 7/2018).
- the full history [updated weekly](https://planet.openstreetmap.org/planet/full-history/), ~65GB (as of 7/2018).

For fast processing, one should use the pbf input files (protobuf based).

## Running

### Run unit tests

```bash
  npm run test
  npm run test:watch
```

### Extract tags from an OSM file

```bash
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

### Run on the full OSM history dump

Dumping OSM data typically have long run times and require lots of temporary space. For this purpose cloud instances may be used. 

The below instructions are written for computing on AWS using: 

 - 64 bit Ubuntu Server 14.04 (Trusty) LTS.
 - AWS t2.medium (2vCPU, 4G memory). Pricing: [current gen](https://aws.amazon.com/ec2/pricing/on-demand/) [past generations](https://aws.amazon.com/ec2/previous-generation/)
 - 175G of "General purpose SSD" (TODO: check how much is really needed)

```bash
  # log into instance and install dependencies
  sudo apt-get -y update && sudo apt-get -y upgrade
  sudo apt-get -y install git zip mg tmux
  git clone ...

  # Install docker as described here 
  #  https://docs.docker.com/install/linux/docker-ce/ubuntu/#set-up-the-repository
  sudo apt-get install apt-transport-https ca-certificates curl software-properties-common
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
  sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
  sudo apt-get update && sudo apt-get -y install docker-ce

  # start shell in node8 container
  sudo docker pull node:8.11.3
  sudo docker run -v `pwd`/data/:/data -v `pwd`/osm-streamer:/code -it --rm node:8.11.3 /bin/bash

  # run inside docker
  mkdir -p /data/osm-input      # files downloaded directly from OSM
  mkdir -p /data/out            # everything we compute

  # The below takes ~30 minutes (35.1MB/s).
  # Size: ~67G, or (70G, G=1e12))
  wget -O /data/osm-input/history.osm.pbf   https://planet.openstreetmap.org/pbf/full-history/history-latest.osm.pbf
  wget -O /data/osm-input/history.osm.pbf.md5 https://planet.openstreetmap.org/pbf/full-history/history-latest.osm.pbf.md5

  cd /code
  npm install
  npm run test
  # set $TAGS (see above)
  # The below step will take ~31 hours. Output size: ~56G or (59G, G=1e12)
  time npm run tag-extract --tags=$TAGS --input-file=/data/osm-input/history.osm.pbf --output-file=/data/out/tag-history.jsonl
```

## Contributions

Ideas, questions or contributions are welcome.

## License

Copyright 2018 Matias Dahl.

This utility is designed to process OpenStreetMap data. This data is available under the [Open Database License](https://openstreetmap.org/copyright). See also the [OSMF wiki](https://wiki.openstreetmap.org/wiki/GDPR) regarding OpenStreetMap data and the [GDPR](https://gdpr-info.eu/).
