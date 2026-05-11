export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // The dashboard page (/dashboard/page.tsx) sets its own `height: 100dvh`
  // viewport-fit layout. We just keep this wrapper transparent so it
  // doesn't add any extra scroll containers or padding.
  return <>{children}</>;
}
