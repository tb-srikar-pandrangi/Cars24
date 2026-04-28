'use client';

import { useEffect, useRef, useState } from 'react';

interface StatusData {
  metrics: Array<{
    campaignId: string;
    impressions: number;
    clicks: number;
    leads: number;
    cpl: number;
    spend: number;
    roas: number;
    appointments?: number;
    transactions?: number;
  }>;
  diagnosis: Array<{
    campaignId: string;
    funnel: string;
    issues: Array<{ stage: string; dropoffRate: number; severity: 'ok' | 'warning' | 'critical'; description: string }>;
  }>;
  allocations: Array<{
    campaignId: string;
    decision: { type: string; reason: string; newBudget?: number; shift?: number };
    timestamp: string;
  }>;
}

export function EventFeed() {
  const [data, setData] = useState<StatusData | null>(null);
  const [status, setStatus] = useState<'loading' | 'live' | 'error'>('loading');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as StatusData;
      setData(json);
      setStatus('live');
      setLastUpdate(new Date());
      setSecondsAgo(0);
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    fetchData();
    pollIntervalRef.current = setInterval(fetchData, 5000);
    const timerRef = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      clearInterval(timerRef);
    };
  }, []);

  const metrics = data?.metrics?.[0];
  const diagnosis = data?.diagnosis?.[0];
  const allocations = data?.allocations || [];

  const getSeverityColor = (severity: string) => {
    if (severity === 'critical') return '#e74c3c';
    if (severity === 'warning') return '#f39c12';
    return '#27ae60';
  };

  const getSeverityBgColor = (severity: string) => {
    if (severity === 'critical') return '#fadbd8';
    if (severity === 'warning') return '#fef5e7';
    return '#d5f4e6';
  };

  return (
    <div style={{ background: '#f5f5f7', minHeight: '100vh', padding: '32px' }}>
      {/* Top Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          padding: '16px 24px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e5e7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: status === 'live' ? '#34c759' : status === 'error' ? '#e74c3c' : '#999',
                boxShadow: status === 'live' ? '0 0 6px #34c759' : 'none',
                animation: status === 'live' ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#1d1d1f' }}>
              {status === 'live' && 'Live'}
              {status === 'error' && 'Error'}
              {status === 'loading' && 'Loading'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#666' }}>
            Last updated {secondsAgo}s ago
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Impressions', value: `${(metrics.impressions / 1000).toFixed(0)}k`, unit: '', color: '#3498db' },
            { label: 'Click Rate', value: ((metrics.clicks / metrics.impressions) * 100).toFixed(1), unit: '%', color: '#9b59b6' },
            { label: 'Leads Generated', value: metrics.leads.toString(), unit: '', color: '#27ae60' },
            { label: 'Cost per Lead', value: `₹${metrics.cpl}`, unit: '', color: '#e74c3c' },
            { label: 'Spend', value: `₹${(metrics.spend / 1000).toFixed(0)}k`, unit: '', color: '#f39c12' },
            { label: 'ROAS', value: metrics.roas.toFixed(1), unit: 'x', color: '#1abc9c' },
          ].map(({ label, value, unit, color }) => (
            <div
              key={label}
              style={{
                padding: '20px',
                background: '#ffffff',
                borderRadius: '8px',
                border: `2px solid ${color}20`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 500 }}>
                {label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color, fontFamily: "'IBM Plex Mono', monospace" }}>
                {value}
                <span style={{ fontSize: '14px', marginLeft: '4px' }}>{unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Issues & Allocations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Health Issues Section */}
        <div
          style={{
            padding: '24px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e5e7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1d1d1f' }}>
            ⚠️ Health Issues
          </h2>

          {diagnosis && diagnosis.issues.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {diagnosis.issues.map((issue, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    background: getSeverityBgColor(issue.severity),
                    borderLeft: `4px solid ${getSeverityColor(issue.severity)}`,
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: getSeverityColor(issue.severity), textTransform: 'uppercase' }}>
                      {issue.stage.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '11px', color: getSeverityColor(issue.severity), fontWeight: 500 }}>
                      {issue.severity === 'critical' ? 'Critical' : issue.severity === 'warning' ? 'Warning' : 'Healthy'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#1d1d1f', lineHeight: '1.4' }}>
                    {issue.description}
                  </p>
                  <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                    Dropoff Rate: <strong>{(issue.dropoffRate * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>✅ All funnels healthy</p>
            </div>
          )}
        </div>

        {/* Allocations Section */}
        <div
          style={{
            padding: '24px',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e5e7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600, color: '#1d1d1f' }}>
            ✅ Recent Actions
          </h2>

          {allocations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {allocations.slice(0, 4).map((alloc, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px',
                    background: '#f0fdf4',
                    borderLeft: '4px solid #34c759',
                    borderRadius: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#34c759', textTransform: 'uppercase' }}>
                      {alloc.decision.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#1d1d1f', lineHeight: '1.4' }}>
                    {alloc.decision.reason}
                  </p>
                  {alloc.decision.newBudget && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
                      <strong>₹{(alloc.decision.newBudget / 1000).toFixed(0)}k</strong> allocated
                      {alloc.decision.shift && ` (shifted ₹${(alloc.decision.shift / 1000).toFixed(0)}k)`}
                    </div>
                  )}
                  <div style={{ marginTop: '6px', fontSize: '10px', color: '#999' }}>
                    {new Date(alloc.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <p style={{ margin: 0, fontSize: '13px' }}>No recent actions</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
