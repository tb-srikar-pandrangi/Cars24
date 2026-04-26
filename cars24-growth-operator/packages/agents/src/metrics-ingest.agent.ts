/**
 * MetricsIngestAgent — fetches campaign data from Meta Graph API and Google Ads API,
 * normalises responses to CampaignMetrics, upserts into Postgres, then yields the batch.
 * Hot-path: O(n) where n = active campaigns across platforms (typically 50–200 per geo).
 */
import type { AgentEvent, CampaignMetrics } from '@cars24/shared';
import type { AgentContext } from './types.js';

export async function* metricsIngestAgent(
  ctx: AgentContext,
): AsyncGenerator<AgentEvent, void, unknown> {
  const { params } = ctx;

  try {
    // TODO: call Meta Graph API — /act_{AD_ACCOUNT_ID}/insights
    // TODO: call Google Ads API — CampaignService.SearchStream
    // TODO: normalise both responses to CampaignMetrics shape
    // TODO: upsert rows into campaign_metrics table via ctx.sql
    // TODO: filter by params.funnels and params.geos if provided

    const metrics: CampaignMetrics[] = [];

    yield { type: 'metrics_ready', payload: metrics };
  } catch (err) {
    yield {
      type: 'ingest_error',
      payload: {
        source: 'metrics-ingest',
        error: err instanceof Error ? err.message : String(err),
        stale: false,
      },
    };
  }
}
