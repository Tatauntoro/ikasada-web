export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full animate-pulse">
      <div className="h-10 bg-[#f2f2f4] rounded-xl mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-14 bg-[#f2f2f4] rounded-xl mb-2"
          style={{ opacity: 1 - i * 0.1 }}
        />
      ))}
    </div>
  );
}
