import DashboardPage from './pages/DashboardPage';

export const dashboardRoutes = [
  {
    path: '/dashboard',
    element: <DashboardPage />,
    protected: true,
  },
];
