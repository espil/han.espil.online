import type { CaptureEvidence } from './types';

export interface VerificationResult {
  level: CaptureEvidence['verification_level'];
  accepted: boolean;
  reasons: string[];
}

export function evaluateEvidence(evidence: CaptureEvidence, communityConfirmations = 0, officialMatch = false): VerificationResult {
  const reasons: string[] = [];
  let level: CaptureEvidence['verification_level'] = 'V0';

  if (evidence.user_note || evidence.media_uri) {
    reasons.push('V0 record exists');
  }

  if (Number.isFinite(evidence.lat) && Number.isFinite(evidence.lng) && evidence.timestamp && evidence.media_uri) {
    level = 'V1';
    reasons.push('V1 GPS + timestamp + media exists');
  }

  if (level === 'V1' && evidence.detected_object) {
    level = 'V2';
    reasons.push('V2 detected object exists');
  }

  if (communityConfirmations >= 2) {
    level = 'V3';
    reasons.push('V3 confirmed by two or more users');
  }

  if (officialMatch) {
    level = 'V4';
    reasons.push('V4 official/admin match');
  }

  return {
    level,
    accepted: level !== 'V0',
    reasons,
  };
}

export function promoteToCanonical(result: VerificationResult, acceptedIntoTileCache: boolean): VerificationResult {
  if (result.level === 'V4' && acceptedIntoTileCache) {
    return {
      level: 'V5',
      accepted: true,
      reasons: [...result.reasons, 'V5 accepted into Cauldron canonical tile cache'],
    };
  }
  return result;
}
