import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import TextInput from './TextInput';
import { theme } from '@adoptdontshop/styles';

describe('<TextInput/>', () => {
	const mockOnChange = jest.fn();

	beforeEach(() => {
		mockOnChange.mockClear();
	});

	const renderWithTheme = (ui: React.ReactElement) => {
		return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
	};

	it('should render the input element with the correct type', () => {
		renderWithTheme(<TextInput type='text' value='' onChange={mockOnChange} />);
		const inputElement = screen.getByRole('textbox');
		expect(inputElement).toBeInTheDocument();
		expect(inputElement).toHaveAttribute('type', 'text');
	});

	it('should display the correct placeholder text', () => {
		const placeholderText = 'Enter your text here';
		renderWithTheme(
			<TextInput
				type='text'
				value=''
				onChange={mockOnChange}
				placeholder={placeholderText}
			/>
		);
		const inputElement = screen.getByPlaceholderText(placeholderText);
		expect(inputElement).toBeInTheDocument();
	});

	// TODO: Fix
	it('should call onChange handler when input value changes', () => {
		renderWithTheme(<TextInput type='text' value='' onChange={mockOnChange} />);
		const inputElement = screen.getByRole('textbox');

		fireEvent.change(inputElement, { target: { value: 'new value' } });

		expect(mockOnChange).toHaveBeenCalledTimes(1);
		expect(mockOnChange).toHaveBeenCalledWith(expect.anything());
	});

	it('should disable the input when disabled prop is true', () => {
		renderWithTheme(
			<TextInput type='text' value='' onChange={mockOnChange} disabled />
		);
		const inputElement = screen.getByRole('textbox');
		expect(inputElement).toBeDisabled();
	});

	it('should require the input when required prop is true', () => {
		renderWithTheme(
			<TextInput type='text' value='' onChange={mockOnChange} required />
		);
		const inputElement = screen.getByRole('textbox');
		expect(inputElement).toBeRequired();
	});

	it('should render with the value provided', () => {
		const value = 'Test Value';
		renderWithTheme(
			<TextInput type='text' value={value} onChange={mockOnChange} />
		);
		const inputElement = screen.getByRole('textbox');
		expect(inputElement).toHaveValue(value);
	});

	it('should use empty string when value is null', () => {
		renderWithTheme(
			<TextInput type='text' value={null} onChange={mockOnChange} />
		);
		const inputElement = screen.getByRole('textbox');
		expect(inputElement).toHaveValue('');
	});
});
