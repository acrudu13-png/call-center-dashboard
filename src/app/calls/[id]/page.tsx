import { calls } from "@/lib/mockData";

export function generateStaticParams() {
  // Generate params for all mock calls (IDs 1-50)
  return Array.from({ length: 50 }, (_, i) => ({
    id: `${i + 1}`,
  }));
}

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CallDetailClient params={params} />;
}
