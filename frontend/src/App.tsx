import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React from 'react';
import { useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import type { RootState } from './store';

import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import CallCenterDashboard from './pages/CallCenterDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import WorkshopDashboard from './pages/WorkshopDashboard';
import MapPage from './pages/MapPage';
import CreatePostPage from './pages/CreatePostPage';
import ProtectedRoute from './components/ProtectedRoute';
import AuthBootstrap from './components/AuthBootstrap';
import LocationServices from './components/LocationServices';
import ThemeProvider from './components/ThemeProvider';
import { homePathForRole } from './utils/roleRoutes';

const RootRedirect = () => {
  const { user, isAuthenticated, token } = useSelector((state: RootState) => state.auth);

  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={homePathForRole(user.role)} replace />;
};

const LoginRoute = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  if (isAuthenticated && user) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }
  return <Login />;
};

const CatchAllRedirect = () => {
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={homePathForRole(user.role)} replace />;
};

const panelRoutes = (
  basePath: string,
  allowedRoles: string[],
  element: React.ReactNode
) => [
  <Route
    key={basePath}
    path={basePath}
    element={<ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>}
  />,
  <Route
    key={`${basePath}-nested`}
    path={`${basePath}/*`}
    element={<ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>}
  />,
];

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={<RootRedirect />} />

      {panelRoutes('/admin', ['ADMIN'], <AdminDashboard />)}
      {panelRoutes('/callcenter', ['CALL_CENTER', 'ADMIN'], <CallCenterDashboard />)}
      {panelRoutes('/tech', ['TECHNICIAN', 'ADMIN'], <TechnicianDashboard />)}
      {panelRoutes('/workshop', ['WORKSHOP_MANAGER', 'ADMIN'], <WorkshopDashboard />)}

      <Route path="/call-center" element={<Navigate to="/callcenter" replace />} />
      <Route path="/call-center/*" element={<Navigate to="/callcenter" replace />} />

      <Route
        path="/map"
        element={
          <ProtectedRoute allowedRoles={['CALL_CENTER', 'ADMIN', 'TECHNICIAN']}>
            <MapPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/create-post"
        element={
          <ProtectedRoute allowedRoles={['ADMIN', 'CALL_CENTER', 'TECHNICIAN', 'WORKSHOP_MANAGER']}>
            <CreatePostPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<CatchAllRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2ebe6',
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 16px rgba(193,240,193,0.2)',
          },
          success: { iconTheme: { primary: '#52c47a', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#f08080', secondary: '#ffffff' } },
        }}
      />
      <AuthBootstrap>
        <LocationServices />
        <Router>
          <AppRoutes />
        </Router>
      </AuthBootstrap>
    </ThemeProvider>
  );
}

export default App;
