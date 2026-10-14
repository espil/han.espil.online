import type { ClassifiedTile, PixelizedTile } from '../engine/types';

export interface VancouverMapViewProps {
  mapStyleUrl: string;
  classifiedTiles: ClassifiedTile[];
  pixelizedTiles: PixelizedTile[];
  onTileNeeded?: (tileId: string) => void;
}

export function VancouverMapView(props: VancouverMapViewProps) {
  return (
    <section data-cauldron-view="vancouver-map">
      <div data-maplibre-style={props.mapStyleUrl} />
      <canvas data-layer="pixel-terrain-overlay" />
      <div data-layer="gameplay-objects">
        {props.classifiedTiles.flatMap((tile) => tile.objects).map((object) => (
          <button
            key={object.id}
            type="button"
            data-object-id={object.id}
            data-object-type={object.type}
            data-terrain-class={object.terrainClass}
          >
            {object.properties.name as string || object.type}
          </button>
        ))}
      </div>
    </section>
  );
}
