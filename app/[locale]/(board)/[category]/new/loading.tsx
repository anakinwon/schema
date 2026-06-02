export default function NewPostLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-20 bg-gray-200 rounded mb-4" />
      <div className="bg-white rounded border border-gray-200 p-6 space-y-4">
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-48 bg-gray-100 rounded" />
        <div className="flex justify-end gap-2">
          <div className="h-9 w-16 bg-gray-100 rounded" />
          <div className="h-9 w-16 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  )
}
