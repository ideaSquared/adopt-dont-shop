import { Permission, Role, usePermissions } from '@adoptdontshop/permissions'
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '../auth/UserContext'

interface ProtectedRouteProps {
  requiredPermission?: Permission
  requiredRole?: Role
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  requiredRole,
}) => {
  const { hasPermission } = usePermissions()
  const { user } = useUser()

  // Check if user has the required permission or role
  const isAuthorized =
    (requiredPermission && hasPermission(requiredPermission)) ||
    (requiredRole && user?.roles?.includes(requiredRole))

  if (isAuthorized) {
    return <Outlet /> // Outlet will render nested routes
  } else {
    return <Navigate to="/login" replace />
  }
}

export default ProtectedRoute
