/**
 * FunnelColumn — one column in the funnel health grid.
 * Displays funnel name, current CMA, and campaign cards for that funnel.
 */

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

export function FunnelColumn({ funnel, currentCma, cmaColor, campaigns, onCampaignClick }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '100%' }}>
      <div style={{ padding: '12px', background: '#141416', borderRadius: '4px', borderLeft: `3px solid ${cmaColor}` }}>
        <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>{funnel}</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: cmaColor, fontFamily: "'IBM Plex Mono', monospace" }}>
          ₹{Math.round(currentCma).toLocaleString('en-IN')}
        </div>
        <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>avg CMA</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {campaigns.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '11px' }}>
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
