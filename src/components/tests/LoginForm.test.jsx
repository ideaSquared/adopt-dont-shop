// Additional imports might be necessary depending on your setup
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginForm from '../LoginForm';

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

describe('LoginForm', () => {
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

	// Additional tests can include:
	// - Verifying that the 'Forgot your password?' link correctly navigates to the forgot password page.
	// - Testing the behavior when the user is already logged in (should redirect or hide the login form).
	// - Testing form validation (if applicable), such as email format validation, required fields, etc.
});
