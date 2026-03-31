"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { MyToolsPage } from "@/features/my-tools/components/my-tools-page";
import { TemplatesPage } from "@/features/templates/components/templates-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

export function LibraryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get("tab") ?? "templates";

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Library</h1>
        <p className="text-sm text-on-surface-variant mt-1">Templates to start from and apps you&apos;ve built</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => router.replace(`/library?tab=${v}`)}
      >
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="my-apps">My Apps</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <TemplatesPage embedded />
        </TabsContent>
        <TabsContent value="my-apps">
          <MyToolsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
