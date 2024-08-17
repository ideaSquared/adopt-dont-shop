import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
	const title = 'Test Modal';
	const content = 'This is the modal content';
	const mockOnClose = jest.fn();

	const renderModal = (isOpen: boolean) =>
		render(
			<Modal title={title} isOpen={isOpen} onClose={mockOnClose}>
				{content}
			</Modal>
		);

	beforeEach(() => {
		mockOnClose.mockClear(); // Clear mock function calls before each test
	});

	it('renders correctly when open', () => {
		renderModal(true);

		expect(screen.getByText(title)).toBeInTheDocument();
		expect(screen.getByText(content)).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
	});

	it('does not render when closed', () => {
		renderModal(false);

		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('calls onClose when the close button is clicked', () => {
		renderModal(true);

		const closeButton = screen.getByLabelText('Close');
		fireEvent.click(closeButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it('calls onClose when the footer close button is clicked', () => {
		renderModal(true);

		const footerCloseButton = screen.getByText('Close');
		fireEvent.click(footerCloseButton);

		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});
});
