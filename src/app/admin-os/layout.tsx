export default function AdminOsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      margin: 0,
      padding: 0,
    }}>
      {children}
    </div>
  );
}
