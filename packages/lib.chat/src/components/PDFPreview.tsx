import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdDownload, MdZoomIn, MdZoomOut } from 'react-icons/md';
import * as styles from './PDFPreview.css';

interface PDFPreviewProps {
  url: string;
  filename: string;
  mimeType: string;
  isOpen: boolean;
  onClose: () => void;
}

// The "is this a PDF?" mimeType is client-declared (set by whoever created
// the message record), not verified against the served bytes. Only render
// an inline preview for a strict allowlist, and treat everything else as
// download-only — never trust an unverified mimeType to pick an embedded
// renderer.
const PREVIEWABLE_MIME_TYPES: readonly string[] = ['application/pdf'];

export const PDFPreview: React.FC<PDFPreviewProps> = ({
  url,
  filename,
  mimeType,
  isOpen,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 0.25, 2));
          break;
        case '-':
          setZoom((prev) => Math.max(prev - 0.25, 0.5));
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));

  const canPreviewInline = PREVIEWABLE_MIME_TYPES.includes(mimeType);

  // Rendered with the browser's native PDF viewer. We never hand the
  // attachment URL — which for a signed-URL scheme carries the signature
  // and expiry — to a third-party viewer such as Google Docs Viewer; there
  // is no fallback path that does so.
  //
  // The frame is sandboxed without allow-scripts/allow-same-origin: if the
  // server ever serves bytes that don't match the declared mimeType (e.g.
  // an HTML file registered as application/pdf), any script it contains
  // cannot execute or read this origin's cookies/DOM. The URL itself is
  // passed through untouched — no string-concatenated fragment.
  const renderPDFContent = () => {
    if (!canPreviewInline) {
      return (
        <div className={styles.pdfError}>
          <p>Preview isn&apos;t available for this file type. Use the download button above.</p>
        </div>
      );
    }

    return (
      <iframe
        className={styles.pdfIframe}
        style={{ transform: `scale(${zoom})` }}
        src={url}
        title={filename}
        sandbox=""
      />
    );
  };

  return createPortal(
    <div
      className={styles.pdfOverlay}
      role="presentation"
      onClick={handleOverlayClick}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        className={styles.pdfContainer}
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className={styles.pdfHeader}>
          <h3 className={styles.pdfTitle}>{filename}</h3>
          <div className={styles.pdfControls}>
            {canPreviewInline && (
              <>
                <button
                  className={styles.pdfButtonDefault}
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5}
                >
                  <MdZoomOut size={18} />
                </button>
                <button
                  className={styles.pdfButtonDefault}
                  onClick={handleZoomIn}
                  disabled={zoom >= 2}
                >
                  <MdZoomIn size={18} />
                </button>
              </>
            )}
            <a
              className={styles.pdfButtonPrimary}
              href={url}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MdDownload size={18} />
            </a>
            <button className={styles.pdfButtonDefault} onClick={onClose}>
              <MdClose size={18} />
            </button>
          </div>
        </div>

        <div className={styles.pdfContent}>{renderPDFContent()}</div>
      </div>
    </div>,
    document.body
  );
};
