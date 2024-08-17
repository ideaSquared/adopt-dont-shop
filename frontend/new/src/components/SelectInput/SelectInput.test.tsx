import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '@adoptdontshop/styles';
import SelectInput from './SelectInput';

describe('SelectInput', () => {
	const options = [
		{ value: 'option1', label: 'Option 1' },
		{ value: 'option2', label: 'Option 2' },
		{ value: 'option3', label: 'Option 3' },
	];

	const renderWithTheme = (ui: React.ReactElement) => {
		return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
	};

	it('renderWithThemes correctly with options', () => {
		renderWithTheme(<SelectInput options={options} onChange={() => {}} />);

		expect(screen.getByRole('combobox')).toBeInTheDocument();
		expect(screen.getAllByRole('option')).toHaveLength(3);

		options.forEach((option) => {
			expect(screen.getByText(option.label)).toBeInTheDocument();
		});
	});

	// TODO: Fix
	it.skip('calls onChange when an option is selected', () => {
		const mockOnChange = jest.fn();
		renderWithTheme(<SelectInput options={options} onChange={mockOnChange} />);

		const selectElement = screen.getByRole('combobox');
		fireEvent.change(selectElement, { target: { value: 'option2' } });

		expect(mockOnChange).toHaveBeenCalledTimes(1);
		expect(mockOnChange).toHaveBeenCalledWith(expect.anything());
	});

	it('handles disabled state', () => {
		renderWithTheme(
			<SelectInput options={options} onChange={() => {}} disabled />
		);

		expect(screen.getByRole('combobox')).toBeDisabled();
	});

	it('handles required state', () => {
		renderWithTheme(
			<SelectInput options={options} onChange={() => {}} required />
		);

		expect(screen.getByRole('combobox')).toBeRequired();
	});

	it('handles value prop correctly', () => {
		renderWithTheme(
			<SelectInput options={options} value='option2' onChange={() => {}} />
		);

		expect(screen.getByRole('combobox')).toHaveValue('option2');
	});
});
