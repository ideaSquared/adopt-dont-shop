import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';
import { lightTheme } from '../../../styles/theme';
import { FileUpload } from './FileUpload';

const renderWithTheme = (component: React.ReactElement) => {
  return render(<StyledThemeProvider theme={lightTheme}>{component}</StyledThemeProvider>);
};

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('FileUpload', () => {
  it('renders correctly with basic props', () => {
    renderWithTheme(<FileUpload data-testid='file-upload' />);

    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    expect(screen.getByText('Drop file here or click to browse')).toBeInTheDocument();
  });

  it('renders with label', () => {
    renderWithTheme(<FileUpload label='Upload documents' data-testid='file-upload' />);

    expect(screen.getByText('Upload documents')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    renderWithTheme(<FileUpload label='Required files' required />);

    expect(screen.getByText('Required files')).toBeInTheDocument();
    // Required indicator is shown via CSS ::after content
  });

  it('handles file selection', () => {
    const handleFilesSelect = jest.fn();
    renderWithTheme(<FileUpload onFilesSelect={handleFilesSelect} data-testid='file-upload' />);

    const input = screen.getByTestId('file-upload').querySelector('input[type="file"]');
    const file = createMockFile('test.txt', 1024, 'text/plain');

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });
    expect(handleFilesSelect).toHaveBeenCalledWith([file]);
  });

  it('displays error message', () => {
    renderWithTheme(<FileUpload error='File upload failed' data-testid='file-upload' />);

    expect(screen.getByText('File upload failed')).toBeInTheDocument();
  });

  it('displays helper text', () => {
    renderWithTheme(<FileUpload helperText='Max 5MB' data-testid='file-upload' />);

    expect(screen.getByText('Max 5MB')).toBeInTheDocument();
  });

  it('shows accept types in subtext', () => {
    renderWithTheme(<FileUpload accept='.pdf,.doc,.docx' data-testid='file-upload' />);

    expect(screen.getByText('Accepted formats: .pdf,.doc,.docx')).toBeInTheDocument();
  });

  it('shows max size in subtext', () => {
    renderWithTheme(<FileUpload maxSize={5242880} data-testid='file-upload' />);

    expect(screen.getByText(/Max size: 5 MB/)).toBeInTheDocument();
  });

  it('displays selected files', () => {
    const file1 = createMockFile('document1.pdf', 1024, 'application/pdf');
    const file2 = createMockFile('document2.txt', 2048, 'text/plain');

    renderWithTheme(<FileUpload files={[file1, file2]} data-testid='file-upload' />);

    expect(screen.getByText('document1.pdf')).toBeInTheDocument();
    expect(screen.getByText('document2.txt')).toBeInTheDocument();
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
  });

  it('handles file removal', () => {
    const handleFileRemove = jest.fn();
    const file = createMockFile('test.pdf', 1024, 'application/pdf');

    renderWithTheme(
      <FileUpload files={[file]} onFileRemove={handleFileRemove} data-testid='file-upload' />
    );

    const removeButton = screen.getByLabelText('Remove test.pdf');
    fireEvent.click(removeButton);

    expect(handleFileRemove).toHaveBeenCalledWith(0);
  });

  it('handles multiple files', () => {
    renderWithTheme(<FileUpload multiple data-testid='file-upload' />);

    expect(screen.getByText('Drop files here or click to browse')).toBeInTheDocument();
  });

  it('disables upload when disabled', () => {
    renderWithTheme(<FileUpload disabled data-testid='file-upload' />);

    const input = screen.getByTestId('file-upload').querySelector('input[type="file"]');
    expect(input).toBeDisabled();
  });

  it('validates file size', () => {
    const handleError = jest.fn();
    const handleFilesSelect = jest.fn();

    renderWithTheme(
      <FileUpload
        maxSize={1024}
        onError={handleError}
        onFilesSelect={handleFilesSelect}
        data-testid='file-upload'
      />
    );

    const input = screen.getByTestId('file-upload').querySelector('input[type="file"]');
    const largeFile = createMockFile('large.txt', 2048, 'text/plain');

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [largeFile] } });
    expect(handleError).toHaveBeenCalledWith('large.txt is too large. Maximum size is 1 KB');
    expect(handleFilesSelect).not.toHaveBeenCalled();
  });

  it('validates file type', () => {
    const handleError = jest.fn();
    const handleFilesSelect = jest.fn();

    renderWithTheme(
      <FileUpload
        accept='.pdf'
        onError={handleError}
        onFilesSelect={handleFilesSelect}
        data-testid='file-upload'
      />
    );

    const input = screen.getByTestId('file-upload').querySelector('input[type="file"]');
    const wrongTypeFile = createMockFile('document.txt', 1024, 'text/plain');

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [wrongTypeFile] } });
    expect(handleError).toHaveBeenCalledWith('document.txt is not an accepted file type');
    expect(handleFilesSelect).not.toHaveBeenCalled();
  });

  it('validates max files count', () => {
    const handleError = jest.fn();
    const existingFile = createMockFile('existing.pdf', 1024, 'application/pdf');

    renderWithTheme(
      <FileUpload
        maxFiles={1}
        files={[existingFile]}
        onError={handleError}
        data-testid='file-upload'
      />
    );

    const input = screen.getByTestId('file-upload').querySelector('input[type="file"]');
    const newFile = createMockFile('new.pdf', 1024, 'application/pdf');

    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [newFile] } });
    expect(handleError).toHaveBeenCalledWith('Maximum 1 files allowed');
  });

  it('applies different sizes', () => {
    const { rerender } = renderWithTheme(<FileUpload size='sm' data-testid='file-upload' />);

    expect(screen.getByTestId('file-upload')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <FileUpload size='lg' data-testid='file-upload' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  it('applies different states', () => {
    const { rerender } = renderWithTheme(<FileUpload state='success' data-testid='file-upload' />);

    expect(screen.getByTestId('file-upload')).toBeInTheDocument();

    rerender(
      <StyledThemeProvider theme={lightTheme}>
        <FileUpload state='warning' data-testid='file-upload' />
      </StyledThemeProvider>
    );

    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });
});
