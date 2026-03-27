export default function SettingsLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 max-w-2xl">
      <div className="animate-pulse h-8 bg-surface-container-low rounded-xl w-32" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse h-16 bg-surface-container-low rounded-xl" />
        ))}
      </div>
    </div>
  );
}
