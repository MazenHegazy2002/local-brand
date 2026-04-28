export default function FreshSalesPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>Fresh Sales</h1>
      <p style={{ color: '#6B7280', fontSize: 16, marginBottom: 40 }}>Discover our latest deals and promotions.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E7EB', padding: 20 }}>
            <div style={{ background: '#F3F4F6', aspectRatio: '1', borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
              Product {i}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Fresh Deal {i}</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>$99</span>
              <span style={{ fontSize: 14, color: '#9CA3AF', textDecoration: 'line-through' }}>$149</span>
              <span style={{ fontSize: 12, background: '#FEE2E2', color: '#DC2626', padding: '2px 8px', borderRadius: 4 }}>33% OFF</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
