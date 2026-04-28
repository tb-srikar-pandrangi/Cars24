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

const BENCHMARKS: Record<string, { cpl: number; cma: number }> = {
  SELL: { cpl: 1000, cma: 2200 },
  BUY: { cpl: 1800, cma: 3700 },
  FINANCE: { cpl: 700, cma: 1900 },
  SERVICES: { cpl: 1200, cma: 3100 },
};

function parseCampaignName(name: string) {
  const parts = name.split('_');
  if (parts.length === 4) {
    return { funnel: parts[0], geo: parts[1], channel: parts[2], type: parts[3] };
  }
  return null;
}

function getDelta(actual: number, benchmark: number, metricType: 'cost' | 'margin'): { text: string; color: string } {
  const pct = Math.round(((actual - benchmark) / benchmark) * 100);
  const isGood = metricType === 'cost' ? actual < benchmark : actual > benchmark;

  if (Math.abs(pct) <= 5) {
    return { text: '≈ On target', color: '#999' };
  }

  if (isGood) {
    return { text: `▼ ${Math.abs(pct)}%`, color: '#27ae60' };
  } else {
    return { text: `▲ +${Math.abs(pct)}%`, color: '#e74c3c' };
  }
}

function getPerformanceLabel(actual: number, benchmark: number, metricType: 'cost' | 'margin'): { text: string; bgColor: string; textColor: string } {
  const pct = Math.round(((actual - benchmark) / benchmark) * 100);
  const isGood = metricType === 'cost' ? actual < benchmark : actual > benchmark;

  if (metricType === 'margin') {
    if (actual >= benchmark * 1.1) {
      return { text: 'Excellent', bgColor: '#d1fae5', textColor: '#065f46' };
    }
    if (actual >= benchmark * 0.95) {
      return { text: 'On Target', bgColor: '#f0fdf4', textColor: '#166534' };
    }
    return { text: 'Needs Review', bgColor: '#fefce8', textColor: '#b45309' };
  } else {
    if (actual <= benchmark * 0.9) {
      return { text: 'Excellent', bgColor: '#d1fae5', textColor: '#065f46' };
    }
    if (actual <= benchmark * 1.05) {
      return { text: 'On Target', bgColor: '#f0fdf4', textColor: '#166534' };
    }
    return { text: 'Needs Review', bgColor: '#fefce8', textColor: '#b45309' };
  }
}

export function CampaignCard({ campaignName, geo, spend, cpl, cma, severity, onClick }: Props) {
  const parsed = parseCampaignName(campaignName);
  const funnel = parsed?.funnel || 'SELL';
  const benchmark = BENCHMARKS[funnel] || BENCHMARKS.SELL;

  const cplDelta = getDelta(cpl, benchmark.cpl, 'cost');
  const cmaDelta = getDelta(cma, benchmark.cma, 'margin');
  const cmaPerformance = getPerformanceLabel(cma, benchmark.cma, 'margin');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 70px 70px 70px 80px',
        gap: '12px',
        alignItems: 'center',
        padding: '14px 16px',
        background: '#ffffff',
        border: '1px solid #e5e5e7',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#f9f9fb';
        el.style.borderColor = '#ff6b3530';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.background = '#ffffff';
        el.style.borderColor = '#e5e5e7';
        el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        el.style.transform = 'translateY(0)';
      }}
    >
      <div>
        {parsed ? (
          <>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#000000', marginBottom: '4px' }}>
              {parsed.funnel} · {parsed.geo} · {parsed.channel}
            </div>
            <div style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}>{parsed.type}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#000000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
              {campaignName}
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '3px', fontWeight: 400 }}>{geo}</div>
          </>
        )}
      </div>
      <div style={{ fontSize: '11px', color: '#666' }}>
        <div style={{ fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Spend</div>
        <div style={{ color: '#1d1d1f', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600 }}>
          ₹{Math.round(spend / 1000)}k
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#666' }}>
        <div style={{ fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>CPL</div>
        <div style={{ color: '#1d1d1f', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600 }}>
          ₹{Math.round(cpl)}
        </div>
        <div style={{ fontSize: '10px', color: cplDelta.color, fontWeight: 500, marginTop: '2px' }}>
          Benchmark: ₹{benchmark.cpl}
        </div>
      </div>
      <div style={{ fontSize: '11px', color: '#666' }}>
        <div style={{ fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>CMA</div>
        <div style={{ color: '#ff6b35', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600 }}>
          ₹{Math.round(cma)}
        </div>
        <div style={{ fontSize: '10px', color: cmaDelta.color, fontWeight: 500, marginTop: '2px' }}>
          Benchmark: ₹{benchmark.cma}
        </div>
      </div>
      <div style={{ textAlign: 'center', minWidth: 0 }}>
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
    </div>
  );
}
