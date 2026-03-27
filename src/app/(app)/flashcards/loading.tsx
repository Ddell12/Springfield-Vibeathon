export default function FlashcardsLoading() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="animate-pulse h-8 bg-surface-container-low rounded-xl w-36" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse h-40 bg-surface-container-low rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
