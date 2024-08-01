// AdminDashboard.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter as Router } from 'react-router-dom';
import axios from 'axios';
import { vi } from 'vitest';
import AdminDashboard from '../AdminDashboard';
import { AuthContext } from '../AuthContext';

vi.mock('axios');

// Mock the module
vi.mock('../AuthContext', () => {
	// Create a mock context to mimic the real one
	const mockUseAuth = () => ({
		isLoggedIn: true,
		isAdmin: true,
		login: vi.fn(),
		logout: vi.fn(),
	});

	// Mocking the actual context and the useAuth hook
	return {
		// This simulates the AuthContext object itself
		AuthContext: React.createContext({
			isLoggedIn: true,
			isAdmin: true,
		}),
		// This simulates the useAuth hook
		useAuth: mockUseAuth,
	};
});

describe.skip('AdminDashboard', () => {
	const mockUsers = [
		{ _id: '1', email: 'user1@example.com' },
		{ _id: '2', email: 'user2@example.com' },
	];

	const mockIsAdmin = true;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renders users table', async () => {
		axios.get.mockResolvedValueOnce({ data: mockUsers });

		render(
			<Router>
				<AdminDashboard />
			</Router>
		);

		await waitFor(() => {
			expect(screen.getAllByRole('row')).toHaveLength(mockUsers.length + 1);
		});

		expect(screen.getByText('user1@example.com')).toBeInTheDocument();
		expect(screen.getByText('user2@example.com')).toBeInTheDocument();
	});

	it('handles non-array data', async () => {
		axios.get.mockResolvedValueOnce({ data: {} });

		render(
			<Router>
				<AuthContext.Provider value={{ isAdmin: mockIsAdmin }}>
					<AdminDashboard />
				</AuthContext.Provider>
			</Router>
		);

		await waitFor(() => {
			expect(screen.getAllByRole('row')).toHaveLength(1);
		});
	});

	it('deletes a user', async () => {
		axios.get.mockResolvedValueOnce({ data: mockUsers });
		axios.delete.mockResolvedValueOnce();

		render(
			<Router>
				<AuthContext.Provider value={{ isAdmin: mockIsAdmin }}>
					<AdminDashboard />
				</AuthContext.Provider>
			</Router>
		);

		await waitFor(() => {
			expect(screen.getAllByRole('row')).toHaveLength(mockUsers.length + 1);
		});

		const deleteButton = screen.getAllByRole('button', { name: 'Delete' })[0];
		userEvent.click(deleteButton);

		await waitFor(() => {
			expect(axios.delete).toHaveBeenCalledWith(
				`${import.meta.env.VITE_API_BASE_URL}/admin/users/delete/${
					mockUsers[0]._id
				}`
			);
		});
	});

	it('resets password', async () => {
		axios.get.mockResolvedValueOnce({ data: mockUsers });
		axios.post.mockResolvedValueOnce();
		global.prompt = vi.fn().mockReturnValue('newpassword');

		render(
			<Router>
				<AuthContext.Provider value={{ isAdmin: mockIsAdmin }}>
					<AdminDashboard />
				</AuthContext.Provider>
			</Router>
		);

		await waitFor(() => {
			expect(screen.getAllByRole('row')).toHaveLength(mockUsers.length + 1);
		});

		const resetButton = screen.getAllByRole('button', {
			name: 'Reset Password',
		})[0];
		userEvent.click(resetButton);

		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith(
				`${import.meta.env.VITE_API_BASE_URL}/admin/users/reset-password/${
					mockUsers[0]._id
				}`,
				{ password: 'newpassword' }
			);
		});
	});

	// it('redirects if not admin', async () => {
	// 	const navigateMock = vi.fn();

	// 	render(
	// 		<Router>
	// 			<AuthContext.Provider value={{ isAdmin: false }}>
	// 				<AdminDashboard navigate={navigateMock} />
	// 			</AuthContext.Provider>
	// 		</Router>
	// 	);

	// 	await waitFor(() => {
	// 		expect(navigateMock).toHaveBeenCalledWith('/');
	// 	});
	// });
});
