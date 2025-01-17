import React, { ReactNode, createContext, useContext } from 'react'
import { Permission, Role, rolePermissions } from '.'

interface PermissionContextProps {
  roles: Role[]
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: Role) => boolean
}

const PermissionContext = createContext<PermissionContextProps | undefined>(
  undefined,
)

interface PermissionProviderProps {
  roles: Role[]
  children: ReactNode
}

const PermissionProvider: React.FC<PermissionProviderProps> = ({
  roles = [],
  children,
}) => {
  const hasPermission = (permission: Permission) => {
    if (roles.includes(Role.ADMIN)) {
      return true
    }
    return roles.some((role) => rolePermissions[role]?.includes(permission))
  }

  const hasRole = (role: Role) => {
    return roles.includes(role)
  }

  return (
    <PermissionContext.Provider value={{ roles, hasPermission, hasRole }}>
      {children}
    </PermissionContext.Provider>
  )
}

const usePermissions = () => {
  const context = useContext(PermissionContext)
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

export default PermissionProvider
export { usePermissions }
