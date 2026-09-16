import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = [
    ['Dashboard', '/admin/dashboard'],
  ];
  const leave = async () => { await logout(); navigate('/', { replace: true }); };
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="container flex min-h-16 items-center justify-between gap-4">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 font-bold text-white">D</span>
            <span className="text-xl font-bold text-gray-900">DriveEase</span>
          </NavLink>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:block">{user?.name}</span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Admin</span>
            <button type="button" className="btn-ghost" onClick={leave}>Log out</button>
          </div>
        </div>
      </header>
      <div className="container flex flex-col gap-6 py-6 lg:flex-row">
        <aside className="shrink-0 lg:w-56">
          <nav aria-label="Admin navigation" className="flex gap-2 rounded-xl border border-gray-200 bg-white p-2 lg:flex-col">
            {links.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium ${isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
