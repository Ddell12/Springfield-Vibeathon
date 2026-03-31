import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Collection — Bridges",
};

// Dynamic import to defer to client — data-collection-screen uses hooks
import { DataCollectionScreen } from "@/features/data-collection/components/data-collection-screen";

interface CollectPageProps {
  params: Promise<{ id: string }>;
}

export default function CollectPage({ params }: CollectPageProps) {
  return <DataCollectionScreen paramsPromise={params} />;
}
