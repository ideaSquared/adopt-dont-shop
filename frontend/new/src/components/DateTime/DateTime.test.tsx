import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateTime from './DateTime';

describe('DateTime Component', () => {
	const mockTimestamp = '2024-08-16T14:30:00Z';

	it('renders the formatted date and time correctly without tooltip', () => {
		render(<DateTime timestamp={mockTimestamp} showTooltip={false} />);

		const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
		expect(dateTimeElement).toBeInTheDocument();
	});

	it('renders the tooltip with correct content when showTooltip is true', async () => {
		render(<DateTime timestamp={mockTimestamp} showTooltip={true} />);

		const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
		expect(dateTimeElement).toBeInTheDocument();

		fireEvent.mouseOver(dateTimeElement);

		await waitFor(() => {
			expect(screen.findByText(/Local Time:/i)).toBeTruthy();
			expect(screen.findByText(/UTC:/i)).toBeTruthy();
			expect(screen.findByText(/New York:/i)).toBeTruthy();
		});
	});

	it('formats the date correctly with ordinal suffix', () => {
		render(<DateTime timestamp={mockTimestamp} />);

		const dateTimeElement = screen.getByText(/16th August 2024, 14:30 UTC/i);
		expect(dateTimeElement).toBeInTheDocument();
	});

	it('formats the date correctly in the specified locale', () => {
		render(<DateTime timestamp={mockTimestamp} localeOption='en-US' />);

		const dateTimeElement = screen.getByText(/August 16, 2024, 02:30 PM UTC/i);
		expect(dateTimeElement).toBeInTheDocument();
	});
});
