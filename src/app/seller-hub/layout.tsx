export default function SellerHubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      overflowX: 'hidden',
      overflowY: 'auto',
      display: 'flex',
    }}>
      {children}
    </div>
  );
}
