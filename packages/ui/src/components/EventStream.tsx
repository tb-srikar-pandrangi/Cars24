'use client';

import { useEffect, useRef, useState } from 'react';

interface AgentEvent {
  type: string;
  payload: Record<string, any>;
  timestamp?: string;
}

export function EventStream() {
  const [events, setEvents] = useState<Array<AgentEvent & { id: string; renderedAt: Date }>>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'reconnecting'>('connecting');
  const [reconnectIn, setReconnectIn] = useState<number>(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectBackoffRef = useRef<number>(1000);
  const reconnectTimerRef = useRef<NodeJS.Timeout>();

  const getEventDescription = (event: AgentEvent): { title: string; metric?: string } => {
    const { type, payload } = event;

    switch (type) {
      case 'metrics_ready':
        return {
          title: 'Campaign data refreshed',
          metric: `₹${payload.spend}`,
        };
      case 'diagnosis_ready':
        if (payload.severity === 'ok') {
          return { title: 'All checks passed', metric: payload.geo };
        } else if (payload.severity === 'warning') {
          return {
            title: `⚠️ Warning detected — ${payload.issue}`,
            metric: payload.geo,
          };
        }
        break;
      case 'alert':
        return {
          title: `🚨 Critical alert — ${payload.issue || 'Issue detected'}`,
          metric: payload.geo,
        };
      case 'creative_improved':
        return {
          title: `Ad copy improved — ${payload.adId}`,
          metric: `+${payload.scoreImprovement}%`,
        };
      case 'allocation_decided':
        return {
          title: `Budget adjusted — ₹${payload.shift} shifted`,
          metric: payload.geo,
        };
      case 'competitor_alert':
        return {
          title: `⚠️ Competitor activity — ${payload.competitor}`,
          metric: payload.geo,
        };
      case 'ping':
        return { title: '📡 Connection alive' };
      case 'connected':
        return { title: '🟢 Connected to event stream' };
      default:
        return { title: type };
    }

    return { title: type };
  };

  const connectToEventStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    setReconnectIn(0);

    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => {
      setStatus('connected');
      reconnectBackoffRef.current = 1000;
    };

    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as AgentEvent;

        // Skip ping events from being added to feed
        if (data.type === 'ping') {
          return;
        }

        const eventWithId = {
          ...data,
          id: `${Date.now()}-${Math.random()}`,
          renderedAt: new Date(),
        };

        setEvents((prev) => [eventWithId, ...prev].slice(0, 50));
      } catch {
        // ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      setStatus('reconnecting');
      reconnectBackoffRef.current = Math.min(reconnectBackoffRef.current * 2, 30000);

      let countdown = Math.floor(reconnectBackoffRef.current / 1000);
      setReconnectIn(countdown);

      const interval = setInterval(() => {
        countdown--;
        setReconnectIn(countdown);
        if (countdown <= 0) {
          clearInterval(interval);
          connectToEventStream();
        }
      }, 1000);

      reconnectTimerRef.current = interval;
    };

    eventSourceRef.current = eventSource;
  };

  useEffect(() => {
    connectToEventStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearInterval(reconnectTimerRef.current);
      }
    };
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const funnelColors: Record<string, string> = {
    SELL: '#f5a623',
    BUY: '#17a2b8',
    FINANCE: '#2dc653',
    SERVICES: '#ff6b00',
  };

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh', padding: '32px' }}>
      {/* Status Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          padding: '16px 20px',
          background: '#ffffff',
          borderRadius: '10px',
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
                background:
                  status === 'connected'
                    ? '#34c759'
                    : status === 'reconnecting'
                      ? '#f39c12'
                      : '#e74c3c',
                boxShadow: status === 'connected' ? '0 0 6px #34c759' : 'none',
                animation: status === 'connected' ? 'pulse 2s infinite' : 'none',
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1d1d1f' }}>
              {status === 'connected' && '● Event Stream Live'}
              {status === 'connecting' && '⏳ Connecting...'}
              {status === 'reconnecting' && `⏳ Reconnecting in ${reconnectIn}s...`}
              {status === 'disconnected' && '● Disconnected'}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#999' }}>
            {events.length} events received • Updates stream in real-time
          </p>
        </div>
      </div>

      {/* Events Feed */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {events.length === 0 ? (
          <div
            style={{
              padding: '32px',
              textAlign: 'center',
              background: '#f9f9fb',
              borderRadius: '10px',
              border: '1px solid #e5e5e7',
              color: '#999',
              fontSize: '13px',
            }}
          >
            Waiting for events... Events will appear here as the system processes campaigns.
          </div>
        ) : (
          events.map((event) => {
            const desc = getEventDescription(event);
            const funnel = event.payload.funnel;
            const funnelColor = funnel ? funnelColors[funnel] : '#999';

            return (
              <div
                key={event.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px 16px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e5e5e7',
                  fontSize: '13px',
                }}
              >
                <div style={{ color: '#999', minWidth: '70px', fontFamily: 'monospace' }}>
                  {formatTime(event.renderedAt)}
                </div>

                {funnel && (
                  <div
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      background: funnelColor,
                      color: '#ffffff',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      minWidth: '60px',
                      textAlign: 'center',
                    }}
                  >
                    {funnel}
                  </div>
                )}

                <div style={{ flex: 1 }}>
                  <div style={{ color: '#1d1d1f', fontWeight: 500 }}>{desc.title}</div>
                </div>

                {desc.metric && (
                  <div
                    style={{
                      color: '#666',
                      fontSize: '12px',
                      fontWeight: 500,
                      minWidth: '80px',
                      textAlign: 'right',
                    }}
                  >
                    {desc.metric}
                  </div>
                )}
              </div>
            );
          })
        )}
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
