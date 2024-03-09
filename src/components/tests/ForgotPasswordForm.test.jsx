// ForgotPasswordForm.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ForgotPasswordForm from '../ForgotPasswordForm';

// Mock fetch API
global.fetch = vi.fn();

// Mock useNavigate
vi.mock('react-router-dom', () => ({
	// Keep the original module to not lose other exports
	...vi.importActual('react-router-dom'),
	useNavigate: vi.fn(),
}));

describe('ForgotPasswordForm', () => {
	beforeEach(() => {
		fetch.mockClear();
		fetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				message: 'Successfully sent password reset email.',
			}),
		});
	});

	it('renders correctly', () => {
		render(<ForgotPasswordForm />);
		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /send reset email/i })
		).toBeInTheDocument();
	});

	it('displays success alert on successful email submission', async () => {
		render(<ForgotPasswordForm />);

		await userEvent.type(
			screen.getByLabelText(/email address/i),
			'user@example.com'
		);
		await userEvent.click(
			screen.getByRole('button', { name: /send reset email/i })
		);

		expect(fetch).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				method: 'POST',
				body: JSON.stringify({ email: 'user@example.com' }),
			})
		);

		// Wait for the fetch to resolve and the state to update
		expect(
			await screen.findByText(/successfully sent password reset email\./i)
		).toBeInTheDocument();
	});

	it('displays error alert on API error', async () => {
		fetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({ message: 'Failed to send password reset email.' }),
		});

		render(<ForgotPasswordForm />);

		await userEvent.type(
			screen.getByLabelText(/email address/i),
			'user@example.com'
		);
		await userEvent.click(
			screen.getByRole('button', { name: /send reset email/i })
		);

		expect(
			await screen.findByText(/failed to send password reset email\./i)
		).toBeInTheDocument();
	});

	/*
	FIX: Need to figure out navigation mocking to get this test to work
	*/
	/* it('navigates back to the login page on clicking the "Back to Login" link', async () => {
		render(
			<MemoryRouter initialEntries={['/forgot-password']}>
				<Routes>
					<Route path='/forgot-password' element={<ForgotPasswordForm />} />
				</Routes>
			</MemoryRouter>
		);

		// Assuming you have a link with text "Back to Login" for navigation
		await userEvent.click(screen.getByText(/back to login/i));

		// Since useNavigate is mocked, check if it was called with the expected argument
		const navigate = require('react-router-dom').useNavigate();
		expect(navigate).toHaveBeenCalledWith('/login'); // Adjust '/login' as necessary based on your app's routing
	 });*/

	// Additional tests can include:
	// - Input validation: Ensure the form validates the email input correctly.
	// - Form reset: Verify that the form clears the input or performs other expected actions on successful submission.
});
