// // ChangeDetailsForm.test.jsx
// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// import { render, screen, waitFor, fireEvent } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import ChangeDetailsForm from '../ChangeDetailsForm';

// // Mocking modules
// vi.mock('react-router-dom', () => ({
// 	useNavigate: vi.fn(),
// }));

// // Setup localStorage mock
// const localStorageMock = (function () {
// 	let store = {};
// 	return {
// 		getItem(key) {
// 			return store[key] || null;
// 		},
// 		setItem(key, value) {
// 			store[key] = value.toString();
// 		},
// 		clear() {
// 			store = {};
// 		},
// 	};
// })();

// Object.defineProperty(window, 'localStorage', {
// 	value: localStorageMock,
// });

// beforeEach(() => {
// 	window.localStorage.clear();
// 	vi.restoreAllMocks();
// });

// // Optionally mock fetch if your environment doesn't support it
// global.fetch = vi.fn();

// describe('ChangeDetailsForm', () => {
// 	it('renders the form correctly', () => {
// 		render(<ChangeDetailsForm />);
// 		expect(screen.getByLabelText(/New Email/i)).toBeInTheDocument();
// 		expect(screen.getByLabelText(/New Password/i)).toBeInTheDocument();
// 		expect(
// 			screen.getByRole('button', { name: /Update Details/i })
// 		).toBeInTheDocument();
// 	});
// 	it('submits the form with new details and shows success message', async () => {
// 		const mockSuccessResponse = { message: 'Details updated successfully!' };
// 		global.fetch.mockResolvedValueOnce({
// 			ok: true,
// 			json: () => Promise.resolve(mockSuccessResponse),
// 		});

// 		render(<ChangeDetailsForm />);
// 		userEvent.type(screen.getByLabelText(/New First Name/i), 'John');
// 		userEvent.type(screen.getByLabelText(/New Email/i), 'new@example.com');
// 		userEvent.type(screen.getByLabelText(/New Password/i), 'newpassword');
// 		userEvent.click(screen.getByRole('button', { name: /Update Details/i }));

// 		await waitFor(() => {
// 			expect(global.fetch).toHaveBeenCalledTimes(1);
// 			expect(screen.getByText(mockSuccessResponse.message)).toBeInTheDocument();
// 		});
// 	});
// 	it('displays an error message if the update fails', async () => {
// 		const mockErrorResponse = { message: 'Failed to update details.' };
// 		global.fetch.mockResolvedValueOnce({
// 			ok: false,
// 			json: () => Promise.resolve(mockErrorResponse),
// 		});

// 		render(<ChangeDetailsForm />);
// 		userEvent.type(screen.getByLabelText(/New Email/i), 'error@example.com');
// 		userEvent.type(screen.getByLabelText(/New Password/i), 'wrongpassword');
// 		userEvent.click(screen.getByRole('button', { name: /Update Details/i }));

// 		await waitFor(() => {
// 			expect(global.fetch).toHaveBeenCalledTimes(1);
// 			expect(screen.getByText(mockErrorResponse.message)).toBeInTheDocument();
// 		});
// 	});

// 	// it('shows validation messages for incorrect input', async () => {
// 	// 	render(<ChangeDetailsForm />);
// 	// 	// Assuming an email field that requires a valid email
// 	// 	userEvent.type(screen.getByLabelText(/New Email/i), 'wrongemail');
// 	// 	userEvent.type(screen.getByLabelText(/New Password/i), ''); // Assuming password can't be empty
// 	// 	userEvent.click(screen.getByRole('button', { name: /Update Details/i }));

// 	// 	await waitFor(() => {
// 	// 		expect(
// 	// 			screen.getByText(/Please enter a valid email/i)
// 	// 		).toBeInTheDocument();
// 	// 		expect(screen.getByText(/Password cannot be empty/i)).toBeInTheDocument();
// 	// 	});
// 	// });

// 	it('does not submit if details have not been changed', async () => {
// 		window.localStorage.setItem('token', 'fake-token');
// 		global.fetch.mockResolvedValueOnce({
// 			ok: true,
// 			json: () => Promise.resolve({}),
// 		});

// 		render(<ChangeDetailsForm />);
// 		// Not changing any details
// 		userEvent.click(screen.getByRole('button', { name: /Update Details/i }));

// 		await waitFor(() => {
// 			expect(global.fetch).not.toHaveBeenCalled();
// 			expect(
// 				screen.queryByText(/Details updated successfully!/i)
// 			).not.toBeInTheDocument();
// 		});
// 	});

// 	it('uses the token from localStorage for submission', async () => {
// 		const token = 'test-token';
// 		window.localStorage.setItem('token', token);
// 		const mockSuccessResponse = { message: 'Details updated successfully!' };
// 		global.fetch.mockResolvedValueOnce({
// 			ok: true,
// 			json: () => Promise.resolve(mockSuccessResponse),
// 		});

// 		render(<ChangeDetailsForm />);
// 		userEvent.type(screen.getByLabelText(/New Email/i), 'new@example.com');
// 		userEvent.type(screen.getByLabelText(/New Password/i), 'newpassword');
// 		userEvent.click(screen.getByRole('button', { name: /Update Details/i }));

// 		await waitFor(() => {
// 			expect(global.fetch).toHaveBeenCalledWith(
// 				expect.any(String),
// 				expect.objectContaining({
// 					headers: expect.objectContaining({
// 						Authorization: `Bearer ${token}`,
// 					}),
// 				})
// 			);
// 		});
// 	});
// });
