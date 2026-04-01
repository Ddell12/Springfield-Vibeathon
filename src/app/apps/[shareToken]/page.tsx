import { fetchQuery } from "convex/nextjs";

import { api } from "@convex/_generated/api";
import { ToolRuntimePage } from "@/features/tools/components/runtime/tool-runtime-page";

interface Props {
  params: Promise<{ shareToken: string }>;
}

export default async function AppRuntimePage({ params }: Props) {
  const { shareToken } = await params;
  const result = await fetchQuery(api.tools.getByShareToken, { shareToken });

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground p-8 text-center">
        <div>
          <p className="text-lg font-medium">App not found</p>
          <p className="text-sm mt-1">This app link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <ToolRuntimePage
      shareToken={shareToken}
      templateType={result.instance.templateType}
      configJson={result.configJson}
    />
  );
}
