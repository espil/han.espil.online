import type { CaptureEvidence, CauldronObject, LngLat } from './types';

export interface TreeRecord {
  id: string;
  species?: string;
  commonName?: string;
  location: LngLat;
  source: 'city_public_trees' | 'canopy' | 'user_capture';
  verification: 'V0' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
  canopyRadiusM?: number;
}

export function treeToCauldronObject(tree: TreeRecord): CauldronObject {
  const conifer = /cedar|fir|thuja|pseudotsuga|conifer/i.test(`${tree.species ?? ''} ${tree.commonName ?? ''}`);
  return {
    id: tree.id,
    type: 'tree',
    lngLat: tree.location,
    terrainClass: conifer ? 'tree_conifer' : 'tree_deciduous',
    collision: true,
    sourceRefs: [{
      id: tree.id,
      provider: tree.source === 'user_capture' ? 'user_capture' : 'city_of_vancouver',
      verification: tree.verification,
    }],
    properties: {
      species: tree.species,
      commonName: tree.commonName,
      canopyRadiusM: tree.canopyRadiusM,
    },
  };
}

export function evidenceToTreeRecord(evidence: CaptureEvidence): TreeRecord | null {
  if (evidence.subject !== 'tree') return null;
  return {
    id: `capture:${evidence.timestamp}:${evidence.lat.toFixed(6)}:${evidence.lng.toFixed(6)}`,
    species: evidence.detected_object,
    commonName: evidence.user_note,
    location: [evidence.lng, evidence.lat],
    source: 'user_capture',
    verification: evidence.verification_level,
  };
}

export function mergeTreeLayers(records: TreeRecord[]): TreeRecord[] {
  const merged = new Map<string, TreeRecord>();
  for (const record of records) {
    const key = `${record.location[0].toFixed(5)}:${record.location[1].toFixed(5)}:${record.species ?? 'unknown'}`;
    const previous = merged.get(key);
    if (!previous || verificationRank(record.verification) > verificationRank(previous.verification)) {
      merged.set(key, record);
    }
  }
  return [...merged.values()];
}

function verificationRank(level: TreeRecord['verification']): number {
  return Number(level.replace('V', '')) || 0;
}
