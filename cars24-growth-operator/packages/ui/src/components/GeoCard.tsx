/**
 * GeoCard — city card for the geo heat map view.
 * Displays city name, active campaigns, avg CMA, and dominant funnel with severity border.
 */

import { SeverityBadge } from './SeverityBadge';

type Props = {
  city: string;
  activeCampaigns: number;
  avgCma: number;
  dominantFunnel: string;
  worstSeverity: 'ok' | 'warning' | 'critical';
};

const SEVERITY_COLORS = {
  ok: '#2dc653',
  warning: '#ff9f1c',
  critical: '#e63946',
};

export function GeoCard({ city, activeCampaigns, avgCma, dominantFunnel, worstSeverity }: Props) {
  return (
    <div
      style={{
        padding: '12px',
        border: `2px solid ${SEVERITY_COLORS[worstSeverity]}40`,
        borderLeft: `3px solid ${SEVERITY_COLORS[worstSeverity]}`,
        borderRadius: '4px',
        background: '#141416',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#1a1a1d';
        el.style.borderColor = `${SEVERITY_COLORS[worstSeverity]}60`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#141416';
        el.style.borderColor = `${SEVERITY_COLORS[worstSeverity]}40`;
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f0f0f0' }}>{city}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{activeCampaigns} active</div>
        </div>
        <SeverityBadge severity={worstSeverity} compact />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
        <div>
          <div style={{ color: '#888' }}>CMA avg</div>
          <div style={{ color: '#f5a623', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, marginTop: '2px' }}>
            ₹{Math.round(avgCma).toLocaleString('en-IN')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#888' }}>Dominant</div>
          <div style={{ color: '#17a2b8', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, marginTop: '2px' }}>
            {dominantFunnel}
          </div>
        </div>
      </div>
    </div>
  );
}
