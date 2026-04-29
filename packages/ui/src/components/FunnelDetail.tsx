'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { Funnel } from '@cars24/shared';

type Campaign = {
  campaignId: string;
  campaignName: string;
  geo: string;
  spend: number;
  cpl: number;
  cma: number;
  appointments?: number;
};

type StatusData = {
  metrics: Array<{ campaignId: string; funnel: string; geo: string; spend: number; cpl: number; cma: number; campaignName?: string }>;
};

const BENCHMARKS: Record<string, { cpl: number; cma: number }> = {
  SELL: { cpl: 1000, cma: 2200 },
  BUY: { cpl: 1800, cma: 3700 },
  FINANCE: { cpl: 700, cma: 1900 },
  SERVICES: { cpl: 1200, cma: 3100 },
};

const OPTIMIZATION_STEPS: Record<string, string[]> = {
  SELL: [
    'Improve ad creative to reduce CPL by 10-15%',
    'Test new audience segments for higher conversion',
    'Increase bid for top-performing geos',
    'A/B test landing pages for appointment bookings',
  ],
  BUY: [
    'Optimize test drive booking flow (reduce friction)',
    'Create geo-specific ad variants',
    'Improve inventory visibility in high-intent regions',
    'Increase budget for high-ROAS geos',
  ],
  FINANCE: [
    'Simplify loan application form (reduce dropoff)',
    'Improve pre-approval speed messaging',
    'Test EMI calculation examples in ads',
    'Target high-intent audiences with product comparisons',
  ],
  SERVICES: [
    'Improve service booking experience',
    'Create warranty package bundling offers',
    'Target post-purchase audiences with service promotions',
    'Test service combo offers (maintenance + warranty)',
  ],
};

function getPerformanceLabel(current: number, benchmark: number, metricType: 'cost' | 'margin'): { text: string; color: string } {
  const pct = Math.round(((current - benchmark) / benchmark) * 100);
  const isGood = metricType === 'cost' ? current < benchmark : current > benchmark;

  if (isGood) {
    if (Math.abs(pct) <= 5) return { text: 'On Target', color: '#27ae60' };
    if (Math.abs(pct) <= 15) return { text: 'Good', color: '#27ae60' };
    return { text: 'Excellent', color: '#27ae60' };
  } else {
    if (Math.abs(pct) <= 5) return { text: 'On Target', color: '#f39c12' };
    if (Math.abs(pct) <= 15) return { text: 'Needs Improvement', color: '#f39c12' };
    return { text: 'Critical', color: '#e74c3c' };
  }
}

