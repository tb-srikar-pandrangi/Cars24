/**
 * Force diagnose endpoint — triggers immediate diagnosis for a campaign.
 */
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // In production, emit a force-diagnose event to the orchestrator bus
  // For now, return a simulated success response

  return Response.json({
    success: true,
    campaignId,
    queued: true,
    message: 'Diagnosis queued for campaign',
    estimatedWaitMs: 1500
  });
}
