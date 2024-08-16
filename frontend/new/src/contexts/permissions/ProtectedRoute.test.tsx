import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { Permission, Role } from '.';
import PermissionProvider from './PermissionContext';
import { screen } from '@testing-library/dom';

const TestComponent: React.FC = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
	it('should render the protected content if the user has the required permission', () => {
		render(
			<PermissionProvider roles={[Role.RESCUE_MANAGER]}>
				<MemoryRouter initialEntries={['/']}>
					<Routes>
						<Route
							element={
								<ProtectedRoute
									requiredPermission={Permission.VIEW_RESCUE_INFO}
								/>
							}
						>
							<Route path='/' element={<TestComponent />} />
						</Route>
					</Routes>
				</MemoryRouter>
			</PermissionProvider>
		);

		expect(screen.getByText('Protected Content')).toBeInTheDocument();
	});

	it('should navigate to login if the user does not have the required permission', () => {
		render(
			<PermissionProvider roles={[Role.STAFF]}>
				<MemoryRouter initialEntries={['/']}>
					<Routes>
						<Route
							element={
								<ProtectedRoute
									requiredPermission={Permission.VIEW_RESCUE_INFO}
								/>
							}
						>
							<Route path='/' element={<TestComponent />} />
						</Route>
						<Route path='/login' element={<div>Login Page</div>} />
					</Routes>
				</MemoryRouter>
			</PermissionProvider>
		);

		expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
		expect(screen.getByText('Login Page')).toBeInTheDocument();
	});
});
