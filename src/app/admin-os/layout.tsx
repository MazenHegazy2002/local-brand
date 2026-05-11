export default function AdminOsLayout({ children }: { children: React.ReactNode }) {
  // The admin-os page owns its own flex layout (sticky sidebar + scrollable
  // content). We keep this wrapper transparent so it doesn't introduce an
  // extra scroll container.
  return <>{children}</>;
}
