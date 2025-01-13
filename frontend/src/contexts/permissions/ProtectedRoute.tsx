import { Permission, Role, usePermissions } from '@adoptdontshop/permissions'
import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useUser } from '../auth/UserContext'

interface ProtectedRouteProps {
  requiredPermissions?: Permission[]
  requiredRoles?: Role[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermissions,
  requiredRoles,
}) => {
  const { hasPermission } = usePermissions()
  const { user } = useUser()

  const hasRequiredPermission = requiredPermissions?.some((permission) =>
    hasPermission(permission),
  )

  // Check if user has at least one of the required roles
  const hasRequiredRole = requiredRoles?.some((role) =>
    user?.roles?.includes(role),
  )

  const isAuthorized = hasRequiredPermission || hasRequiredRole

  if (isAuthorized) {
    return <Outlet />
  } else {
    return <Navigate to="/login" replace />
  }
}

export default ProtectedRoute
