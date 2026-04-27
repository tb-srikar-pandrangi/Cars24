/**
 * FunnelCard — displays live summary metrics for one CARS24 funnel.
 * Subscribes to bus events via the EventFeed parent; receives metrics as props once wired.
 * O(1) render — fixed metric list, no iteration over variable-length data at this level.
 */
'use client';

import type { Funnel } from '@cars24/shared';

const FUNNEL_COLORS: Record<Funnel, string> = {
  SELL: '#ff6b00',
  BUY: '#00b4d8',
  FINANCE: '#06d6a0',
  SERVICES: '#f7b731',
};

type Props = {
  funnel: Funnel;
  cma?: number;
  cpl?: number;
  roas?: number;
  severity?: 'critical' | 'warning' | 'ok';
};

export function FunnelCard({ funnel, cma, cpl, roas, severity = 'ok' }: Props) {
  const accent = FUNNEL_COLORS[funnel];

  const severityDot: Record<typeof severity, string> = {
    critical: '#ff3333',
    warning: '#f7b731',
    ok: '#06d6a0',
  };

  return (
    <div
      style={{
        border: `1px solid ${accent}44`,
        borderTop: `2px solid ${accent}`,
        borderRadius: '6px',
        padding: '1rem',
        background: '#111',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '0.85rem', color: accent, letterSpacing: '0.08em' }}>
          {funnel}
        </h2>
        <span
          title={severity}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: severityDot[severity],
            display: 'inline-block',
          }}
        />
      </div>

      <dl
        style={{
          margin: '0.75rem 0 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.25rem 0.5rem',
          fontSize: '0.7rem',
        }}
      >
        <dt style={{ color: '#666' }}>CMA</dt>
        <dd style={{ margin: 0, color: '#e5e5e5' }}>
          {cma !== undefined ? `₹${cma.toLocaleString('en-IN')}` : '—'}
        </dd>

        <dt style={{ color: '#666' }}>CPL</dt>
        <dd style={{ margin: 0, color: '#e5e5e5' }}>
          {cpl !== undefined ? `₹${cpl.toLocaleString('en-IN')}` : '—'}
        </dd>

        <dt style={{ color: '#666' }}>ROAS</dt>
        <dd style={{ margin: 0, color: '#e5e5e5' }}>
          {roas !== undefined ? `${roas.toFixed(2)}x` : '—'}
        </dd>
      </dl>
    </div>
  );
}
