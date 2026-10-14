import type { CaptureEvidence } from '../engine/types';

export interface CauldronDexProps {
  evidence: CaptureEvidence[];
}

export function CauldronDex(props: CauldronDexProps) {
  const grouped = props.evidence.reduce<Record<string, CaptureEvidence[]>>((acc, item) => {
    acc[item.subject] ||= [];
    acc[item.subject].push(item);
    return acc;
  }, {});

  return (
    <section data-cauldron-view="cauldron-dex">
      <header>
        <h1>Cauldron Dex</h1>
        <p>Verified fragments of Vancouver ecology and city objects.</p>
      </header>
      {Object.entries(grouped).map(([subject, items]) => (
        <article key={subject}>
          <h2>{subject}</h2>
          <ul>
            {items.map((item) => (
              <li key={`${item.timestamp}:${item.lat}:${item.lng}`}>
                <strong>{item.detected_object || 'unknown'}</strong>
                <span>{item.verification_level}</span>
                <small>{item.user_note}</small>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
