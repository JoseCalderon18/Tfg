import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Layout() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h1 className="text-xl font-bold">Emergency Panel</h1>
          <p className="text-sm text-gray-400">{user?.username}</p>
        </div>
        <nav className="mt-8">
          <Link to="/" className="block px-4 py-2 hover:bg-gray-700">
            Dashboard
          </Link>
          <Link to="/incidents" className="block px-4 py-2 hover:bg-gray-700">
            Incidents
          </Link>
          <Link to="/alerts" className="block px-4 py-2 hover:bg-gray-700">
            Alerts
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4">
          <button
            onClick={logout}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
