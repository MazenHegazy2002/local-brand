export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#534AB7]/20 border-t-[#534AB7] rounded-full animate-spin" />
        <div className="text-sm font-medium text-slate-500">Loading your dashboard…</div>
      </div>
    </div>
  );
}
