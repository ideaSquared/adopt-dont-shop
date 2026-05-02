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
  const [viewMethod, setViewMethod] = useState<'embed' | 'iframe' | 'google' | 'error'>('google'); // Default to Google Viewer for Firefox
  const [debugInfo, setDebugInfo] = useState<string>('');

  // Debug the PDF URL when component opens
  useEffect(() => {
    if (isOpen && url) {
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      const isLocalhost = url.includes('localhost') || url.includes('127.0.0.1');

      setDebugInfo(`URL: ${url}
Browser: ${navigator.userAgent.substring(0, 50)}...
Firefox: ${isFirefox}
Localhost: ${isLocalhost}`);

      // Firefox has issues with PDF embeds, especially on localhost
      if (isFirefox && isLocalhost) {
        setViewMethod('google');
        setDebugInfo(
          (prev) => `${prev}\nAuto-switched to Google Viewer (Firefox + localhost issue)`
        );
      }

      // Test if the PDF URL is accessible
      fetch(url, { method: 'HEAD' })
        .then((response) => {
          setDebugInfo(
            (prev) =>
              `${prev}\nStatus: ${response.status}\nContent-Type: ${response.headers.get('content-type')}\nContent-Length: ${response.headers.get('content-length')}`
          );
        })
        .catch((error) => {
          setDebugInfo((prev) => `${prev}\nFetch Error: ${error.message}`);
        });
    }
  }, [isOpen, url, filename]);

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
        case '1':
        case '2':
        case '3':
        case '4': {
          const methods = ['embed', 'iframe', 'google', 'error'] as const;
          const method = methods[parseInt(e.key) - 1];
          if (method) {
            setViewMethod(method);
          }
          break;
        }
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
    if (viewMethod === 'error') {
      return (
        <div className={styles.pdfError}>
          <h4>PDF Preview Not Available</h4>
          <p>Firefox on localhost often has PDF embedding issues.</p>
          <div
            style={{
              fontSize: '0.75rem',
              marginBottom: '16px',
              textAlign: 'left',
              maxHeight: '120px',
              overflow: 'auto',
              background: '#f8f9fa',
              padding: '8px',
              borderRadius: '4px',
            }}
          >
            <strong>Debug Info:</strong>
            <br />
            <pre style={{ margin: 0, fontSize: '0.7rem', whiteSpace: 'pre-wrap' }}>{debugInfo}</pre>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <a
              className={styles.downloadLink}
              href={url}
              download={filename}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MdDownload size={16} />
              Download PDF
            </a>
            <a className={styles.downloadLink} href={url} target="_blank" rel="noopener noreferrer">
              🔗 Open in New Tab
            </a>
            <a
              className={styles.downloadLink}
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📖 Google Viewer
            </a>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.75rem' }}>
            Try: Press 1 (embed), 2 (iframe), 3 (Google), 4 (this view)
            <br />
            <strong>Firefox Tip:</strong> Try &quot;Open in New Tab&quot; or download and open
            locally
          </div>
        </div>
      );
    }

    if (viewMethod === 'google') {
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <iframe
          className={styles.pdfIframe}
          style={{ transform: `scale(${zoom})` }}
          src={googleViewerUrl}
          title={filename}
          onError={() => setViewMethod('error')}
          onLoad={() => {
            setDebugInfo((prev) => `${prev}\nGoogle Viewer loaded successfully`);
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
          onError={() => {
            setDebugInfo((prev) => `${prev}\niFrame failed, trying Google Viewer`);
            setViewMethod('google');
          }}
        />
      );
    }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <span>Method:</span>
            <select
              value={viewMethod}
              onChange={(e) =>
                setViewMethod(e.target.value as 'embed' | 'iframe' | 'google' | 'error')
              }
              style={{
                padding: '2px 4px',
                fontSize: '0.75rem',
                background: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            >
              <option value="embed">Browser Embed</option>
              <option value="iframe">Browser iFrame</option>
              <option value="google">Google Viewer (Recommended for Firefox)</option>
              <option value="error">Debug/Download</option>
            </select>
            <span
              style={{
                color:
                  viewMethod === 'google'
                    ? '#28a745'
                    : viewMethod === 'error'
                      ? '#dc3545'
                      : '#6c757d',
                fontSize: '0.7rem',
              }}
            >
              {viewMethod === 'google' && '✓ Best for Firefox'}
              {viewMethod === 'error' && '⚠ Debug mode'}
              {viewMethod === 'embed' && '⚠ May fail in Firefox'}
              {viewMethod === 'iframe' && '⚠ May fail on localhost'}
            </span>
          </div>
          <div className={styles.pdfControls}>
            {viewMethod !== 'error' && (
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
