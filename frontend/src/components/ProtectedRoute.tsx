import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If authenticated but unauthorized role, redirect to their respective dashboard
    switch (user.role) {
      case 'ADMIN': return <Navigate to="/admin" replace />;
      case 'CALL_CENTER': return <Navigate to="/callcenter" replace />;
      case 'TECHNICIAN': return <Navigate to="/tech" replace />;
      case 'WORKSHOP_MANAGER': return <Navigate to="/workshop" replace />;
      default: return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Unauthorized Access</h2>
          <p className="text-slate-400 mb-6">You don't have permission to view this page.</p>
          <button onClick={() => window.location.href = '/login'} className="bg-indigo-600 text-white px-6 py-2 rounded-xl">Back to Login</button>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
