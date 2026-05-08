'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'local-brand-pwa-install-dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed?
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay showing the prompt so it's not intrusive
      setTimeout(() => setVisible(true), 10000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[59] bg-white rounded-2xl shadow-2xl p-5 border border-gray-200 animate-slideUp"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-2xl bg-[#1e3b8a] flex items-center justify-center shrink-0 text-2xl">
          📱
        </div>
        <div className="flex-1">
          <h3 className="font-black text-gray-900 text-sm">Install Local Brand</h3>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            Get faster checkout, exclusive deals, and push notifications — installs like a native app.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleDismiss}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 px-4 py-2 bg-[#1e3b8a] text-white rounded-xl text-xs font-bold hover:bg-[#152c6e]"
        >
          Install App
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
