/**
 * SSE endpoint — streams AgentEvents from the orchestrator bus to browser clients.
 * Each event is serialised as a single `data:` line per the SSE spec.
 * Hot-path: O(1) per event — one JSON.stringify + one TextEncoder.encode per yield.
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EVENT_TYPES = [
  'metrics_ready', 'funnel_health', 'diagnosis_ready', 'alert',
  'creative_scored', 'creative_improved', 'allocation_decided', 'allocation_applied',
  'ingest_error', 'competitor_alert'
] as const;

const mockCampaigns = [
  { campaignId: 'camp_001', funnel: 'SELL', geo: 'Bengaluru', name: 'SELL_Bengaluru_Meta_LeadGen' },
  { campaignId: 'camp_002', funnel: 'SELL', geo: 'Delhi', name: 'SELL_Delhi_Google_Branded' },
  { campaignId: 'camp_003', funnel: 'SELL', geo: 'Mumbai', name: 'SELL_Mumbai_Meta_Retargeting' },
  { campaignId: 'camp_004', funnel: 'BUY', geo: 'Bengaluru', name: 'BUY_Bengaluru_Google_NonBranded' },
  { campaignId: 'camp_005', funnel: 'BUY', geo: 'Hyderabad', name: 'BUY_Hyderabad_YouTube_Awareness' },
  { campaignId: 'camp_006', funnel: 'BUY', geo: 'Pune', name: 'BUY_Pune_Google_Remarketing' },
  { campaignId: 'camp_007', funnel: 'FINANCE', geo: 'Mumbai', name: 'FINANCE_Mumbai_Google_Search' },
  { campaignId: 'camp_008', funnel: 'FINANCE', geo: 'Ahmedabad', name: 'FINANCE_Ahmedabad_Meta_LAL' },
  { campaignId: 'camp_009', funnel: 'FINANCE', geo: 'Jaipur', name: 'FINANCE_Jaipur_Google_EMIKeywords' },
  { campaignId: 'camp_010', funnel: 'SERVICES', geo: 'Delhi', name: 'SERVICES_Delhi_Meta_Retargeting' },
  { campaignId: 'camp_011', funnel: 'SERVICES', geo: 'Kolkata', name: 'SERVICES_Kolkata_Meta_PostTxn' },
  { campaignId: 'camp_012', funnel: 'SERVICES', geo: 'Hyderabad', name: 'SERVICES_Hyderabad_Google_Remarketing' },
];

function generateMockEvent(cycle: number) {
  const eventIndex = cycle % 6;
  const campaignIndex = Math.floor(Math.random() * mockCampaigns.length);
  const campaign = mockCampaigns[campaignIndex];

  switch (eventIndex) {
    case 0: // metrics_ready
      return {
        type: 'metrics_ready',
        payload: {
          campaignId: campaign.campaignId,
          funnel: campaign.funnel,
          geo: campaign.geo,
          impressions: Math.floor(Math.random() * 50000) + 30000,
          clicks: Math.floor(Math.random() * 2000) + 500,
          leads: Math.floor(Math.random() * 50) + 20,
          cpl: Math.floor(Math.random() * 500) + 800,
          spend: Math.floor(Math.random() * 50000) + 20000,
          roas: (Math.random() * 2 + 1.5).toFixed(2),
        },
      };
    case 1: // diagnosis_ready - ok
      return {
        type: 'diagnosis_ready',
        payload: {
          campaignId: campaign.campaignId,
          funnel: campaign.funnel,
          severity: 'ok',
          issue: 'All checks passed',
        },
      };
    case 2: // diagnosis_ready - warning
      return {
        type: 'diagnosis_ready',
        payload: {
          campaignId: campaign.campaignId,
          funnel: campaign.funnel,
          severity: 'warning',
          issue: `CPL spike detected — ${campaign.geo}`,
        },
      };
    case 3: // creative_improved
      return {
        type: 'creative_improved',
        payload: {
          campaignId: campaign.campaignId,
          funnel: campaign.funnel,
          geo: campaign.geo,
          adId: `ad_${Math.floor(Math.random() * 1000)}`,
          scoreImprovement: (Math.random() * 15 + 5).toFixed(1),
        },
      };
    case 4: // allocation_decided
      return {
        type: 'allocation_decided',
        payload: {
          campaignId: campaign.campaignId,
          funnel: campaign.funnel,
          geo: campaign.geo,
          shift: Math.floor(Math.random() * 10000) + 2000,
        },
      };
    case 5: // competitor_alert (Spinny)
      return {
        type: 'competitor_alert',
        payload: {
          competitor: 'Spinny',
          activity: 'High spend detected',
          geo: campaign.geo,
          severity: cycle % 8 === 0 ? 'critical' : 'warning',
        },
      };
    default:
      return {
        type: 'metrics_ready',
        payload: { campaignId: campaign.campaignId, funnel: campaign.funnel, geo: campaign.geo },
      };
  }
}

export function GET(_req: NextRequest): Response {
  const stream = new ReadableStream({
    async start(controller) {
      let bus: any = null;
      try {
        const { bus: importedBus } = await import('@cars24/shared');
        bus = importedBus;
      } catch {
        // Bus not available; use mock event generator
      }

      const enc = new TextEncoder();
      const unsubscribes: Array<() => void> = [];
      let mockCycle = 0;

      const send = (data: unknown) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // ignore encode errors, client likely disconnected
        }
      };

      // Confirm connection to client immediately.
      send({ type: 'connected', payload: { ts: new Date().toISOString() } });

      // Subscribe to real events if bus is available, otherwise generate mock events
      if (bus) {
        for (const eventType of EVENT_TYPES) {
          const off = bus.on(eventType, (payload: unknown) => {
            send({ type: eventType, payload });
          });
          unsubscribes.push(off);
        }
      } else {
        // Mock event generator - emit events every 3 seconds
        const mockGenerator = setInterval(() => {
          mockCycle++;
          const mockEvent = generateMockEvent(mockCycle);
          send(mockEvent);
        }, 3000);
        unsubscribes.push(() => clearInterval(mockGenerator));
      }

      // Heartbeat/ping every 15 seconds to prevent connection timeout
      const heartbeat = setInterval(() => send({ type: 'ping' }), 15_000);

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
