import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { APP_NAME } from '../../core/constants/brand';

const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const DISMISS_KEY = 'glow_money_pwa_dismissed';
const SNOOZE_KEY = 'glow_money_pwa_snooze_until';

export default function InstallPWA() {
  const location = useLocation();
  const expenses = useSelector((state) => state.dashboard?.expenses);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [hidden, setHidden] = useState(() => {
    if (localStorage.getItem(DISMISS_KEY) === '1') return true;
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0);
    return until > Date.now();
  });

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const onDashboard = location.pathname.startsWith('/dashboard');
  const hasExpense = Array.isArray(expenses) && expenses.length > 0;

  if (!onDashboard || !hasExpense || !deferredPrompt || hidden) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
    setHidden(true);
  };

  return (
    <div className="fixed bottom-[calc(6.25rem+env(safe-area-inset-bottom))] left-4 right-4 z-[1000] mx-auto max-w-md rounded-lg border border-primary/30 bg-surface p-4 shadow-dock sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
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
