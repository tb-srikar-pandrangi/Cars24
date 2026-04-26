/**
 * CreativeScorerAgent — evaluates active ad creatives for CARS24 trust signals,
 * price anchors, geo personalisation, and urgency cues; suggests improved variants
 * via LLM for any creative whose overallScore falls below the swap threshold.
 * Hot-path: O(a) where a = active creatives fetched (≤ 500 per run).
 */
import type { AgentEvent, CreativeScore } from '@cars24/shared';
import type { AgentContext } from './types.js';

export async function* creativeScorerAgent(
  ctx: AgentContext,
): AsyncGenerator<AgentEvent, void, unknown> {
  // TODO: SELECT active creatives from creative_assets table via ctx.sql
  // TODO: run regex heuristics for TRUST_SIGNALS, URGENCY_SIGNALS from @cars24/shared/constants
  // TODO: check geoPersonalised by matching geo slug against ad copy
  // TODO: call Anthropic API (claude-sonnet-4-6) to score hookScore / bodyScore / ctaScore
  // TODO: for overallScore < CREATIVE_SCORE_SWAP_THRESHOLD, call LLM for CreativeVariant
  // TODO: yield 'creative_improved' event alongside 'creative_scored' for low-scorers

  const scores: CreativeScore[] = [];

  for (const score of scores) {
    yield { type: 'creative_scored', payload: score };

    if (score.suggestedVariant !== undefined) {
      yield {
        type: 'creative_improved',
        payload: {
          adId: score.adId,
          funnel: score.funnel,
          original: {
            headline: '',
            body: '',
            cta: '',
            rationale: 'original creative before improvement',
          },
          variant: score.suggestedVariant,
        },
      };
    }
  }
}
