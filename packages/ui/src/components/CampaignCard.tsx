/**
 * CampaignCard — compact campaign row in the funnel grid.
 * Displays key metrics and severity badge; clickable to open drawer.
 */

import { SeverityBadge } from './SeverityBadge';

type Props = {
  campaignId: string;
  campaignName: string;
  geo: string;
  spend: number;
  cpl: number;
  cma: number;
  severity: 'ok' | 'warning' | 'critical';
  onClick: () => void;
};

export function CampaignCard({ campaignName, geo, spend, cpl, cma, severity, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 60px 70px 70px 70px 60px',
        gap: '8px',
        alignItems: 'center',
        padding: '8px 10px',
        background: '#1a1a1d',
        border: '1px solid #2a2a2d',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#202023';
        el.style.borderColor = '#f5a62340';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#1a1a1d';
        el.style.borderColor = '#2a2a2d';
      }}
    >
      <div>
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#f0f0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {campaignName}
        </div>
        <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{geo}</div>
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        <div>Spend</div>
        <div style={{ color: '#f0f0f0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>
          ₹{Math.round(spend / 1000)}k
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        <div>CPL</div>
        <div style={{ color: '#f0f0f0', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>
          ₹{Math.round(cpl)}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        <div>CMA</div>
        <div style={{ color: '#f5a623', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>
          ₹{Math.round(cma)}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#888' }}>
        <div>ROAS</div>
        <div style={{ color: '#17a2b8', fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px' }}>
          2.1x
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <SeverityBadge severity={severity} compact />
      </div>
    </div>
  );
}
