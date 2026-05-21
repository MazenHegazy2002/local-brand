// Maintenance page — shown when MAINTENANCE_MODE is on.
// Reads the custom MAINTENANCE_MESSAGE from the settings registry.
import { getSetting } from '@/lib/admin-settings-registry';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  // If we hit this page but the flag is off, don't trap the user — show
  // them a normal "redirecting…" message instead of a maintenance error.
  const isOn = await getSetting<boolean>('MAINTENANCE_MODE');
  const message = await getSetting<string>('MAINTENANCE_MESSAGE');
  const storeName = await getSetting<string>('STORE_NAME');

  return (
    <main className="m-shell">
      <div className="m-card">
        <div className="m-emoji">🛠️</div>
        <h1 className="m-title">{isOn ? 'Back soon' : 'Site is online'}</h1>
        <p className="m-msg">
          {isOn ? message : `The ${storeName} site is now online. Refresh to continue.`}
        </p>
        {!isOn && (
          <a href="/" className="m-cta">
            Go to {storeName}
          </a>
        )}
      </div>

      <style>{`
        .m-shell {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 24px;
        }
        .m-card {
          max-width: 480px; padding: 48px 32px; background: #fff;
          border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,0.1);
          text-align: center;
        }
        .m-emoji { font-size: 64px; margin-bottom: 16px; }
        .m-title { font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }
        .m-msg { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
        .m-cta {
          display: inline-block; padding: 12px 28px;
          background: #534AB7; color: #fff; font-weight: 600;
          border-radius: 8px; text-decoration: none;
        }
      `}</style>
    </main>
  );
}
