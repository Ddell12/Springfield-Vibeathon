import type { Metadata } from "next";

import { HomeProgramPrint } from "@/features/patients/components/home-program-print";

export const metadata: Metadata = {
  title: "Print Home Program — Bridges",
};

interface PrintPageProps {
  params: Promise<{ id: string; programId: string }>;
}

export default function PrintPage({ params }: PrintPageProps) {
  return <HomeProgramPrint paramsPromise={params} />;
}
