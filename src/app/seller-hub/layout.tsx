export default function SellerHubLayout({ children }: { children: React.ReactNode }) {
  // The seller hub page sets its own `height: 100dvh; display: flex` layout.
  // We keep this wrapper transparent so it doesn't introduce a second
  // scrolling container.
  return <>{children}</>;
}
