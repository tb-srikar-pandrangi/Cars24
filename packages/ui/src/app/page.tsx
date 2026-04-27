/**
 * Home / Live Event Feed view.
 * Real-time streaming of all orchestrator events via SSE.
 */
'use client';

import Link from 'next/link';
import { EventFeed } from '@/components/EventFeed';

export default function Home() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0c0c0e' }}>
      {/* Sidebar */}
      <nav style={{ width: '180px', background: '#141416', borderRight: '1px solid #2a2a2d', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Navigation</div>
        <Link href="/" style={{ padding: '8px 10px', background: '#f5a62320', color: '#f5a623', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', fontWeight: 500, border: '1px solid #f5a62340' }}>
          Live Feed
        </Link>
        <Link href="/funnels" style={{ padding: '8px 10px', color: '#888', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', transition: 'all 0.15s ease', border: '1px solid transparent' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2d'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
          Funnel Health
        </Link>
        <Link href="/geo" style={{ padding: '8px 10px', color: '#888', borderRadius: '4px', textDecoration: 'none', fontSize: '12px', transition: 'all 0.15s ease', border: '1px solid transparent' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#2a2a2d'; (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#888'; }}>
          Geo Heatmap
        </Link>

        <div style={{ borderTop: '1px solid #2a2a2d', marginTop: '16px', paddingTop: '16px', fontSize: '10px', color: '#666' }}>
          <div style={{ color: '#888', fontWeight: 600, marginBottom: '8px' }}>Funnels</div>
          {['SELL', 'BUY', 'FINANCE', 'SERVICES'].map((f) => (
            <div key={f} style={{ padding: '4px 8px', fontSize: '11px', color: '#888', cursor: 'pointer', transition: 'color 0.15s ease' }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#f0f0f0'; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#888'; }}>
              {f}
            </div>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #2a2a2d', background: '#0c0c0e' }}>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#f0f0f0' }}>CARS24 Growth Operator</h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#888' }}>Real-time performance intelligence</p>
        </div>

        {/* Event feed */}
        <EventFeed />
      </div>
    </div>
  );
}
