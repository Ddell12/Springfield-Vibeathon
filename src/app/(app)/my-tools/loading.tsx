export default function MyToolsLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="animate-pulse h-8 bg-surface-container-low rounded-xl w-32" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse h-64 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
