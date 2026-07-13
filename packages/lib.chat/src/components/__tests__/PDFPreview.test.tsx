import { render, screen } from '@testing-library/react';
import { PDFPreview } from '../PDFPreview';

// PDFPreview renders via createPortal(..., document.body), so assertions
// query the document (via `screen`, which is document-scoped) rather than
// the RTL render() container.
const baseProps = {
  url: 'https://files.example.com/attachments/adoption-form.pdf?sig=abc123&expires=999',
  filename: 'adoption-form.pdf',
  mimeType: 'application/pdf',
  isOpen: true,
  onClose: () => {},
};

describe('PDFPreview', () => {
  it('never sends the attachment URL to a third-party viewer (docs.google.com)', () => {
    render(<PDFPreview {...baseProps} />);

    // No element anywhere in the document should reference the Google Docs
    // Viewer — no iframe src, no embed src, no link.
    expect(document.body.innerHTML).not.toContain('docs.google.com');

    // No control should offer to open the file with a third-party viewer.
    expect(screen.queryByTitle(/google viewer/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });

  it('renders nothing when closed', () => {
    render(<PDFPreview {...baseProps} isOpen={false} />);
    expect(screen.queryByText(baseProps.filename)).toBeNull();
    expect(document.body.querySelector('iframe')).toBeNull();
  });

  it('offers a direct download link for the attachment', () => {
    render(<PDFPreview {...baseProps} />);
    const downloadLink = screen.getByRole('link');
    expect(downloadLink).toHaveAttribute('href', baseProps.url);
    expect(downloadLink).toHaveAttribute('download', baseProps.filename);
  });

  it('renders an inline preview for a verified application/pdf attachment', () => {
    render(<PDFPreview {...baseProps} mimeType="application/pdf" />);
    const iframe = document.body.querySelector('iframe');
    expect(iframe).not.toBeNull();
    // The URL is passed through untouched — no string-concatenated
    // #toolbar fragment that could interfere with a signed URL.
    expect(iframe).toHaveAttribute('src', baseProps.url);
  });

  it('sandboxes the inline preview so embedded content cannot script this origin', () => {
    render(<PDFPreview {...baseProps} mimeType="application/pdf" />);
    const iframe = document.body.querySelector('iframe');
    expect(iframe).toHaveAttribute('sandbox');
    const sandboxTokens = (iframe?.getAttribute('sandbox') ?? '').split(/\s+/).filter(Boolean);
    expect(sandboxTokens).not.toContain('allow-scripts');
    expect(sandboxTokens).not.toContain('allow-same-origin');
  });

  it.each(['text/html', 'image/svg+xml', 'application/octet-stream'])(
    'does not render an inline preview for a non-allowlisted client-declared mimeType (%s)',
    (mimeType) => {
      render(<PDFPreview {...baseProps} mimeType={mimeType} />);
      expect(document.body.querySelector('iframe')).toBeNull();
      expect(document.body.querySelector('embed')).toBeNull();
      // Download remains the only way to access the file.
      expect(screen.getByRole('link')).toHaveAttribute('href', baseProps.url);
    }
  );
});
