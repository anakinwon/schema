export default function CategoryLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-32 bg-gray-200 rounded" />
        <div className="h-8 w-20 bg-gray-200 rounded" />
      </div>
      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3 bg-gray-50">
          <div className="h-4 w-full bg-gray-200 rounded" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b border-gray-100 px-4 py-3 flex gap-4">
            <div className="h-4 w-8 bg-gray-100 rounded" />
            <div className="h-4 flex-1 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
            <div className="h-4 w-10 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
