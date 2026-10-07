import { useEffect } from 'react';
import './SpatialModal.css';

export interface SpatialModalProps {
  isOpen: boolean;
  onClose: () => void;
  type?: 'security' | 'warning' | 'info' | 'success';
  badge?: string;
  title: string;
  description: string;
  meta?: { label: string; value: string }[];
  primaryAction?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function SpatialModal({
  isOpen,
  onClose,
  type = 'security',
  badge = 'SECURITY VERIFICATION',
  title,
  description,
  meta,
  primaryAction,
  secondaryAction,
}: SpatialModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="spatial-modal-backdrop" onClick={onClose}>
      <div 
        className={`spatial-modal-card type-${type}`} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Top Glow Aperture */}
        <div className="spatial-aperture-glow" />

        {/* Header Ribbon */}
        <div className="spatial-modal-header">
          <div className="spatial-badge-pill">
            <span className="spatial-radar-pulse" />
            <span className="spatial-badge-text">{badge}</span>
          </div>
          <button 
            type="button" 
            className="spatial-close-button" 
            onClick={onClose} 
            title="Dismiss notice"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Central Visual Hologram Icon */}
        <div className="spatial-icon-orbit">
          <div className="spatial-orbit-ring ring-outer" />
          <div className="spatial-orbit-ring ring-inner" />
          <div className="spatial-icon-core">
            {type === 'security' && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
            {type === 'warning' && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {type === 'info' && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
            {type === 'success' && (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="spatial-content-area">
          <h2 className="spatial-title">{title}</h2>
          <p className="spatial-description">{description}</p>
        </div>

        {/* Meta Info Grid */}
        {meta && meta.length > 0 && (
          <div className="spatial-meta-grid">
            {meta.map((item, idx) => (
              <div key={idx} className="spatial-meta-chip">
                <span className="spatial-meta-label">{item.label}</span>
                <span className="spatial-meta-value">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Button Row */}
        <div className="spatial-actions-row">
          {secondaryAction && (
            <button
              type="button"
              className="spatial-btn secondary"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              className="spatial-btn primary"
              onClick={primaryAction.onClick}
              disabled={primaryAction.loading}
            >
              {primaryAction.loading ? (
                <span className="spatial-btn-loader" />
              ) : null}
              <span>{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface SpatialToastProps {
  id: string;
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  onDismiss: (id: string) => void;
}

export function SpatialToast({
  id,
  title,
  message,
  type = 'info',
  onDismiss,
}: SpatialToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`spatial-toast-item toast-${type}`}>
      <div className="spatial-toast-accent" />
      <div className="spatial-toast-body">
        {title && <span className="spatial-toast-title">{title}</span>}
        <span className="spatial-toast-message">{message}</span>
      </div>
      <button 
        type="button" 
        className="spatial-toast-close" 
        onClick={() => onDismiss(id)}
        aria-label="Dismiss toast"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
