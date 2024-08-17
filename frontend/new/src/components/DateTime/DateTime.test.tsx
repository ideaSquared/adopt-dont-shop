import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateTime from './DateTime';

describe('DateTime Component', () => {
	const mockTimestamp = '2024-08-16T14:30:00Z';

	it('renders the formatted date and time correctly without tooltip', () => {
		render(<DateTime timestamp={mockTimestamp} showTooltip={false} />);

		// Check the formatted date and time string
		const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
		expect(dateTimeElement).toBeInTheDocument();
	});

	it('renders the tooltip with correct content when showTooltip is true', async () => {
		render(<DateTime timestamp={mockTimestamp} showTooltip={true} />);

		// Find the date-time element
		const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
		expect(dateTimeElement).toBeInTheDocument();

		// Simulate hovering to trigger the tooltip
		fireEvent.mouseOver(dateTimeElement);

		// Wait for the tooltip to appear and check its content
		await waitFor(() => {
			expect(screen.findByText(/Local Time:/i)).toBeTruthy();
			expect(screen.findByText(/UTC:/i)).toBeTruthy();
			expect(screen.findByText(/New York:/i)).toBeTruthy();
		});
	});

	it('formats the date correctly with ordinal suffix', () => {
		render(<DateTime timestamp={mockTimestamp} />);

		// Check the formatted date string
		const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
		expect(dateTimeElement).toBeInTheDocument();
	});

	it('formats the date correctly in the specified locale', () => {
		render(<DateTime timestamp={mockTimestamp} localeOption='en-US' />);

		// Check the formatted date string in en-US locale
		const dateTimeElement = screen.getByText(/August 16, 2024, 02:30 PM UTC/i);
		expect(dateTimeElement).toBeInTheDocument();
	});
});
