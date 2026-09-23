import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';

export default function AdminRoute({ children }) {
  const { isAuthenticated, initializing, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (initializing) {
    return <LoadingSpinner message="Loading…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
