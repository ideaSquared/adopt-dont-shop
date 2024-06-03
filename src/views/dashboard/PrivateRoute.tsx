import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface PrivateRouteProps {
	redirectPath?: string;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({
	redirectPath = '/login',
}) => {
	const { authState } = useAuth();

	if (!authState.isLoggedIn || (!authState.isRescue && !authState.isAdmin)) {
		return <Navigate to={redirectPath} replace />;
	}

	return <Outlet />;
};

export default PrivateRoute;
