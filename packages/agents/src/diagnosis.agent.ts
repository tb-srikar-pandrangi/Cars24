/**
 * DiagnosisAgent — cross-references funnel health with competitor keyword share data,
 * maps stage dropoffs to structured Issue objects, and generates Action recommendations.
 * Hot-path: O(n * s) where n = campaigns, s = stages per funnel (≤ 3).
 */
import type { AgentEvent, FunnelHealth, DiagnosisResult } from '@cars24/shared';
import type { AgentContext } from './types.js';

export async function* diagnosisAgent(
  ctx: AgentContext,
  funnelHealth: FunnelHealth[],
): AsyncGenerator<AgentEvent, void, unknown> {
  // TODO: query competitor_keyword_share table via ctx.sql to detect impression share loss
  // TODO: map each StageDropoff to an Issue with a code (e.g. "SELL_APPT_DROP_CRITICAL")
  // TODO: generate Action[] from Issue patterns — one action per issue, sorted by estimatedCmaImpact
  // TODO: set competitorPressure = true if any competitor appears in the same geo+funnel keywords
  // TODO: yield 'alert' immediately for severity === 'critical' before the final batch

  const diagnoses: DiagnosisResult[] = [];

  for (const result of diagnoses) {
    if (result.severity === 'critical') {
      yield { type: 'alert', payload: result };
    }
  }

  yield { type: 'diagnosis_ready', payload: diagnoses };
}
