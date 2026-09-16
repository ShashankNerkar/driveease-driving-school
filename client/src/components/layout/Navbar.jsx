import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const dashboardFor = (role) => ({
  student: '/student/dashboard',
  instructor: '/instructor/dashboard',
  admin: '/admin/dashboard',
}[role] || '/');

const navItems = [
  ['Courses', '/courses'], 
  ['Instructors', '/instructors'], 
  ['Reviews', '/reviews'],
];

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = () => setIsOpen(false);
  const handleLogout = async () => {
    closeMenu();
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="container flex min-h-16 items-center justify-between gap-4">
        <Link to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-2" aria-label="DriveEase home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 font-bold text-white">D</span>
          <span className="text-xl font-bold tracking-tight text-gray-900">DriveEase</span>
        </Link>

        <button type="button" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen} aria-controls="public-navigation" className="btn-ghost px-2 md:hidden">
          <span className="sr-only">Toggle navigation</span>
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>

        <div id="public-navigation" className={`${isOpen ? 'flex' : 'hidden'} absolute left-0 right-0 top-full flex-col gap-1 border-b border-gray-200 bg-white p-4 shadow-lg md:static md:flex md:flex-1 md:flex-row md:items-center md:justify-between md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <nav className="flex flex-col gap-1 md:flex-row md:items-center md:gap-1" aria-label="Public navigation">
            {navItems.map(([label, to]) => (
              <NavLink key={to} to={to} onClick={closeMenu} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 md:mt-0 md:flex-row md:items-center">
            {isAuthenticated ? <>
              <Link to={dashboardFor(user?.role)} onClick={closeMenu} className="btn-secondary">Dashboard</Link>
              <button type="button" onClick={handleLogout} className="btn-ghost">Log out</button>
            </> : <>
              <Link to="/login" onClick={closeMenu} className="btn-ghost">Log in</Link>
              <Link to="/register" onClick={closeMenu} className="btn-primary">Get started</Link>
            </>}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
