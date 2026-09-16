import { Link } from 'react-router-dom';

const Unauthorized = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="card max-w-md w-full text-center space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Access denied</h1>
      <p className="text-sm text-gray-500">
        You do not have permission to view this page.
      </p>
      <Link to="/" className="btn-primary inline-flex">Back to home</Link>
    </div>
  </div>
);

export default Unauthorized;
