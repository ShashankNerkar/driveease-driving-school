import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const GuestPrompt = ({ title = 'Ready to start learning?', description = 'Create an account to begin your driving journey with DriveEase.', className = '' }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return null;
  return (
    <aside className={`rounded-xl bg-primary-700 p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 ${className}`}>
      <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-primary-100">{description}</p></div>
      <Link to="/register" className="mt-4 inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 sm:mt-0">Create account</Link>
    </aside>
  );
};

export default GuestPrompt;
