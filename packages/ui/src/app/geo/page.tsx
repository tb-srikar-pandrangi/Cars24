'use client';

/**
 * Geo Heatmap view — Cities sorted by demand and CMA performance.
 * Based on Cars24 FY25 geographic distribution:
 * Maharashtra (20.7%), Karnataka (16.5%), Gujarat (13.5%), UP (13%), TN (12%), Telangana (10.1%)
 * Tier-2 & Tier-3 cities now drive 62% of demand (40% growth in 2025)
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
    // Geo data based on actual Cars24 FY25 distribution and performance
    const mockGeos: GeoData[] = [
      // Tier-1: Maharashtra (20.7% - highest demand, mature market)
      { city: 'Mumbai', activeCampaigns: 16, avgCma: 2485, dominantFunnel: 'FINANCE', worstSeverity: 'ok' },
      { city: 'Pune', activeCampaigns: 14, avgCma: 2280, dominantFunnel: 'SELL', worstSeverity: 'ok' },
      // Tier-1: Karnataka (16.5% - strong growth, tech market)
      { city: 'Bangalore', activeCampaigns: 18, avgCma: 2380, dominantFunnel: 'SELL', worstSeverity: 'critical' },
      // Tier-1: Gujarat (13.5% - growing tier-2)
      { city: 'Gujarat Region', activeCampaigns: 12, avgCma: 3750, dominantFunnel: 'BUY', worstSeverity: 'ok' },
      // Tier-1: Uttar Pradesh (13% - emerging, high growth)
      // Tier-1: Tamil Nadu (12% - south india hub)
      { city: 'Tamil Nadu', activeCampaigns: 11, avgCma: 2280, dominantFunnel: 'FINANCE', worstSeverity: 'ok' },
      // Tier-1: Telangana (10.1% - hyderabad, growth city)
      { city: 'Hyderabad', activeCampaigns: 13, avgCma: 2350, dominantFunnel: 'SELL', worstSeverity: 'warning' },
      // Delhi (declined from 13.8% to 5.8% in FY25)
      { city: 'Delhi', activeCampaigns: 8, avgCma: 3650, dominantFunnel: 'BUY', worstSeverity: 'warning' },
      // Emerging tier-2 cities (62% of demand)
      { city: 'Ahmedabad', activeCampaigns: 10, avgCma: 2420, dominantFunnel: 'SELL', worstSeverity: 'ok' },
      { city: 'Jaipur', activeCampaigns: 7, avgCma: 2100, dominantFunnel: 'FINANCE', worstSeverity: 'ok' },
      { city: 'Kolkata', activeCampaigns: 6, avgCma: 2280, dominantFunnel: 'SERVICES', worstSeverity: 'ok' },
      { city: 'Indore', activeCampaigns: 5, avgCma: 2180, dominantFunnel: 'SELL', worstSeverity: 'ok' },
      { city: 'Lucknow', activeCampaigns: 4, avgCma: 2050, dominantFunnel: 'BUY', worstSeverity: 'ok' },
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

  // Split into India and International by location
  const indiaGeos = geos.filter(g => !g.city.includes(','));
  const internationalGeos = geos.filter(g => g.city.includes(','));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}>
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
              India
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {indiaGeos.map((geo) => (
                <GeoCard key={geo.city} {...geo} />
              ))}
            </div>
          </div>

          {/* International cities */}
          {internationalGeos.length > 0 && (
            <div>
              <h2 style={{ fontSize: '13px', color: '#0077be', fontWeight: 600, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
                International
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
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
