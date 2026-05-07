'use client';

import { useState, useEffect } from 'react';

interface CookieConsentProps {
  privacyPolicyUrl?: string;
  className?: string;
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

export function CookieConsent({ privacyPolicyUrl = '/privacy', className = '' }: CookieConsentProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    const consent: CookiePreferences = { necessary: true, analytics: true, marketing: true };
    setPreferences(consent);
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setShowBanner(false);
  };

  const rejectAll = () => {
    const consent: CookiePreferences = { necessary: true, analytics: false, marketing: false };
    setPreferences(consent);
    localStorage.setItem('cookie-consent', JSON.stringify(consent));
    setShowBanner(false);
  };

  const savePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    setShowBanner(false);
    setShowPreferences(false);
  };

  if (!showBanner) return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${className}`}>
      <div className="max-w-4xl mx-auto bg-white rounded-[var(--radius)] shadow-2xl border border-gray-100 p-6">
        {!showPreferences ? (
          <>
            <div className="flex items-start gap-4">
              <div className="text-4xl">🍪</div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-900 mb-2">We use cookies</h3>
                <p className="text-sm text-gray-600 mb-4">
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                  By clicking "Accept All", you consent to our use of cookies.
                </p>
                {privacyPolicyUrl && (
                  <a href={privacyPolicyUrl} className="text-sm text-[hsl(var(--primary))] hover:underline">
                    Read our Privacy Policy
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowPreferences(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Preferences
              </button>
              <button
                onClick={rejectAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] hover:opacity-90 rounded-lg transition-colors"
              >
                Accept All
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="font-bold text-lg text-gray-900 mb-4">Cookie Preferences</h3>
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={preferences.necessary} disabled className="w-4 h-4 rounded" />
                <div>
                  <span className="font-medium text-sm text-gray-900">Necessary</span>
                  <p className="text-xs text-gray-500">Required for the website to function properly.</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <span className="font-medium text-sm text-gray-900">Analytics</span>
                  <p className="text-xs text-gray-500">Help us understand how visitors interact with our website.</p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <span className="font-medium text-sm text-gray-900">Marketing</span>
                  <p className="text-xs text-gray-500">Used to deliver personalized advertisements.</p>
                </div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPreferences(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                className="px-4 py-2 text-sm font-medium text-white bg-[hsl(var(--primary))] hover:opacity-90 rounded-lg"
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CookieConsent;