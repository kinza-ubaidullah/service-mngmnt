import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user?.role || '')) {
    const role = user?.role;
    let targetPath = '/';
    
    switch (role) {
      case 'ADMIN': targetPath = '/admin'; break;
      case 'CALL_CENTER': targetPath = '/callcenter'; break;
      case 'TECHNICIAN': targetPath = '/tech'; break;
      case 'WORKSHOP_MANAGER': targetPath = '/workshop'; break;
    }

    if (location.pathname === targetPath) {
      return <>{children}</>;
    }

    return <Navigate to={targetPath} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
