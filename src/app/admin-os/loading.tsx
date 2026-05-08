export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
        <div className="text-sm font-medium text-slate-500">Loading Admin OS…</div>
      </div>
    </div>
  );
}