export function FunnelDetail({ funnel }: { funnel: string }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const json = (await res.json()) as StatusData;
        const filtered = json.metrics
          .filter((m) => m.funnel === funnel)
          .map((m) => ({
            campaignId: m.campaignId,
            campaignName: m.campaignName || `Campaign ${m.campaignId}`,
            geo: m.geo,
            spend: m.spend,
            cpl: m.cpl,
            cma: m.cma,
            appointments: Math.floor(m.spend / m.cpl * 0.3),
          }));
        setCampaigns(filtered);
      } catch (error) {
        console.error('Error fetching status:', error);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [funnel]);

  const benchmark = BENCHMARKS[funnel];
  const steps = OPTIMIZATION_STEPS[funnel];
  const avgCMA = campaigns.length > 0 ? Math.round(campaigns.reduce((sum, c) => sum + c.cma, 0) / campaigns.length) : 0;
  const avgCPL = campaigns.length > 0 ? Math.round(campaigns.reduce((sum, c) => sum + c.cpl, 0) / campaigns.length) : 0;

  const cplPerf = benchmark ? getPerformanceLabel(avgCPL, benchmark.cpl, 'cost') : { text: 'N/A', color: '#999' };
  const cmaPerf = benchmark ? getPerformanceLabel(avgCMA, benchmark.cma, 'margin') : { text: 'N/A', color: '#999' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}>
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
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.3px', cursor: 'pointer' }}>
              CARS24
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontWeight: 500 }}>
              Growth Operator
            </div>
          </Link>
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
                  fontWeight: 500,
                  color: '#1d1d1f',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
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
              <Link
                key={f}
                href={`/${f.toLowerCase()}`}
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: funnel === f ? '#ff6b35' : '#666',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderRadius: '4px',
                  background: funnel === f ? '#fff3e0' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: funnel === f ? 600 : 500,
                }}
              >
                {f}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e5e7',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>
            {funnel} Funnel Details
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#666', fontWeight: 400 }}>
            Campaign performance across cities
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#999' }}>Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999' }}>No campaigns found for {funnel} funnel</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#1d1d1f' }}>
                  Funnel Overview
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                  <div style={{ padding: '20px', background: '#f9f9fb', borderRadius: '12px', border: '1px solid #e5e5e7' }}>
                    <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Avg CPL
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#1d1d1f', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '8px' }}>
                      ₹{avgCPL.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Benchmark: ₹{benchmark?.cpl.toLocaleString('en-IN') || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: cplPerf.color }}>
                      {cplPerf.text}
                    </div>
                  </div>

                  <div style={{ padding: '20px', background: '#f9f9fb', borderRadius: '12px', border: '1px solid #e5e5e7' }}>
                    <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                      Avg CMA
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#ff6b35', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '8px' }}>
                      ₹{avgCMA.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                      Benchmark: ₹{benchmark?.cma.toLocaleString('en-IN') || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: cmaPerf.color }}>
                      {cmaPerf.text}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: 700, color: '#1d1d1f' }}>
                    Steps to Increase CMA
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {steps?.map((step, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '12px',
                          background: '#f9f9fb',
                          borderRadius: '8px',
                          border: '1px solid #e5e5e7',
                        }}
                      >
                        <div
                          style={{
                            minWidth: '24px',
                            width: '24px',
                            height: '24px',
                            background: '#ff6b35',
                            color: '#ffffff',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                          }}
                        >
                          {i + 1}
                        </div>
                        <div style={{ fontSize: '13px', color: '#1d1d1f', lineHeight: '1.5' }}>
                          {step}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#1d1d1f' }}>
                  Campaign Performance by City
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {campaigns.map((campaign) => {
                    const cplLabel = benchmark ? getPerformanceLabel(campaign.cpl, benchmark.cpl, 'cost') : { text: 'N/A', color: '#999' };
                    const cmaLabel = benchmark ? getPerformanceLabel(campaign.cma, benchmark.cma, 'margin') : { text: 'N/A', color: '#999' };

                    return (
                      <div
                        key={campaign.campaignId}
                        style={{
                          padding: '16px',
                          background: '#f9f9fb',
                          borderRadius: '12px',
                          border: '1px solid #e5e5e7',
                        }}
                      >
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#000000', marginBottom: '4px' }}>
                            {campaign.campaignName.split('_').slice(1).join(' · ')}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {campaign.geo}
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <div style={{ fontSize: '11px', color: '#999', fontWeight: 600, marginBottom: '4px' }}>CPL</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1d1d1f', fontFamily: "'IBM Plex Mono', monospace" }}>
                              ₹{campaign.cpl.toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: cplLabel.color, fontWeight: 600, marginTop: '4px' }}>
                              {cplLabel.text}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '11px', color: '#999', fontWeight: 600, marginBottom: '4px' }}>CMA</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ff6b35', fontFamily: "'IBM Plex Mono', monospace" }}>
                              ₹{campaign.cma.toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '11px', color: cmaLabel.color, fontWeight: 600, marginTop: '4px' }}>
                              {cmaLabel.text}
                            </div>
                          </div>
                        </div>

                        <div style={{ fontSize: '11px', color: '#666', padding: '8px', background: '#ffffff', borderRadius: '6px' }}>
                          Spend: ₹{campaign.spend.toLocaleString('en-IN')} • Appointments: {campaign.appointments || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #ffffff;
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
