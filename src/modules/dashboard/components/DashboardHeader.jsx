import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../../../shared/components/BrandLogo';
import { logout } from '../../auth/store/authSlice';

export default function DashboardHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, loading } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  const displayName = user?.displayName || 'User';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-[200] flex flex-wrap items-center justify-between gap-3 border-b border-edge bg-surface/90 px-4 py-3 backdrop-blur-md pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
      <BrandLogo size="sm" className="!flex-row shrink-0" />
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-primary"
          aria-hidden="true"
        >
          {initials}
        </div>
        <div className="hidden flex-col text-sm sm:flex">
          <span className="text-xs text-muted">Namaste,</span>
          <strong className="max-w-[120px] truncate sm:max-w-[160px]">{displayName}</strong>
        </div>
        <button type="button" className="btn-outline btn-sm" onClick={handleLogout} disabled={loading}>
          Logout
        </button>
      </div>
    </header>
  );
}
