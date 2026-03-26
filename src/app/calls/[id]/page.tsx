import { calls } from "@/lib/mockData";
import CallDetailClient from "./CallDetailClient";

export function generateStaticParams() {
  return calls.map((call) => ({ id: call.id }));
}

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CallDetailClient params={params} />;
}
