import { BuilderLayout } from "@/features/builder/components/builder-layout";

export default function BuilderPage() {
  return (
    <BuilderLayout
      chatPanel={<div className="p-4 text-muted-foreground">Chat coming soon</div>}
      previewPanel={<div className="p-4 text-muted-foreground">Preview coming soon</div>}
    />
  );
}
