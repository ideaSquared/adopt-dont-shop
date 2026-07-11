import { render, screen } from '@testing-library/react';
import { PDFPreview } from '../PDFPreview';

const baseProps = {
  url: 'https://files.example.com/attachments/adoption-form.pdf?sig=abc123&expires=999',
  filename: 'adoption-form.pdf',
  mimeType: 'application/pdf',
  isOpen: true,
  onClose: () => {},
};

describe('PDFPreview', () => {
  it('never sends the attachment URL to a third-party viewer (docs.google.com)', () => {
    const { container } = render(<PDFPreview {...baseProps} />);

    // No element anywhere in the preview should reference the Google
    // Docs Viewer — no iframe src, no embed src, no link.
    const html = container.innerHTML;
    expect(html).not.toContain('docs.google.com');

    // No control should offer to open the file with a third-party viewer.
    expect(screen.queryByTitle(/google viewer/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<PDFPreview {...baseProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('offers a direct download link for the attachment', () => {
    render(<PDFPreview {...baseProps} />);
    const downloadLink = screen.getByRole('link');
    expect(downloadLink).toHaveAttribute('href', baseProps.url);
    expect(downloadLink).toHaveAttribute('download', baseProps.filename);
  });
});
