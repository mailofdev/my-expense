import { useEffect, useState } from 'react';
import { APP_NAME } from '../../core/constants/brand';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('glow_money_pwa_dismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('glow_money_pwa_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 z-[1000] mx-auto max-w-md rounded border border-primary bg-surface p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(232,197,71,0.22)] sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
      <p className="m-0 mb-3 text-sm">
        <strong>Install {APP_NAME}</strong> on your phone for quick access
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn-primary btn-sm w-full sm:w-auto" onClick={handleInstall}>
          Install app
        </button>
        <button type="button" className="btn-outline btn-sm w-full sm:w-auto" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
