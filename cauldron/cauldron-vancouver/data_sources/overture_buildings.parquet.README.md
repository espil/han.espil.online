# overture_buildings.parquet

Place the real Overture Maps buildings Parquet extract here.

Do not place a fake `.parquet` file here. The ingestion contract is defined in:

- `overture_buildings.parquet.manifest.json`

The normalizer should read the real Parquet file, clip it to the Vancouver MVP bounds, then emit normalized raw chunks into `../tiles/raw`.
