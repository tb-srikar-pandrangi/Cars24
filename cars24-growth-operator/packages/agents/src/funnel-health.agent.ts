/**
 * FunnelHealthAgent — computes per-campaign stage conversion rates and flags
 * any stage whose rate has dropped below internal benchmarks by the configured threshold.
 * Hot-path: O(n * 3) = O(n) where n = campaigns; 3 stages are checked per campaign.
 */
import type { AgentEvent, CampaignMetrics, FunnelHealth } from '@cars24/shared';
import type { AgentContext } from './types.js';

export async function* funnelHealthAgent(
  ctx: AgentContext,
  metrics: CampaignMetrics[],
): AsyncGenerator<AgentEvent, void, unknown> {
  // TODO: import SELL_BENCHMARKS / BUY_BENCHMARKS from @cars24/shared
  // TODO: for each campaign, compute leadToAppointmentRate = appointments / leads
  // TODO: compute appointmentToInspectionRate (requires inspection count from DB)
  // TODO: compute inspectionToTransactionRate = transactions / inspections
  // TODO: compare each rate against benchmark, compute dropPct, assign severity
  // TODO: yield individual 'alert' events for critical stages before the batch

  const health: FunnelHealth[] = [];

  yield { type: 'funnel_health', payload: health };
}
