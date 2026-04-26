/**
 * SSE endpoint — streams AgentEvents from the orchestrator bus to browser clients.
 * Each event is serialised as a single `data:` line per the SSE spec.
 * Hot-path: O(1) per event — one JSON.stringify + one TextEncoder.encode per yield.
 */
import type { NextRequest } from 'next/server';
import { bus } from '@cars24/shared';
import type { AgentEvent } from '@cars24/shared';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVENT_TYPES: AgentEvent['type'][] = [
  'metrics_ready', 'funnel_health', 'diagnosis_ready', 'alert',
  'creative_scored', 'creative_improved', 'allocation_decided', 'allocation_applied',
  'ingest_error', 'competitor_alert'
];

export function GET(_req: NextRequest): Response {
  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();
      const unsubscribes: Array<() => void> = [];

      const send = (data: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // ignore encode errors, client likely disconnected
        }
      };

      // Confirm connection to client immediately.
      send({ type: 'connected', payload: { ts: new Date().toISOString() } });

      // Subscribe to all event types and forward to client.
      for (const eventType of EVENT_TYPES) {
        const off = bus.on(eventType, (payload) => {
          send({ type: eventType, payload });
        });
        unsubscribes.push(off);
      }

      // Heartbeat every 25s to prevent proxy timeouts.
      const heartbeat = setInterval(() => send({ type: 'ping' }), 25_000);

      (controller as unknown as { _heartbeat: ReturnType<typeof setInterval> })._heartbeat = heartbeat;
      (controller as unknown as { _unsubscribes: typeof unsubscribes })._unsubscribes = unsubscribes;
    },
    cancel(controller) {
      const c = controller as unknown as { _heartbeat?: ReturnType<typeof setInterval>; _unsubscribes?: Array<() => void> };
      if (c._heartbeat) clearInterval(c._heartbeat);
      if (c._unsubscribes) {
        for (const off of c._unsubscribes) off();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
