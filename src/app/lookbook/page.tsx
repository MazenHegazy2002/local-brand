export default function LookbookPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>Lookbook</h1>
      <p style={{ color: '#6B7280', fontSize: 16 }}>Discover our latest fashion looks and styles.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginTop: 40 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ borderRadius: 12, overflow: 'hidden', background: '#F3F4F6', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
            Look {i}
          </div>
        ))}
      </div>
    </div>
  );
}
