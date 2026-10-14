# Data Sources

Source files in this folder describe or hold raw Vancouver data.

Expected sources:

- `osm_vancouver.json`: manifest for OSM extract and road/park/water/POI layers.
- `overture_buildings.parquet`: real Overture building data.
- `overture_buildings.parquet.manifest.json`: schema and ingestion contract for the Parquet file.
- `vancouver_public_trees.geojson`: public tree layer schema/sample container.
- `vancouver_lidar_index.json`: LiDAR tile index and classification contract.

The normalizer should merge OSM, Overture, Vancouver Open Data, LiDAR, and tree data into chunked raw tiles under `../tiles/raw`.
