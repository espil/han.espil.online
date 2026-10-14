import type { CaptureEvidence } from '../engine/types';

export interface MobileCaptureProps {
  onCapture: (evidence: CaptureEvidence) => void;
}

export function MobileCapture(props: MobileCaptureProps) {
  async function captureTreeNote() {
    const position = await readPosition();
    props.onCapture({
      capture_type: 'photo',
      lat: position.lat,
      lng: position.lng,
      heading: position.heading,
      timestamp: new Date().toISOString(),
      subject: 'tree',
      detected_object: 'unknown_tree',
      user_note: 'mobile capture pending AI verification',
      verification_level: 'V1',
      media_uri: 'local://pending-upload',
    });
  }

  return (
    <section data-cauldron-view="mobile-capture">
      <button type="button" onClick={captureTreeNote}>Capture Tree</button>
      <button type="button">Capture Building</button>
      <button type="button">Capture POI</button>
    </section>
  );
}

async function readPosition(): Promise<{ lat: number; lng: number; heading?: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      resolve({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        heading: position.coords.heading ?? undefined,
      });
    }, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000,
    });
  });
}
