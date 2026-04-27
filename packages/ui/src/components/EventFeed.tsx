/**
 * EventFeed — subscribes to /api/events SSE stream with virtual scrolling.
 * Virtualised via @tanstack/react-virtual to handle 200+ events efficiently.
 * Auto-reconnect with exponential backoff (1s → 2s → 4s → 30s max).
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { AgentEvent } from '@cars24/shared';

type FeedEntry = { id: number; ts: number } & AgentEvent;

const EVENT_COLORS: Record<AgentEvent['type'], string> = {
  metrics_ready: '#666666',
  funnel_health: '#888888',
  diagnosis_ready: '#2dc653',
  alert: '#ff9f1c',
  creative_scored: '#17a2b8',
  creative_improved: '#00d9ff',
  allocation_decided: '#6366f1',
  allocation_applied: '#2dc653',
  ingest_error: '#e63946',
  competitor_alert: '#f5a623',
};

let seq = 0;

export function EventFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'reconnecting'>('connecting');
  const [counters, setCounters] = useState({
    campaignsLive: 24,
    alertsToday: 12,
    sellCplAvg: 1240,
    buyCmaAvg: 3850,
    creativesImproved: 47,
    budgetShifted: 285000,
  });

  const parentRef = useRef<HTMLDivElement>(null);
  const eSourceRef = useRef<EventSource | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const connectSSE = useCallback(() => {
    if (eSourceRef.current) return;
    setStatus('connecting');

    const es = new EventSource('/api/events');

    es.onopen = () => {
      setStatus('connected');
      reconnectCountRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      eSourceRef.current = null;
      setStatus('reconnecting');

      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(1000 * (2 ** reconnectCountRef.current), 30000);
      reconnectCountRef.current += 1;

      reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
    };

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const event = JSON.parse(e.data) as AgentEvent | { type: 'ping' } | { type: 'connected' };
        if (event.type === 'ping' || event.type === 'connected') return;

        const newEntry: FeedEntry = { id: seq++, ts: Date.now(), ...(event as AgentEvent) };
        setEntries((prev) => [newEntry, ...prev].slice(0, 200));

        // Update counters based on event type
        setCounters((prev) => ({
          ...prev,
          alertsToday: event.type === 'alert' ? prev.alertsToday + 1 : prev.alertsToday,
          creativesImproved: event.type === 'creative_improved' ? prev.creativesImproved + 1 : prev.creativesImproved,
        }));
      } catch {
        // discard malformed frames
      }
    };

    eSourceRef.current = es;
  }, []);

  useEffect(() => {
    connectSSE();
    return () => {
      if (eSourceRef.current) eSourceRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [connectSSE]);

  const statusColor = status === 'connected' ? '#2dc653' : status === 'error' ? '#e63946' : '#ff9f1c';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top bar with counters */}
      <div style={{ padding: '12px', borderBottom: '1px solid #2a2a2d', background: '#141416', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', fontSize: '11px' }}>
        {[
          { label: 'Campaigns Live', value: counters.campaignsLive, color: '#f0f0f0' },
          { label: 'Alerts (24h)', value: counters.alertsToday, color: '#ff9f1c' },
          { label: 'SELL CPL avg', value: `₹${counters.sellCplAvg}`, color: '#f5a623' },
          { label: 'BUY CMA avg', value: `₹${counters.buyCmaAvg}`, color: '#f5a623' },
          { label: 'Creatives Improved', value: counters.creativesImproved, color: '#00d9ff' },
          { label: 'Budget Shifted ₹', value: `${(counters.budgetShifted / 1000).toFixed(0)}k`, color: '#2dc653' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#888', fontSize: '9px', marginBottom: '2px' }}>{label}</div>
            <div style={{ color, fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500, fontSize: '12px' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Status bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a2d', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
        <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: statusColor, animation: status === 'reconnecting' ? 'pulse 1s infinite' : undefined }} />
        <span style={{ color: '#888' }}>
          {status === 'connected' && 'Connected'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'reconnecting' && 'Reconnecting...'}
          {status === 'error' && 'Error'}
        </span>
        <span style={{ color: '#666', marginLeft: 'auto' }}>{entries.length} events</span>
      </div>

      {/* Virtual scroll list */}
      <div
        ref={parentRef}
        style={{ flex: 1, overflow: 'auto', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace" }}
      >
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const entry = entries[virtualItem.index]!;
            return (
              <div
                key={entry.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: '100px 100px 1fr',
                  gap: '8px',
                  padding: '8px 12px',
                  borderBottom: '1px solid #1a1a1c',
                  alignItems: 'center',
                  background: entry.type === 'alert' || entry.type === 'ingest_error' ? '#1a0a0a' : undefined,
                }}
              >
                <span style={{ color: '#888', fontSize: '9px' }}>
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
                <span style={{ color: EVENT_COLORS[entry.type] ?? '#888', fontWeight: 500 }}>
                  {entry.type.toUpperCase()}
                </span>
                <span style={{ color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {JSON.stringify(entry.payload).substring(0, 120)}
                </span>
              </div>
            );
          })}
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
