import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import BrandLogo from '../../../shared/components/BrandLogo';
import { logout } from '../../auth/store/authSlice';

export default function DashboardHeader() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-[200] border-b border-edge/60 bg-bg/95 px-4 py-3 backdrop-blur-sm pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6">
      <div className="mx-auto flex max-w-lg items-center justify-between sm:max-w-xl">
        <BrandLogo size="sm" className="!flex-row shrink-0" />
        <button
          type="button"
          className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-surface-2 hover:text-[#f0f4f2]"
          onClick={handleLogout}
          disabled={loading}
        >
          Log out
        </button>
      </div>
    </header>
  );
}
