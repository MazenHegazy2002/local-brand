export default function AdminOsLayout({ children }: { children: React.ReactNode }) {
  // The admin-os page sets its own `height: 100dvh; display: flex` layout.
  // We keep this wrapper transparent so it doesn't introduce a second
  // scrolling container.
  return <>{children}</>;
}
