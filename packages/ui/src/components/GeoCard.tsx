type Props = {
  city: string;
  activeCampaigns: number;
  avgCma: number;
  dominantFunnel: string;
  worstSeverity: 'ok' | 'warning' | 'critical';
};

const BENCHMARKS: Record<string, number> = {
  SELL: 2200,
  BUY: 3700,
  FINANCE: 1900,
  SERVICES: 3100,
};

const SEVERITY_COLORS = {
  ok: '#27ae60',
  warning: '#f39c12',
  critical: '#e74c3c',
};

const SEVERITY_BG = {
  ok: '#d5f4e6',
  warning: '#fef5e7',
  critical: '#fadbd8',
};

function getPerformanceLabel(actual: number, benchmark: number): { text: string; bgColor: string; textColor: string } {
  if (actual >= benchmark * 1.1) {
    return { text: 'Excellent', bgColor: '#d1fae5', textColor: '#065f46' };
  }
  if (actual >= benchmark * 0.95) {
    return { text: 'On Target', bgColor: '#f0fdf4', textColor: '#166534' };
  }
  return { text: 'Needs Review', bgColor: '#fefce8', textColor: '#b45309' };
}

export function GeoCard({ city, activeCampaigns, avgCma, dominantFunnel, worstSeverity }: Props) {
  const benchmark = BENCHMARKS[dominantFunnel] || BENCHMARKS.SELL;
  const cmaPerformance = getPerformanceLabel(avgCma, benchmark);
  return (
    <div
      style={{
        padding: '18px',
        border: `1px solid ${SEVERITY_COLORS[worstSeverity]}30`,
        borderRadius: '12px',
        background: '#ffffff',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = SEVERITY_BG[worstSeverity];
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        el.style.borderColor = `${SEVERITY_COLORS[worstSeverity]}50`;
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#ffffff';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        el.style.borderColor = `${SEVERITY_COLORS[worstSeverity]}30`;
        el.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', lineHeight: 1.3 }}>{city}</div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', fontWeight: 500 }}>
            {activeCampaigns} {activeCampaigns === 1 ? 'campaign' : 'campaigns'}
          </div>
        </div>
        <div
          style={{
            padding: '4px 8px',
            background: cmaPerformance.bgColor,
            color: cmaPerformance.textColor,
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={cmaPerformance.text}
        >
          {cmaPerformance.text}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: `1px solid ${SEVERITY_COLORS[worstSeverity]}15` }}>
        <div>
          <div style={{ color: '#666', fontSize: '11px', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>CMA Avg</div>
          <div style={{ color: SEVERITY_COLORS[worstSeverity], fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '13px' }}>
            ₹{Math.round(avgCma).toLocaleString('en-IN')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#666', fontSize: '11px', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Dominant</div>
          <div style={{ color: '#ff6b35', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '13px' }}>
            {dominantFunnel}
          </div>
        </div>
      </div>
    </div>
  );
}
