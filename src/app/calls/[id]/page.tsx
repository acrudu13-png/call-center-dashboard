import CallDetailClient from "./CallDetailClient";

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CallDetailClient params={params} />;
}
