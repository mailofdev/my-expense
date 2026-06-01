import { useEffect, useState } from 'react';
import { APP_NAME } from '../../core/constants/brand';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('glowmoney_pwa_dismissed') === '1'
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
    localStorage.setItem('glowmoney_pwa_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="install-pwa">
      <p>
        <strong>Install {APP_NAME}</strong> on your phone for quick access
      </p>
      <div className="install-pwa__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={handleInstall}>
          Install app
        </button>
        <button type="button" className="btn btn--outline btn--sm" onClick={handleDismiss}>
          Not now
        </button>
      </div>
    </div>
  );
}
