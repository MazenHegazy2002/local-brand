export default function AdminOsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {children}
    </div>
  );
}
