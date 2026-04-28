'use client';

import Link from 'next/link';
import { EventStream } from '@/components/EventStream';
import { useState } from 'react';

export default function Home() {
  const [activeNav, setActiveNav] = useState('feed');

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
        {/* Logo */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.3px' }}>
            CARS24
          </div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '4px', fontWeight: 500 }}>
            Growth Operator
          </div>
        </div>

        {/* Navigation */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.5px' }}>
            Main
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'feed', label: 'Live Feed', icon: '📊' },
              { id: 'funnels', label: 'Funnel Health', icon: '📈' },
              { id: 'geo', label: 'Geo Heatmap', icon: '🗺️' },
            ].map(({ id, label, icon }) => (
              <Link
                key={id}
                href={id === 'feed' ? '/' : `/${id}`}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: activeNav === id ? 600 : 500,
                  color: activeNav === id ? '#ff6b35' : '#1d1d1f',
                  background: activeNav === id ? '#fff3e0' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
                onMouseEnter={(e) => {
                  if (activeNav !== id) {
                    (e.currentTarget as HTMLElement).style.background = '#f5f5f7';
                    (e.currentTarget as HTMLElement).style.color = '#ff6b35';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeNav !== id) {
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

        {/* Funnels Section */}
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

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            padding: '28px 32px',
            borderBottom: '1px solid #e5e5e7',
            background: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>
            Live Feed
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666', fontWeight: 400 }}>
            Real-time campaign performance across all funnels
          </p>
        </div>

        {/* Dashboard Overview Banner */}
        <div style={{ padding: '20px 32px', background: '#fff3e0', borderBottom: '1px solid #ffe8cc' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#ff6b35', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                What this agent does
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#1d1d1f', lineHeight: '1.6', fontWeight: 400 }}>
                The CARS24 Growth Operator runs 4 AI agents in parallel, 24/7. It detects campaign failures before they compound — CPL spikes, CMA collapse, creative fatigue, and Spinny conquest activity. When an ad's copy score drops below threshold, it automatically regenerates the creative in CARS24's brand voice. When a geo stops converting, it flags the budget for reallocation. The team sees decisions; the agent does the work.
              </p>
            </div>
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 700, color: '#ff6b35', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Key Terms
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12px', color: '#1d1d1f' }}>
                <div><strong>CPL:</strong> Cost per Lead — ad spend ÷ leads generated</div>
                <div><strong>CMA:</strong> Contribution Margin per Acquisition — net margin retained after all acquisition costs. <strong>This is the north star metric.</strong></div>
                <div><strong>Severity:</strong> 🟢 OK · 🟡 Warning · 🔴 Critical</div>
                <div><strong>Benchmark:</strong> CARS24's internal performance target per funnel</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <EventStream />
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
