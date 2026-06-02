export default function PostDetailLoading() {
  return (
    <div className="animate-pulse bg-white rounded border border-gray-200 p-6 space-y-4">
      <div className="h-7 w-3/4 bg-gray-200 rounded" />
      <div className="flex gap-4">
        <div className="h-4 w-24 bg-gray-100 rounded" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
      <div className="border-t border-gray-100 pt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-100 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  )
}
