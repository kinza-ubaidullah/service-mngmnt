import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import api from './services/api';
import { setUser, logout } from './store/slices/authSlice';
import type { RootState } from './store';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import CallCenterDashboard from './pages/CallCenterDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import ProtectedRoute from './components/ProtectedRoute';

const RootRedirect = () => {
  const { user, isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  
  if (!token) return <Navigate to="/login" replace />;
  
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p>Verifying Access...</p>
        </div>
      </div>
    );
  }
  
  const role = user?.role;
  console.log('Redirecting based on role:', role);

  switch (role) {
    case 'ADMIN': return <Navigate to="/admin" replace />;
    case 'CALL_CENTER': return <Navigate to="/callcenter" replace />;
    case 'TECHNICIAN': return <Navigate to="/tech" replace />;
    case 'WORKSHOP_MANAGER': return <Navigate to="/workshop" replace />;
    default: 
      console.warn('Unknown role detected:', role);
      return <Navigate to="/login" replace />;
  }
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      console.log('--- Auth Init Start ---');
      if (token && !isAuthenticated) {
        try {
          const response = await api.get('/auth/me');
          if (response.data?.user) {
            dispatch(setUser(response.data.user));
            console.log('User initialized:', response.data.user?.role);
          }
        } catch (error) {
          console.error('Auth Init Error:', error);
          dispatch(logout());
        }
      }
      setLoading(false);
      console.log('--- Auth Init End ---');
    };
    initAuth();
  }, [dispatch, token, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-bold">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse">Loading ServiceOS...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} />

          {/* Role-based Redirection at Root */}
          <Route path="/" element={isAuthenticated ? <RootRedirect /> : <Navigate to="/login" replace />} />

          {/* Admin Routes */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Call Center Routes */}
          <Route path="/call-center/*" element={<Navigate to="/callcenter" replace />} />
          <Route 
            path="/callcenter/*" 
            element={
              <ProtectedRoute allowedRoles={['CALL_CENTER', 'ADMIN']}>
                <CallCenterDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Technician Routes */}
          <Route 
            path="/tech/*" 
            element={
              <ProtectedRoute allowedRoles={['TECHNICIAN', 'ADMIN']}>
                <TechnicianDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </>
  );
}

export default App;
