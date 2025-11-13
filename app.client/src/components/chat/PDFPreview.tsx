import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose, MdDownload, MdZoomIn, MdZoomOut } from 'react-icons/md';
import styled from 'styled-components';

const PDFOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const PDFContainer = styled.div`
  position: relative;
  width: 90vw;
  height: 90vh;
  max-width: 1000px;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const PDFHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  flex-shrink: 0;
`;

const PDFTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #212529;
  flex: 1;
  truncate: true;
`;

const PDFControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const PDFButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: none;
  background: ${props => (props.$variant === 'primary' ? '#007bff' : 'transparent')};
  color: ${props => (props.$variant === 'primary' ? 'white' : '#6c757d')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => (props.$variant === 'primary' ? '#0056b3' : '#e9ecef')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PDFContent = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f8f9fa;
  overflow: hidden;
`;

const PDFEmbed = styled.embed<{ $zoom: number }>`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  transform: scale(${props => props.$zoom});
  transform-origin: center;
  transition: transform 0.2s ease;
`;

const PDFIframe = styled.iframe<{ $zoom: number }>`
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 8px;
  transform: scale(${props => props.$zoom});
  transform-origin: center;
  transition: transform 0.2s ease;
`;

const PDFError = styled.div`
  text-align: center;
  color: #6c757d;

  h4 {
    margin: 0 0 12px 0;
    color: #495057;
  }

  p {
    margin: 0 0 16px 0;
    font-size: 0.875rem;
  }
`;

const DownloadButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: background-color 0.2s ease;

  &:hover {
    background: #0056b3;
  }
`;

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
        setDebugInfo(prev => `${prev}\nAuto-switched to Google Viewer (Firefox + localhost issue)`);
      }

      // Test if the PDF URL is accessible
      fetch(url, { method: 'HEAD' })
        .then(response => {
          setDebugInfo(
            prev =>
              `${prev}\nStatus: ${response.status}\nContent-Type: ${response.headers.get('content-type')}\nContent-Length: ${response.headers.get('content-length')}`
          );
        })
        .catch(error => {
          setDebugInfo(prev => `${prev}\nFetch Error: ${error.message}`);
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
          setZoom(prev => Math.min(prev + 0.25, 2));
          break;
        case '-':
          setZoom(prev => Math.max(prev - 0.25, 0.5));
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

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));

  const renderPDFContent = () => {
    if (viewMethod === 'error') {
      return (
        <PDFError>
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
            <DownloadButton
              href={url}
              download={filename}
              target='_blank'
              rel='noopener noreferrer'
            >
              <MdDownload size={16} />
              Download PDF
            </DownloadButton>
            <DownloadButton href={url} target='_blank' rel='noopener noreferrer'>
              🔗 Open in New Tab
            </DownloadButton>
            <DownloadButton
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
              target='_blank'
              rel='noopener noreferrer'
            >
              📖 Google Viewer
            </DownloadButton>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.75rem' }}>
            Try: Press 1 (embed), 2 (iframe), 3 (Google), 4 (this view)
            <br />
            <strong>Firefox Tip:</strong> Try &quot;Open in New Tab&quot; or download and open
            locally
          </div>
        </PDFError>
      );
    }

    if (viewMethod === 'google') {
      const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      return (
        <PDFIframe
          src={googleViewerUrl}
          title={filename}
          $zoom={zoom}
          onError={() => setViewMethod('error')}
          onLoad={() => {
            setDebugInfo(prev => `${prev}\nGoogle Viewer loaded successfully`);
          }}
        />
      );
    }

    if (viewMethod === 'iframe') {
      return (
        <PDFIframe
          src={`${url}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
          title={filename}
          $zoom={zoom}
          onError={() => {
            setDebugInfo(prev => `${prev}\niFrame failed, trying Google Viewer`);
            setViewMethod('google');
          }}
        />
      );
    }

    return (
      <PDFEmbed
        src={url}
        type='application/pdf'
        title={filename}
        $zoom={zoom}
        onError={() => {
          setDebugInfo(prev => `${prev}\nEmbed failed, trying iFrame`);
          setViewMethod('iframe');
        }}
      />
    );
  };

  return createPortal(
    <PDFOverlay onClick={handleOverlayClick}>
      <PDFContainer onClick={e => e.stopPropagation()}>
        <PDFHeader>
          <PDFTitle>{filename}</PDFTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
            <span>Method:</span>
            <select
              value={viewMethod}
              onChange={e =>
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
              <option value='embed'>Browser Embed</option>
              <option value='iframe'>Browser iFrame</option>
              <option value='google'>Google Viewer (Recommended for Firefox)</option>
              <option value='error'>Debug/Download</option>
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
          <PDFControls>
            {viewMethod !== 'error' && (
              <>
                <PDFButton onClick={handleZoomOut} disabled={zoom <= 0.5}>
                  <MdZoomOut size={18} />
                </PDFButton>
                <PDFButton onClick={handleZoomIn} disabled={zoom >= 2}>
                  <MdZoomIn size={18} />
                </PDFButton>
              </>
            )}
            <PDFButton
              as='a'
              href={url}
              download={filename}
              target='_blank'
              rel='noopener noreferrer'
              $variant='primary'
            >
              <MdDownload size={18} />
            </PDFButton>
            <PDFButton onClick={onClose}>
              <MdClose size={18} />
            </PDFButton>
          </PDFControls>
        </PDFHeader>

        <PDFContent>{renderPDFContent()}</PDFContent>
      </PDFContainer>
    </PDFOverlay>,
    document.body
  );
};
