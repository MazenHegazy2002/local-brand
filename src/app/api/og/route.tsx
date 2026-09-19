import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const title = searchParams.get('title') || 'Brandy — Egyptian Local Brands';
    const price = searchParams.get('price');
    const brand = searchParams.get('brand');
    const category = searchParams.get('category');
    const badge = searchParams.get('badge') || 'Egyptian Local Marketplace';

    // Truncate title if too long
    const displayTitle = title.length > 70 ? `${title.slice(0, 67)}...` : title;

    return new ImageResponse(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0f1d',
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(30, 59, 138, 0.45) 0%, transparent 60%), radial-gradient(circle at 75% 75%, rgba(217, 119, 6, 0.2) 0%, transparent 60%)',
          padding: '56px 64px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          color: '#ffffff',
          boxSizing: 'border-box',
        }}
      >
        {/* Header row: Brand Logo + Country Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 900,
                color: '#ffffff',
                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.35)',
              }}
            >
              B
            </div>
            <span
              style={{
                fontSize: '32px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              Brandy
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontSize: '15px',
              fontWeight: 600,
              color: '#cbd5e1',
            }}
          >
            <span>🇪🇬</span>
            <span>{badge}</span>
          </div>
        </div>

        {/* Center content: Category/Brand tag + Title + Price */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            maxWidth: '920px',
          }}
        >
          {(brand || category) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '18px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#f59e0b',
              }}
            >
              {brand && <span>Verified Brand: {brand}</span>}
              {brand && category && <span>•</span>}
              {category && <span>{category}</span>}
            </div>
          )}

          <div
            style={{
              fontSize: displayTitle.length > 40 ? '48px' : '56px',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.025em',
              color: '#f8fafc',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            }}
          >
            {displayTitle}
          </div>

          {price && (
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '44px',
                  fontWeight: 900,
                  color: '#10b981',
                }}
              >
                {price}
              </span>
              <span
                style={{
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#94a3b8',
                }}
              >
                EGP
              </span>
              <span
                style={{
                  marginLeft: '12px',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#34d399',
                }}
              >
                Best Price Guarantee
              </span>
            </div>
          )}
        </div>

        {/* Footer bar: Escrow & Shipping guarantees */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '15px',
            fontWeight: 600,
            color: '#94a3b8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛡️</span> 14-Day Escrow Buyer Protection
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚚</span> Fast Delivery Across All Egypt
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💵</span> Cash on Delivery Available
            </span>
          </div>

          <div style={{ color: '#60a5fa', fontWeight: 700 }}>brandyy.shop</div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e) {
    console.error('Failed to generate OG image:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
