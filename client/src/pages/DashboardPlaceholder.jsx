import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardPlaceholder = ({ role }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="card max-w-lg w-full space-y-4 text-center">
        <h1 className="text-xl font-semibold text-gray-900 capitalize">{role} dashboard</h1>
        <p className="text-sm text-gray-500">
          Signed in as {user?.name} ({user?.email})
        </p>
        <p className="text-xs text-gray-400">
          This is an authentication shell only. Business modules are not part of this phase.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="btn-secondary">Home</Link>
          <button type="button" onClick={handleLogout} className="btn-primary">
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
