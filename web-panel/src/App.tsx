import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importamos el store de autenticación
import { useAuthStore } from './store/authStore';

// Importamos las páginas de la aplicación
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import AlertsPage from './pages/AlertsPage';
import Layout from './components/Layout';
import NewUserPage from './pages/NewUserPage';
import ViewUsersPage from './pages/ViewUsersPage';
import { ViewUnidadesPage } from './pages/ViewUnidadesPage';
import EditUserPage from './pages/EditUserPage';

/**
 * Componente principal del panel web
 * Maneja las rutas y la verificación de autenticación
 */
function App() {
  const { checkAuth } = useAuthStore();

  // Verificamos la autenticación al cargar la aplicación
  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  return (
    <Routes>
      {/* Ruta pública de login */}
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rutas protegidas con layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="newuser" element={<NewUserPage />} />
        <Route path="viewusers" element={<ViewUsersPage />} />
        <Route path="viewunidades" element={<ViewUnidadesPage />} />
        <Route path="edituser/:id" element={<EditUserPage />} />
        {/* Redirección para rutas no encontradas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
