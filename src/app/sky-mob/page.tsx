import { getServerTr } from '@/lib/i18n/server';
export default async function SkyMobPage() {
  const tr = await getServerTr();
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 20 }}>{tr('Sky Mob')}</h1>
      <p style={{ color: '#6B7280', fontSize: 16, marginBottom: 40 }}>
        {tr('Mobile-first shopping experience with swipeable product cards.')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className="transition-transform duration-200 hover:scale-[1.02]"
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #E5E7EB',
              padding: 20,
              cursor: 'pointer',
              background: '#fff',
            }}
          >
            <div
              style={{
                height: 200,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 48,
              }}
            >
              📱
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
              {tr('Sky Product')} {i}
            </h3>
            <p style={{ color: '#6B7280', fontSize: 14, marginBottom: 12 }}>
              {tr('Discover amazing features and benefits of this product.')}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>$99</span>
              <button
                style={{
                  background: '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {tr('Add to Cart')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
