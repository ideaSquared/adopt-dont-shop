// import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// import { render, screen, waitFor } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { useNavigate } from 'react-router-dom';
// import CreateAccount from '../CreateAccountForm';

// // Mocking the entire 'react-router-dom' module, including useNavigate
// vi.mock('react-router-dom', () => ({
// 	// Keep other navigational components intact if needed
// 	...vi.importActual('react-router-dom'),
// 	useNavigate: vi.fn(() => vi.fn()), // Mock useNavigate with a function that returns a mock function
// }));

// // Mocking fetch
// global.fetch = vi.fn();

// // Mocking localStorage if needed
// const mockLocalStorage = (function () {
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
// 	value: mockLocalStorage,
// });

// describe('CreateAccountForm', () => {
// 	beforeEach(() => {
// 		window.localStorage.clear();
// 		vi.resetAllMocks();
// 		global.fetch.mockClear();
// 	});

// 	afterEach(() => {
// 		vi.restoreAllMocks();
// 	});

// 	// TODO: Fix as this doesn't work - need to understand more about mocking in Vitest
// 	// it('submits the form and navigates on successful account creation', async () => {
// 	// 	// Setup the mock for fetch to simulate successful account creation
// 	// 	global.fetch.mockResolvedValueOnce({
// 	// 		ok: true,
// 	// 		json: () => Promise.resolve({ message: 'Registration successful!' }),
// 	// 	});

// 	// 	// Retrieve the mock navigate function from the mock implementation
// 	// 	const mockNavigate = vi.fn();
// 	// 	vi.mocked(useNavigate).mockImplementation(() => mockNavigate);

// 	// 	render(<CreateAccount />);

// 	// 	// Fill out and submit the form
// 	// 	userEvent.type(screen.getByLabelText(/First Name/i), 'John');
// 	// 	userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
// 	// 	userEvent.type(screen.getByLabelText(/password/i), 'password123');
// 	// 	userEvent.click(screen.getByRole('button', { name: /create account/i }));

// 	// 	// Wait for all asynchronous actions to complete
// 	// 	await waitFor(() => {
// 	// 		expect(global.fetch).toHaveBeenCalledTimes(1);
// 	// 	});

// 	// 	// Now assert that navigate was called with '/login'
// 	// 	expect(mockNavigate).toHaveBeenCalledWith('/login');
// 	// });

// 	it('handles network or unexpected errors gracefully', async () => {
// 		global.fetch.mockRejectedValue(new Error('Network error'));

// 		render(<CreateAccount />);
// 		userEvent.type(
// 			screen.getByLabelText(/email address/i),
// 			'error@example.com'
// 		);
// 		userEvent.type(screen.getByLabelText(/password/i), 'password123');
// 		userEvent.click(screen.getByRole('button', { name: /create account/i }));

// 		await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
// 		expect(screen.getByText(/Network error/i)).toBeInTheDocument();
// 	});
// });
