import { FunnelDetail } from '@/components/FunnelDetail';

export default async function FunnelDetailPage({ params }: { params: Promise<{ funnel: string }> }) {
  const { funnel } = await params;
  return <FunnelDetail funnel={funnel.toUpperCase()} />;
}
