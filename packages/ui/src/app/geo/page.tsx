'use client';

/**
 * Geo Heatmap view — city cards arranged in grid.
 * Row 1: 8 India cities; Row 2: 3 International cities.
 * Sort by worst severity; hover shows more details.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { GeoCard } from '@/components/GeoCard';

type GeoData = {
  city: string;
  activeCampaigns: number;
  avgCma: number;
  dominantFunnel: string;
  worstSeverity: 'ok' | 'warning' | 'critical';
};

export default function GeoPage() {
  const [geos, setGeos] = useState<GeoData[]>([]);

  useEffect(() => {
    // Mock geo data — sorted by worst severity
    const mockGeos: GeoData[] = [
      { city: 'Bengaluru', activeCampaigns: 12, avgCma: 2353, dominantFunnel: 'SELL', worstSeverity: 'critical' },
      { city: 'Delhi', activeCampaigns: 10, avgCma: 2100, dominantFunnel: 'BUY', worstSeverity: 'warning' },
      { city: 'Mumbai', activeCampaigns: 8, avgCma: 2450, dominantFunnel: 'FINANCE', worstSeverity: 'warning' },
      { city: 'Hyderabad', activeCampaigns: 6, avgCma: 2200, dominantFunnel: 'SERVICES', worstSeverity: 'ok' },
      { city: 'Pune', activeCampaigns: 5, avgCma: 2100, dominantFunnel: 'SELL', worstSeverity: 'ok' },
      { city: 'Ahmedabad', activeCampaigns: 4, avgCma: 1950, dominantFunnel: 'BUY', worstSeverity: 'ok' },
      { city: 'Jaipur', activeCampaigns: 3, avgCma: 1850, dominantFunnel: 'FINANCE', worstSeverity: 'ok' },
      { city: 'Kolkata', activeCampaigns: 2, avgCma: 2000, dominantFunnel: 'SERVICES', worstSeverity: 'ok' },
      { city: 'Dubai, UAE', activeCampaigns: 7, avgCma: 3200, dominantFunnel: 'SELL', worstSeverity: 'warning' },
      { city: 'Sydney, AU', activeCampaigns: 4, avgCma: 3500, dominantFunnel: 'BUY', worstSeverity: 'ok' },
      { city: 'Melbourne, AU', activeCampaigns: 2, avgCma: 3300, dominantFunnel: 'FINANCE', worstSeverity: 'ok' },
    ];

    // Sort by severity (critical first, then warning, then ok) and by avgCma desc
    const sorted = mockGeos.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, ok: 2 };
      const severityDiff = severityOrder[a.worstSeverity] - severityOrder[b.worstSeverity];
      if (severityDiff !== 0) return severityDiff;
      return b.avgCma - a.avgCma;
    });

    setGeos(sorted);
  }, []);

  // Split into India (first 8) and International (rest)
  const indiaGeos = geos.slice(0, 8);
  const internationalGeos = geos.slice(8);

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
                  fontWeight: id === 'geo' ? 600 : 500,
                  color: id === 'geo' ? '#ff6b35' : '#1d1d1f',
                  background: id === 'geo' ? '#fff3e0' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={(e) => {
                  if (id !== 'geo') {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                    (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                  }
                }}
                onMouseLeave={(e) => {
                  if (id !== 'geo') {
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
            Geographic Performance
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#666' }}>
            Campaign health and CMA metrics by city and region
          </p>
        </div>

        {/* Info Banner */}
        <div style={{ padding: '16px 32px', background: '#f0f7ff', borderBottom: '1px solid #d4e8ff' }}>
          <div style={{ fontSize: '12px', color: '#0055cc', lineHeight: '1.5' }}>
            <strong>📍 What you're seeing:</strong> Geographic breakdown of campaign performance showing which cities have healthy conversion funnels and which need attention. Sorted by severity (critical issues first), this helps you identify regional problems and allocate budgets more effectively across different markets.
          </div>
        </div>

        {/* Grid content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {/* India cities */}
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '13px', color: '#ff6b35', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
              🇮🇳 India
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {indiaGeos.map((geo) => (
                <GeoCard key={geo.city} {...geo} />
              ))}
            </div>
          </div>

          {/* International cities */}
          {internationalGeos.length > 0 && (
            <div>
              <h2 style={{ fontSize: '13px', color: '#17a2b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
                🌍 International
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {internationalGeos.map((geo) => (
                  <GeoCard key={geo.city} {...geo} />
                ))}
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
