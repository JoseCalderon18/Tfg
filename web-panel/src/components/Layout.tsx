import { Link, Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Layout() {
  const { user, logout, isAuthenticated, isCheckingAuth } = useAuthStore();

  if (isCheckingAuth) {
    return <div className="p-6">Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white">
        <div className="p-4">
          <h1 className="text-xl font-bold">Panel de emergencias</h1>
          <p className="text-sm text-gray-400">{user?.username}</p>
        </div>
        <nav className="mt-8">
          <Link to="/" className="block px-4 py-2 hover:bg-gray-700">
            Dashboard
          </Link>
          <Link to="/incidents" className="block px-4 py-2 hover:bg-gray-700">
            Incidentes
          </Link>
          <Link to="/alerts" className="block px-4 py-2 hover:bg-gray-700">
            Alertas
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4">
          <button
            onClick={() => void logout()}
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
