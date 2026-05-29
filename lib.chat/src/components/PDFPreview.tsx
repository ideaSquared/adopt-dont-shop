import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdDownload, MdZoomIn, MdZoomOut } from 'react-icons/md';
import * as styles from './PDFPreview.css';

interface PDFPreviewProps {
  url: string;
  filename: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PDFPreview: React.FC<PDFPreviewProps> = ({ url, filename, isOpen, onClose }) => {
  const [zoom, setZoom] = useState(1);
  // Default to inline embed; fall back to Google Viewer only when the embed errors.
  const [viewMethod, setViewMethod] = useState<'embed' | 'iframe' | 'google'>('embed');

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

  const renderPDFContent = () => {
    if (viewMethod === 'google') {
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <iframe
          className={styles.pdfIframe}
          style={{ transform: `scale(${zoom})` }}
          src={googleViewerUrl}
          title={filename}
          onError={() => {
            // Google Viewer failed — fall back to a download prompt via
            // the download link in the header.
          }}
        />
      );
    }

    if (viewMethod === 'iframe') {
      return (
        <iframe
          className={styles.pdfIframe}
          style={{ transform: `scale(${zoom})` }}
          src={`${url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
          title={filename}
          onError={() => setViewMethod('google')}
        />
      );
    }

    // Default: inline <embed>. Falls back to Google Viewer on error.
    return (
      <embed
        className={styles.pdfEmbed}
        style={{ transform: `scale(${zoom})` }}
        src={url}
        type="application/pdf"
        title={filename}
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
            <button
              className={styles.pdfButtonDefault}
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
            >
              <MdZoomOut size={18} />
            </button>
            <button className={styles.pdfButtonDefault} onClick={handleZoomIn} disabled={zoom >= 2}>
              <MdZoomIn size={18} />
            </button>
            <button
              className={styles.pdfButtonDefault}
              onClick={() => setViewMethod('google')}
              title="Open with Google Viewer"
            >
              &#128196;
            </button>
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
