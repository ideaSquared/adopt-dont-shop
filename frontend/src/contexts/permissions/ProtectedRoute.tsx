import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions, Permission } from '.'

interface ProtectedRouteProps {
  requiredPermission: Permission
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
}) => {
  const { hasPermission } = usePermissions()

  if (hasPermission(requiredPermission)) {
    return <Outlet /> // Outlet will render nested routes
  } else {
    return <Navigate to="/login" replace />
  }
}

export default ProtectedRoute
