"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { MyToolsPage } from "@/features/my-tools/components/my-tools-page";
import { TemplatesPage } from "@/features/templates/components/templates-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "my-apps";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Library</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Apps you&apos;ve built and templates to start from</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => router.replace(`/library?tab=${v}&page=1`, { scroll: false })}
      >
        <TabsList>
          <TabsTrigger value="my-apps">My Apps</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="my-apps">
          <MyToolsPage embedded />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
