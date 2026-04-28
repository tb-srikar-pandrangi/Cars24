import { CampaignCard } from './CampaignCard';

type Campaign = {
  campaignId: string;
  campaignName: string;
  geo: string;
  spend: number;
  cpl: number;
  cma: number;
  severity: 'ok' | 'warning' | 'critical';
};

type Props = {
  funnel: string;
  currentCma: number;
  cmaColor: string;
  campaigns: Campaign[];
  onCampaignClick: (campaignId: string) => void;
};

const FUNNEL_COLORS: Record<string, { bg: string; light: string }> = {
  SELL: { bg: '#fff3e0', light: '#ffe8cc' },
  BUY: { bg: '#e0f7ff', light: '#cceeff' },
  FINANCE: { bg: '#d5f4e6', light: '#c0ead8' },
  SERVICES: { bg: '#f5e6ff', light: '#e8d4ff' },
};

export function FunnelColumn({ funnel, currentCma, cmaColor, campaigns, onCampaignClick }: Props) {
  const colors = FUNNEL_COLORS[funnel] || FUNNEL_COLORS.SELL;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '100%' }}>
      <div
        style={{
          padding: '16px',
          background: colors.bg,
          borderRadius: '12px',
          borderLeft: `4px solid ${cmaColor}`,
          border: `1px solid ${cmaColor}30`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {funnel}
        </div>
        <div style={{ fontSize: '16px', fontWeight: 700, color: cmaColor, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.3 }}>
          ₹{Math.round(currentCma).toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize: '11px', color: '#666', marginTop: '6px', fontWeight: 500 }}>avg CMA</div>
        <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>Contribution Margin per Acquisition</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {campaigns.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '12px', background: '#f9f9fb', borderRadius: '10px', border: '1px solid #e5e5e7' }}>
            No campaigns
          </div>
        ) : (
          campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.campaignId}
              {...campaign}
              onClick={() => onCampaignClick(campaign.campaignId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
