import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

const PublicRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    const dashboardMap = {
      admin:      '/admin/dashboard',
      instructor: '/instructor/dashboard',
      student:    '/student/dashboard',
    };
    return <Navigate to={dashboardMap[user?.role] || '/'} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
