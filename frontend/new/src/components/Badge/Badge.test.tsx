import React from 'react';
import { render, screen } from '@testing-library/react';
import Badge from '../Badge';
import { ThemeProvider } from 'styled-components';
import { theme } from '@adoptdontshop/styles';

describe('Badge', () => {
	const renderWithTheme = (ui: React.ReactElement) => {
		return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
	};

	it('renders the badge with the correct text content', () => {
		renderWithTheme(<Badge>Test Badge</Badge>);
		expect(screen.getByText('Test Badge')).toBeInTheDocument();
	});

	it('applies the correct styles for the "success" variant', () => {
		const { container } = renderWithTheme(
			<Badge variant='success'>Success Badge</Badge>
		);
		const badge = container.firstChild;
		expect(badge).toHaveStyle(`
      background-color: ${theme.background.success};
      color: ${theme.text.success};
    `);
	});

	it('applies the correct styles for the "danger" variant', () => {
		const { container } = renderWithTheme(
			<Badge variant='danger'>Danger Badge</Badge>
		);
		const badge = container.firstChild;
		expect(badge).toHaveStyle(`
      background-color: ${theme.background.danger};
      color: ${theme.text.danger};
    `);
	});

	it('applies the correct styles for the "warning" variant', () => {
		const { container } = renderWithTheme(
			<Badge variant='warning'>Warning Badge</Badge>
		);
		const badge = container.firstChild;
		expect(badge).toHaveStyle(`
      background-color: ${theme.background.warning};
      color: ${theme.text.warning};
    `);
	});

	it('applies the correct styles for the "info" variant', () => {
		const { container } = renderWithTheme(
			<Badge variant='info'>Info Badge</Badge>
		);
		const badge = container.firstChild;
		expect(badge).toHaveStyle(`
      background-color: ${theme.background.info};
      color: ${theme.text.info};
    `);
	});

	it('applies the default styles when variant is null', () => {
		const { container } = renderWithTheme(
			<Badge variant={null}>Default Badge</Badge>
		);
		const badge = container.firstChild;
		expect(badge).toHaveStyle(`
      background-color: ${theme.background.contrast};
      color: ${theme.text.body};
    `);
	});
});
