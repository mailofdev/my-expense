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
    <header className="dashboard-header">
      <BrandLogo size="sm" showTagline={false} className="dashboard-header__brand" />
      <div className="dashboard-header__user">
        <div className="dashboard-header__avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="dashboard-header__info">
          <span className="dashboard-header__greeting">Namaste,</span>
          <strong>{displayName}</strong>
        </div>
        <button
          type="button"
          className="btn btn--outline btn--sm"
          onClick={handleLogout}
          disabled={loading}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
