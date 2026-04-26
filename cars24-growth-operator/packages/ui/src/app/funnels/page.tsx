'use client';

/**
 * Funnel Health Grid view — 4-column layout per funnel.
 * Fetches status from /api/status, displays campaigns with inline drawer.
 */

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FunnelColumn } from '@/components/FunnelColumn';
import { CampaignDrawer } from '@/components/CampaignDrawer';
import type { Funnel } from '@cars24/shared';

const FUNNEL_COLORS: Record<Funnel, string> = {
  SELL: '#f5a623',
  BUY: '#17a2b8',
  FINANCE: '#2dc653',
  SERVICES: '#ff6b00',
};

type Campaign = {
  campaignId: string;
  campaignName: string;
  geo: string;
  spend: number;
  cpl: number;
  cma: number;
  severity: 'ok' | 'warning' | 'critical';
  appointments?: number;
  inspections?: number;
  transactions?: number;
  issues?: Array<{ stage: string; dropoffRate: number; severity: string; description: string }>;
  actions?: Array<{ action: string; estimatedCmaImpact: number; reason: string }>;
};

type StatusData = {
  diagnosis: Array<{ campaignId: string; funnel: string; geo: string; issues: any[]; recommendedActions: any[] }>;
  metrics: Array<{ campaignId: string; funnel: string; geo: string; spend: number; cpl: number; cma: number }>;
  allocations: Array<{ campaignId: string; funnel: string; geo: string }>;
};

export default function FunnelsPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const json = (await res.json()) as StatusData;
        setData(json);
      } catch {
        // fallback to dummy data
        setData({
          diagnosis: [],
          metrics: [
            {
              campaignId: 'camp_001',
              funnel: 'SELL',
              geo: 'bengaluru',
              spend: 45000,
              cpl: 1184,
              cma: 2353,
            },
          ],
          allocations: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000); // Refetch every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#888', fontSize: '12px' }}>Loading...</div>
      </div>
    );
  }

  // Group campaigns by funnel
  const campaignsByFunnel: Record<Funnel, Campaign[]> = {
    SELL: [],
    BUY: [],
    FINANCE: [],
    SERVICES: [],
  };

  for (const metric of data.metrics) {
    const funnel = metric.funnel as Funnel;
    const diagnosis = data.diagnosis.find((d) => d.campaignId === metric.campaignId);
    const severity = diagnosis?.issues.some((i) => i.severity === 'critical')
      ? 'critical'
      : diagnosis?.issues.some((i) => i.severity === 'warning')
        ? 'warning'
        : 'ok';

    campaignsByFunnel[funnel].push({
      campaignId: metric.campaignId,
      campaignName: `Campaign ${metric.campaignId.replace('camp_', '')}`,
      geo: metric.geo,
      spend: metric.spend,
      cpl: metric.cpl,
      cma: metric.cma,
      severity: severity as 'ok' | 'warning' | 'critical',
      appointments: Math.floor(metric.spend / metric.cpl * 0.3),
      inspections: Math.floor(metric.spend / metric.cpl * 0.22),
      transactions: Math.floor(metric.spend / metric.cpl * 0.12),
      issues: diagnosis?.issues || [],
      actions: diagnosis?.recommendedActions || [],
    });
  }

  // Calculate average CMA per funnel
  const getCmaAvg = (funnel: Funnel) => {
    const campaigns = campaignsByFunnel[funnel];
    if (campaigns.length === 0) return 0;
    return campaigns.reduce((sum, c) => sum + c.cma, 0) / campaigns.length;
  };

  const selectedData = selectedCampaign
    ? Object.values(campaignsByFunnel)
        .flat()
        .find((c) => c.campaignId === selectedCampaign)
    : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0c0c0e' }}>
      {/* Sidebar */}
      <nav style={{ width: '180px', background: '#141416', borderRight: '1px solid #2a2a2d', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>Navigation</div>
        <Link href="/" style={{ padding: '8px 10px', color: '#888', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', transition: 'all 0.15s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2d'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
          Live Feed
        </Link>
        <Link href="/funnels" style={{ padding: '8px 10px', background: '#f5a62320', color: '#f5a623', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 500, border: '1px solid #f5a62340' }}>
          Funnel Health
        </Link>
        <Link href="/geo" style={{ padding: '8px 10px', color: '#888', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', transition: 'all 0.15s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2d'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
          Geo Heatmap
        </Link>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2d', background: '#0c0c0e' }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f0f0' }}>Funnel Health Grid</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#888' }}>Campaign performance across funnels</p>
        </div>

        {/* 4-column grid */}
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {(['SELL', 'BUY', 'FINANCE', 'SERVICES'] as Funnel[]).map((funnel) => (
            <FunnelColumn
              key={funnel}
              funnel={funnel}
              currentCma={getCmaAvg(funnel)}
              cmaColor={FUNNEL_COLORS[funnel]}
              campaigns={campaignsByFunnel[funnel]}
              onCampaignClick={setSelectedCampaign}
            />
          ))}
        </div>
      </div>

      {/* Campaign drawer */}
      {selectedData && (
        <CampaignDrawer
          campaignId={selectedData.campaignId}
          campaignName={selectedData.campaignName}
          geo={selectedData.geo}
          funnel={Object.entries(campaignsByFunnel).find(([, c]) => c.some((x) => x.campaignId === selectedData.campaignId))?.[0] || 'SELL'}
          issues={selectedData.issues}
          recommendedActions={selectedData.actions}
          appointments={selectedData.appointments || 0}
          inspections={selectedData.inspections || 0}
          transactions={selectedData.transactions || 0}
          benchmarkRates={{ apptToInspRate: 0.72, inspToTxnRate: 0.61 }}
          onForceDignoze={async () => {
            await fetch(`/api/diagnose/${selectedData.campaignId}`, { method: 'POST' });
            setSelectedCampaign(null);
          }}
          onApplyAllocation={async () => {
            await fetch(`/api/allocate/${selectedData.campaignId}`, { method: 'POST' });
            setSelectedCampaign(null);
          }}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
}
