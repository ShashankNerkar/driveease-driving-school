import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="card max-w-md w-full text-center space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500">The page you requested does not exist.</p>
      <Link to="/" className="btn-primary inline-flex">Back to home</Link>
    </div>
  </div>
);

export default NotFound;
