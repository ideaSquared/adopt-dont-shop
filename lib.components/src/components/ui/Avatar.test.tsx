import { render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../../styles/ThemeProvider';
import { lightTheme } from '../../styles/theme';
import { Avatar } from './Avatar';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={lightTheme}>{component}</ThemeProvider>);
};

describe('Avatar', () => {
  it('renders correctly with default props', () => {
    renderWithTheme(<Avatar data-testid='avatar' />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('displays image when src is provided', () => {
    renderWithTheme(<Avatar src='/test-image.jpg' alt='Test User' />);
    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toHaveAttribute('src', '/test-image.jpg');
    expect(avatar).toHaveAttribute('alt', 'Test User');
  });

  it('displays fallback text when fallback is provided', () => {
    renderWithTheme(<Avatar fallback='JD' />);
    const fallback = screen.getByText('JD');
    expect(fallback).toBeInTheDocument();
  });

  it('displays fallback text for single initial', () => {
    renderWithTheme(<Avatar fallback='J' />);
    const initial = screen.getByText('J');
    expect(initial).toBeInTheDocument();
  });

  it('displays fallback icon when no src or fallback provided', () => {
    renderWithTheme(<Avatar data-testid='fallback-avatar' />);
    const avatar = screen.getByTestId('fallback-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    renderWithTheme(<Avatar size='lg' data-testid='large-avatar' />);
    const avatar = screen.getByTestId('large-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('applies different variants correctly', () => {
    renderWithTheme(<Avatar variant='square' data-testid='square-avatar' />);
    const avatar = screen.getByTestId('square-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('applies border when bordered prop is true', () => {
    renderWithTheme(<Avatar bordered data-testid='bordered-avatar' />);
    const avatar = screen.getByTestId('bordered-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('applies custom colors when provided', () => {
    renderWithTheme(
      <Avatar
        backgroundColor='#ff0000'
        textColor='#ffffff'
        fallback='JD'
        data-testid='colored-avatar'
      />
    );
    const avatar = screen.getByTestId('colored-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('handles image load error by showing fallback', () => {
    renderWithTheme(<Avatar src='/invalid-image.jpg' fallback='JD' />);
    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toBeInTheDocument();
  });

  it('applies data-testid when provided', () => {
    renderWithTheme(<Avatar data-testid='test-avatar' />);
    const avatar = screen.getByTestId('test-avatar');
    expect(avatar).toBeInTheDocument();
  });

  it('passes through HTML attributes', () => {
    renderWithTheme(
      <Avatar
        id='avatar-id'
        className='custom-class'
        title='User Avatar'
        data-testid='avatar-with-attrs'
      />
    );

    const avatar = screen.getByTestId('avatar-with-attrs');
    expect(avatar).toHaveAttribute('id', 'avatar-id');
    expect(avatar).toHaveAttribute('title', 'User Avatar');
    expect(avatar).toHaveClass('custom-class');
  });

  it('combines all props correctly', () => {
    renderWithTheme(
      <Avatar
        src='/test-image.jpg'
        alt='Test User'
        fallback='JD'
        size='lg'
        variant='square'
        bordered
        backgroundColor='#ff0000'
        textColor='#ffffff'
        className='combined-avatar'
        data-testid='combined-avatar'
      />
    );

    const avatar = screen.getByTestId('combined-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass('combined-avatar');
  });

  it('renders custom fallback icon when provided', () => {
    const customIcon = <span data-testid='custom-icon'>🎭</span>;
    renderWithTheme(<Avatar fallbackIcon={customIcon} />);
    const icon = screen.getByTestId('custom-icon');
    expect(icon).toBeInTheDocument();
  });

  it('handles fallback text with special characters', () => {
    renderWithTheme(<Avatar fallback='José' />);
    const fallback = screen.getByText('José');
    expect(fallback).toBeInTheDocument();
  });

  it('is accessible with proper alt text', () => {
    renderWithTheme(<Avatar src='/test.jpg' alt='Profile picture of John Doe' />);
    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toHaveAttribute('alt', 'Profile picture of John Doe');
  });
});
