"use client";

import { use } from "react";

export function DataCollectionScreen({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = use(paramsPromise);
  return <div>Data Collection for patient {id}</div>;
}
