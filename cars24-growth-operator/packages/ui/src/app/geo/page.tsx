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
    <div style={{ display: 'flex', height: '100vh', background: '#0c0c0e' }}>
      {/* Sidebar */}
      <nav style={{ width: '180px', background: '#141416', borderRight: '1px solid #2a2a2d', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px' }}>Navigation</div>
        <Link href="/" style={{ padding: '8px 10px', color: '#888', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', transition: 'all 0.15s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2d'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
          Live Feed
        </Link>
        <Link href="/funnels" style={{ padding: '8px 10px', color: '#888', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', transition: 'all 0.15s' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2d'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
          Funnel Health
        </Link>
        <Link href="/geo" style={{ padding: '8px 10px', background: '#f5a62320', color: '#f5a623', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 500, border: '1px solid #f5a62340' }}>
          Geo Heatmap
        </Link>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2d', background: '#0c0c0e' }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f0f0' }}>Geo Heatmap</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#888' }}>Performance by geography (sorted by severity)</p>
        </div>

        {/* Grid content */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {/* India cities */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '12px', color: '#f5a623', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
              India
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {indiaGeos.map((geo) => (
                <GeoCard key={geo.city} {...geo} />
              ))}
            </div>
          </div>

          {/* International cities */}
          {internationalGeos.length > 0 && (
            <div>
              <h2 style={{ fontSize: '12px', color: '#17a2b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>
                International
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {internationalGeos.map((geo) => (
                  <GeoCard key={geo.city} {...geo} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
