import React, { createContext, useContext, ReactNode } from 'react';
import { Role, Permission, rolePermissions } from './Permission';

interface PermissionContextProps {
	roles: Role[];
	hasPermission: (permission: Permission) => boolean;
	hasRole: (role: Role) => boolean;
}

const PermissionContext = createContext<PermissionContextProps | undefined>(
	undefined
);

interface PermissionProviderProps {
	roles: Role[];
	children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({
	roles,
	children,
}) => {
	const hasPermission = (permission: Permission) => {
		// If user is admin then skip perm check
		if (roles.includes(Role.ADMIN)) {
			return true;
		}
		// Otherwise, check the user's roles against the specific permissions
		return roles.some((role) => rolePermissions[role]?.includes(permission));
	};

	const hasRole = (role: Role) => {
		return roles.includes(role);
	};

	return (
		<PermissionContext.Provider value={{ roles, hasPermission, hasRole }}>
			{children}
		</PermissionContext.Provider>
	);
};

export const usePermissions = () => {
	const context = useContext(PermissionContext);
	if (!context) {
		throw new Error('usePermissions must be used within a PermissionProvider');
	}
	return context;
};
