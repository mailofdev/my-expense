import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { normalizeRole } from '../auth/services/authService';
import DashboardTabs from '../dashboard/components/DashboardTabs';
import DashboardHeader from '../dashboard/components/DashboardHeader';
import AdminRoute from './components/AdminRoute';

jest.mock('../../core/config/firebase', () => ({
  auth: {},
  db: {},
}));

jest.mock('../../shared/theme/ThemeProvider', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: () => {} }),
}));

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/admin' }),
    Navigate: ({ to }) => require('react').createElement('p', null, `Redirect ${to}`),
  }),
  { virtual: true }
);

function storeFor(role) {
  return configureStore({
    reducer: {
      auth: (
        state = {
          user: role ? { role, displayName: 'Patil', email: 'patil@example.com' } : null,
          isAuthenticated: Boolean(role),
          initializing: false,
          loading: false,
        }
      ) => state,
    },
  });
}

function renderTabs(role) {
  return render(
    <Provider store={storeFor(role)}>
      <DashboardTabs activeTab="overview" onTabChange={() => {}} />
    </Provider>
  );
}

function renderHeader(role) {
  return render(
    <Provider store={storeFor(role)}>
      <DashboardHeader />
    </Provider>
  );
}

function renderAdminRoute(role) {
  return render(
    <Provider store={storeFor(role)}>
      <AdminRoute>
        <h1>Users</h1>
      </AdminRoute>
    </Provider>
  );
}

describe('admin access', () => {
  test('treats only an admin role string as admin', () => {
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole(' Admin ')).toBe('admin');
    expect(normalizeRole('user')).toBe('user');
    expect(normalizeRole('')).toBe('user');
    expect(normalizeRole(undefined)).toBe('user');
  });

  test('shows the Admin tab only for an admin', () => {
    const { unmount } = renderTabs('admin');
    expect(screen.getByRole('tab', { name: 'Admin' })).toBeInTheDocument();
    unmount();

    renderTabs('user');
    expect(screen.queryByRole('tab', { name: 'Admin' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Today' })).toBeInTheDocument();
  });

  test('shows the profile Admin item only for an admin', () => {
    const { unmount } = renderHeader('admin');
    userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    expect(screen.getByRole('menuitem', { name: 'Admin' })).toBeInTheDocument();
    unmount();

    renderHeader('user');
    userEvent.click(screen.getByRole('button', { name: 'Open profile menu' }));
    expect(screen.queryByRole('menuitem', { name: 'Admin' })).not.toBeInTheDocument();
  });

  test('opens the admin screen only for an admin', () => {
    const { unmount } = renderAdminRoute('admin');
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    unmount();

    renderAdminRoute('user');
    expect(screen.getByText('Redirect /dashboard')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Users' })).not.toBeInTheDocument();
  });
});
