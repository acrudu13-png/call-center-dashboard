import { Suspense } from "react";
import CallDetailClient from "./CallDetailClient";

export default function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense>
      <CallDetailClient params={params} />
    </Suspense>
  );
}
