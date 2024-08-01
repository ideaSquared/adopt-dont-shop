// Additional imports might be necessary depending on your setup
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, Route, Routes } from 'react-router-dom';
import LoginForm from '../UserLoginForm';

const mockLogin = vi.fn();
const mockLogout = vi.fn();

vi.mock('../AuthContext', () => ({
	useAuth: () => ({
		isLoggedIn: false,
		isAdmin: false,
		login: mockLogin,
		logout: mockLogout,
	}),
}));

// Helper component to capture and display the current location for testing
const LocationDisplay = () => {
	const location = useLocation();
	return <div data-testid='location-display'>{location.pathname}</div>;
};

describe.skip('LoginForm', () => {
	beforeEach(() => {
		mockLogin.mockClear();
		mockLogout.mockClear();
	});

	it('renders correctly', () => {
		render(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>
		);

		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
	});

	it('submits the form and calls the login function with correct credentials', async () => {
		render(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>
		);

		await userEvent.type(
			screen.getByLabelText(/email address/i),
			'user@example.com'
		);
		await userEvent.type(screen.getByLabelText(/password/i), 'password123');
		await userEvent.click(screen.getByRole('button', { name: /login/i }));

		expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'password123');
	});

	it('displays an error message on login failure', async () => {
		mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
		render(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>
		);

		await userEvent.type(
			screen.getByLabelText(/email address/i),
			'user@example.com'
		);
		await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
		await userEvent.click(screen.getByRole('button', { name: /login/i }));

		expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
	});

	it('navigates to home on successful login', async () => {
		mockLogin.mockResolvedValueOnce('success');
		render(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>
		);

		await userEvent.type(
			screen.getByLabelText(/email address/i),
			'user@example.com'
		);
		await userEvent.type(screen.getByLabelText(/password/i), 'password123');
		await userEvent.click(screen.getByRole('button', { name: /login/i }));

		// Replace '/expected-path-after-login' with the actual path your application should navigate to
		expect(window.location.pathname).toBe('/');
	});

	it('clears form fields after successful login', async () => {
		mockLogin.mockResolvedValueOnce('success');
		render(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>
		);

		await userEvent.type(
			screen.getByLabelText(/email address/i),
			'user@example.com'
		);
		await userEvent.type(screen.getByLabelText(/password/i), 'password123');
		await userEvent.click(screen.getByRole('button', { name: /login/i }));

		expect(screen.getByLabelText(/email address/i)).toHaveValue('');
		expect(screen.getByLabelText(/password/i)).toHaveValue('');
	});

	it('hides the login form when the user is already logged in', async () => {
		// Overriding the useAuth mock for this test to simulate a logged-in user
		vi.mock('../AuthContext', () => ({
			useAuth: () => ({
				isLoggedIn: true, // User is logged in
				isAdmin: false,
				login: mockLogin,
				logout: mockLogout,
			}),
		}));

		render(
			<MemoryRouter>
				<LoginForm />
			</MemoryRouter>
		);

		// Check that the login form does not render or the user is redirected
		// This could be adjusted based on your application's behavior
		expect(
			screen.queryByRole('form', { name: /login/i })
		).not.toBeInTheDocument();
	});

	/*
	FIX: Need to figure out navigation mocking to get this test to work
	*/
	/*it('navigates to the forgot password page on clicking the "Forgot your password?" link', async () => {
		render(
			<MemoryRouter initialEntries={['/']}>
				<Routes>
					<Route
						path='/'
						element={
							<>
								<LoginForm />
								<LocationDisplay />
							</>
						}
					/>
					<Route
						path='/forgot-password'
						element={<div>Forgot Password Page</div>}
					/>
				</Routes>
			</MemoryRouter>
		);

		// Click the "Forgot your password?" link
		await userEvent.click(screen.getByText(/forgot your password\?/i));

		// Check if the URL has been updated to the forgot password page
		expect(screen.getByTestId('location-display')).toHaveTextContent(
			'/forgot-password'
		);
	});
	*/

	// Additional tests can include:
	// - Testing form validation (if applicable), such as email format validation, required fields, etc.
});
