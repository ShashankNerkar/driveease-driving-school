import { Link, Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const PublicLayout = () => (
  <div className="flex min-h-screen flex-col bg-gray-50">
    <Navbar />
    <main className="flex-1"><Outlet /></main>
    <footer className="border-t border-gray-200 bg-white">
      <div className="container flex flex-col gap-3 py-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} DriveEase. Learn to drive with confidence.</span>
        <div className="flex gap-4"><Link to="/rules" className="hover:text-primary-600">Road rules</Link><Link to="/traffic-signs" className="hover:text-primary-600">Traffic signs</Link><Link to="/license-prep" className="hover:text-primary-600">Licence prep</Link></div>
      </div>
    </footer>
  </div>
);

export default PublicLayout;
