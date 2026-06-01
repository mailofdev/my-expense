import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import ProtectedRoute from '../shared/components/ProtectedRoute';
import GuestRoute from '../shared/components/GuestRoute';
import { initAuthListener } from '../modules/auth/store/authSlice';
import { authRoutes } from '../modules/auth/routes';
import { dashboardRoutes } from '../modules/dashboard/routes';
import InstallPWA from '../shared/components/InstallPWA';
import './App.css';
import './dashboard-ui.css';
import './responsive.css';

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = dispatch(initAuthListener());
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [dispatch]);

  return (
    <BrowserRouter>
      <InstallPWA />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {authRoutes.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={<GuestRoute>{element}</GuestRoute>}
          />
        ))}

        {dashboardRoutes.map(({ path, element, protected: isProtected }) => (
          <Route
            key={path}
            path={path}
            element={
              isProtected ? <ProtectedRoute>{element}</ProtectedRoute> : element
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
