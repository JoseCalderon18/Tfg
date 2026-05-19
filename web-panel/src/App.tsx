import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Traemos el sistema de login
import { useAuthStore } from './store/authStore';

// Aquí están todas las páginas de la app
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import AlertsPage from './pages/AlertsPage';
import WeatherPage from './pages/WeatherPage';
import Layout from './components/Layout';
import NewUserPage from './pages/NewUserPage';
import ViewUsersPage from './pages/ViewUsersPage';
import { ViewUnidadesPage } from './pages/ViewUnidadesPage';
import EditUserPage from './pages/EditUserPage';
import CreateIncidentPage from './pages/CreateIncidentPage';
import ViewOrganizationsPage from './pages/ViewOrganizationsPage';
import EditIncidentPage from './pages/EditIncidentPage';
import LightningMapPage from './pages/LightningMapPage';
import EditOrganizationPage from './pages/EditOrganizationPage';
import EditUnitPage from './pages/EditUnitPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import NewOrganizationPage from './pages/NewOrganizationPage';
import EditAlertPage from './pages/EditAlertPage';
import WorkAreasPage from './pages/WorkAreasPage';
import NewWorkAreaPage from './pages/NewWorkAreaPage';
import EditWorkAreaPage from './pages/EditWorkAreaPage';
import JourneysPage from './pages/JourneysPage';
import PointOfInterestPage from './pages/PointOfInterestPage';
import CreatePointOfInterestPage from './pages/CreatePointOfInterestPage';
import ChatPage from './pages/ChatPage';
import AuditPage from './pages/AuditPage';
import RiskReportsPage from './pages/RiskReportsPage';
import HelpPage from './pages/HelpPage';
import FaqPage from './pages/FaqPage';
import TutorialsPage from './pages/TutorialsPage';
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
      {/* Página de login, abierta a todos */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      
      {/* Páginas que necesitan login, con menú lateral */}
      <Route path="/" element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="weather" element={<WeatherPage />} />
        <Route path="newuser" element={<NewUserPage />} />
        <Route path="viewusers" element={<ViewUsersPage />} />
        <Route path="viewunidades" element={<ViewUnidadesPage />} />
        <Route path="edituser/:id" element={<EditUserPage />} />
        <Route path="createincident" element={<CreateIncidentPage />} />
        <Route path="vieworganizations" element={<ViewOrganizationsPage />} />
        <Route path="lightning" element={<LightningMapPage />} />
        <Route path="editIncident/:id" element={<EditIncidentPage />} />
        <Route path="editorganization/:id" element={<EditOrganizationPage />} />
        <Route path="editunit/:id" element={<EditUnitPage />} />
        <Route path="createorganization" element={<NewOrganizationPage />} />
        <Route path="editAlert/:id" element={<EditAlertPage />} />
        <Route path="workarea" element={<WorkAreasPage />} />
        <Route path="createWorkArea" element={<NewWorkAreaPage />} />
        <Route path="editWorkArea/:id" element={<EditWorkAreaPage />} />
        <Route path='journeys' element={<JourneysPage />} />
        <Route path="points" element={<PointOfInterestPage />} />
        <Route path="createPointOfInterest" element={<CreatePointOfInterestPage />} />
        <Route path="chats" element={<ChatPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="risk-reports" element={<RiskReportsPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="tutorials" element={<TutorialsPage />} />
        {/* Si no encuentra la página, va al dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
