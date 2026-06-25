import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { canAccessRoute, homePathForRole } from '../utils/roleRoutes';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, token } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (!token || !isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !canAccessRoute(user.role, allowedRoles)) {
    return <Navigate to={homePathForRole(user.role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
