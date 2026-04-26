/**
 * Status endpoint — returns current state snapshots.
 * Cached 15s via HTTP caching (stale-while-revalidate pattern for SSR).
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In production, this would query the orchestrator's state snapshots.
// For now, return mock data with realistic structure.
export async function GET(_req: NextRequest) {
  const mockDiagnosisResults = [
    {
      campaignId: 'camp_001',
      funnel: 'SELL' as const,
      geo: 'bengaluru',
      issues: [
        { stage: 'click_to_lead', dropoffRate: 0.15, severity: 'warning' as const, description: 'CTL dropoff 15% vs benchmark 3%' }
      ],
      recommendedActions: [
        { action: 'increase_bid', estimatedCmaImpact: 500, reason: 'Low impressions relative to budget' }
      ]
    }
  ];

  const mockMetrics = [
    {
      campaignId: 'camp_001',
      funnel: 'SELL' as const,
      platform: 'meta' as const,
      geo: 'bengaluru',
      impressions: 50000,
      clicks: 1250,
      spend: 45000,
      leads: 38,
      appointments: 17,
      transactions: 10,
      loanApplications: 0,
      cpl: 1184,
      cpa: 2647,
      cpt: 4500,
      cma: 2353,
      roas: 2.1
    }
  ];

  const mockAllocations = [
    {
      campaignId: 'camp_001',
      funnel: 'SELL' as const,
      geo: 'bengaluru',
      decision: {
        type: 'reallocate_geo' as const,
        newBudget: 50000,
        shift: 5000,
        reason: 'Higher ROAS in SELL funnel'
      },
      timestamp: new Date().toISOString()
    }
  ];

  return Response.json({
    diagnosis: mockDiagnosisResults,
    metrics: mockMetrics,
    allocations: mockAllocations
  }, {
    headers: {
      'Cache-Control': 'public, max-age=15, stale-while-revalidate=60'
    }
  });
}
