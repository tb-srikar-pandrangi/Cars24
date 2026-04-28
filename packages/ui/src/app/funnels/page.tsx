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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f7' }}>
      {/* Sidebar */}
      <nav
        style={{
          width: '240px',
          background: '#ffffff',
          borderRight: '1px solid #e5e5e7',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          overflowY: 'auto',
          position: 'sticky',
          top: 0,
          height: '100vh',
          boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.3px' }}>
            CARS24
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontWeight: 500 }}>
            Growth Operator
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
            Main
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'feed', label: 'Live Feed', icon: '📊', href: '/' },
              { id: 'funnels', label: 'Funnel Health', icon: '📈', href: '/funnels' },
              { id: 'geo', label: 'Geo Heatmap', icon: '🗺️', href: '/geo' },
            ].map(({ id, label, icon, href }) => (
              <Link
                key={id}
                href={href}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: id === 'funnels' ? 600 : 500,
                  color: id === 'funnels' ? '#ff6b35' : '#1d1d1f',
                  background: id === 'funnels' ? '#fff3e0' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={(e) => {
                  if (id !== 'funnels') {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                    (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                  }
                }}
                onMouseLeave={(e) => {
                  if (id !== 'funnels') {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#1d1d1f';
                  }
                }}
              >
                <span>{icon}</span>
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
            Funnels
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['SELL', 'BUY', 'FINANCE', 'SERVICES'].map((f) => (
              <div
                key={f}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: '#666',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                  (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#666';
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            padding: '20px 32px',
            borderBottom: '1px solid #e5e5e7',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600, color: '#1d1d1f' }}>
            Funnel Health Analysis
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#666' }}>
            Monitor campaign performance across SELL, BUY, FINANCE, and SERVICES funnels
          </p>
        </div>

        {/* Info Banner */}
        <div style={{ padding: '16px 32px', background: '#f0f7ff', borderBottom: '1px solid #d4e8ff' }}>
          <div style={{ fontSize: '12px', color: '#0055cc', lineHeight: '1.5' }}>
            <strong>📊 What you're seeing:</strong> This dashboard tracks the health of all customer acquisition funnels. Each funnel represents a different business line (Sell, Buy, Finance, Services). The system automatically diagnoses issues in conversion stages and recommends budget reallocations to optimize Cost per Lead (CPL) and Cost per Appointment (CMA).
          </div>
        </div>

        {/* 4-column grid */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
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
          issues={(selectedData.issues ?? []) as Array<{ stage: string; dropoffRate: number; severity: 'ok' | 'warning' | 'critical'; description: string }>}
          recommendedActions={selectedData.actions ?? []}
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

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f5f5f7;
        }
        ::-webkit-scrollbar-thumb {
          background: #d0d0d3;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a0a0a3;
        }
      `}</style>
    </div>
  );
}
