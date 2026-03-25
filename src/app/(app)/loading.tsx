export default function AppLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-container-high border-t-primary" />
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    </div>
  );
}
