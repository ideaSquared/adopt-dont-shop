import React, { createContext, useContext, ReactNode } from 'react';
import { Role, Permission, rolePermissions } from './Permission';

interface PermissionContextProps {
	roles: Role[];
	hasPermission: (permission: Permission) => boolean;
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
		return roles.some((role) => rolePermissions[role]?.includes(permission));
	};

	return (
		<PermissionContext.Provider value={{ roles, hasPermission }}>
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
