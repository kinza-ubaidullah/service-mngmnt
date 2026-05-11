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
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  switch (user.role) {
    case 'ADMIN': return <Navigate to="/admin" replace />;
    case 'CALL_CENTER': return <Navigate to="/callcenter" replace />;
    case 'TECHNICIAN': return <Navigate to="/tech" replace />;
    case 'WORKSHOP_MANAGER': return <Navigate to="/workshop" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);

  // Initialize user on refresh if token exists
  useEffect(() => {
    const initAuth = async () => {
      console.log('Initializing Auth... Token:', !!token);
      if (token) {
        try {
          console.log('Fetching user data...');
          const response = await api.get('/auth/me');
          console.log('Auth response:', response.data);
          if (response.data && response.data.user) {
            dispatch(setUser(response.data.user));
            console.log('User set successfully');
          } else {
            console.error('Invalid user data received:', response.data);
            dispatch(logout());
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          dispatch(logout());
        }
      }
      setLoading(false);
      console.log('Auth initialization complete. Loading: false');
    };
    initAuth();
  }, [dispatch, token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={token && isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={token && isAuthenticated ? <Navigate to="/" replace /> : <Register />} 
          />

          {/* Root redirect based on role */}
          <Route 
            path="/" 
            element={<RootRedirect />} 
          />

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
