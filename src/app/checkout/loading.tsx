export default function Loading() {
  return (
    <div className="min-h-screen bg-[#f9f8f6]">
      <div className="container mx-auto px-4 py-8">
        <div className="w-48 h-8 bg-slate-200 animate-pulse rounded mb-8" />
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="w-full lg:w-2/3 space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
                <div className="space-y-3">
                  <div className="h-10 bg-slate-100 rounded" />
                  <div className="h-10 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
          <div className="w-full lg:w-1/3">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
              <div className="h-6 w-32 bg-slate-200 rounded mb-4" />
              <div className="space-y-3">
                <div className="h-14 bg-slate-100 rounded" />
                <div className="h-14 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
