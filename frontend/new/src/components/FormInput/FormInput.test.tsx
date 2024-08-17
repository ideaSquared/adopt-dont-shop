import React from 'react';
import { render, screen } from '@testing-library/react';
import FormInput from './FormInput';

describe('FormInput', () => {
	it('renders correctly with label and children', () => {
		render(
			<FormInput label='Test Label'>
				<input type='text' />
			</FormInput>
		);

		expect(screen.getByText('Test Label')).toBeInTheDocument();

		expect(screen.getByRole('textbox')).toBeInTheDocument();
	});

	it('renders the description when provided', () => {
		render(
			<FormInput label='Test Label' description='This is a description'>
				<input type='text' />
			</FormInput>
		);

		expect(screen.getByText('Test Label')).toBeInTheDocument();

		expect(screen.getByText('This is a description')).toBeInTheDocument();

		expect(screen.getByRole('textbox')).toBeInTheDocument();
	});

	it('does not render the description when not provided', () => {
		render(
			<FormInput label='Test Label'>
				<input type='text' />
			</FormInput>
		);

		expect(screen.getByText('Test Label')).toBeInTheDocument();

		expect(screen.queryByText('This is a description')).not.toBeInTheDocument();

		expect(screen.getByRole('textbox')).toBeInTheDocument();
	});
});
