import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate('/', { replace: true }); };
  const links = [['Dashboard', '/student/dashboard'], ['Book Slot', '/student/slots'], ['My Bookings', '/student/bookings'], ['Reviews', '/student/reviews'], ['Profile', '/student/profile']];
  return <div className="min-h-screen bg-gray-50"><header className="border-b border-gray-200 bg-white"><div className="container flex min-h-16 items-center justify-between gap-4"><NavLink to="/" className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 font-bold text-white">D</span><span className="text-xl font-bold text-gray-900">DriveEase</span></NavLink><div className="flex items-center gap-3"><span className="hidden text-sm text-gray-600 sm:block">{user?.name}</span><button type="button" onClick={handleLogout} className="btn-ghost">Log out</button></div></div></header><div className="container flex flex-col gap-6 py-6 lg:flex-row"><aside className="shrink-0 lg:w-56"><nav aria-label="Student navigation" className="flex gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 lg:flex-col">{links.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>{label}</NavLink>)}</nav></aside><main className="min-w-0 flex-1"><Outlet /></main></div></div>;
};

export default StudentLayout;
