/**
 * Apply allocation endpoint — executes a queued allocation decision.
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // In production, emit an apply-allocation event to the orchestrator bus
  // For now, return a simulated success response

  return Response.json({
    success: true,
    campaignId,
    applied: true,
    message: 'Allocation applied to campaign',
    budgetShift: 5000,
    newBudget: 50000
  });
}
