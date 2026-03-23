export default function ToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <h1 className="text-2xl font-semibold text-muted">Tool View</h1>
    </div>
  );
}
