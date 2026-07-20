import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../../../shared/components/BrandLogo';
import { logout } from '../../auth/store/authSlice';

function getInitials(user) {
  const name = user?.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user?.email || '';
  return (email[0] || 'U').toUpperCase();
}

function ProfileIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.8-3.2 4.2-4.5 7-4.5s5.2 1.3 7 4.5" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const initials = getInitials(user);
  const displayName = user?.displayName?.trim() || 'Your account';
  const email = user?.email || '';

  return (
    <header className="sticky top-0 z-[200] border-b border-edge/60 bg-bg/95 px-4 py-3 backdrop-blur-sm pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex max-w-lg items-center justify-between sm:max-w-xl">
        <BrandLogo size="sm" className="!flex-row shrink-0" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              open
                ? 'bg-primary text-bg'
                : 'bg-surface-2 text-[#f0f4f2] hover:bg-primary/15 hover:text-primary'
            }`}
            onClick={() => setOpen((value) => !value)}
            aria-label="Open profile menu"
            aria-expanded={open}
            aria-haspopup="menu"
          >
            {user?.displayName || user?.email ? (
              <span aria-hidden="true">{initials}</span>
            ) : (
              <ProfileIcon />
            )}
          </button>

          {open && (
            <div
              className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-edge/80 bg-surface shadow-lg"
              role="menu"
            >
              <div className="border-b border-edge/60 px-4 py-3">
                <p className="m-0 truncate text-sm font-semibold text-[#f0f4f2]">{displayName}</p>
                {email && <p className="m-0 mt-1 truncate text-xs text-muted">{email}</p>}
              </div>
              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  className="btn-outline btn-sm w-full"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  {loading ? 'Signing out…' : 'Log out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
