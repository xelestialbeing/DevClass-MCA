import React, { useState, useRef } from 'react';
import { UserProfile, supabaseService } from '../lib/supabase';
import './ProfileModal.css';

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateUser?: (updated: UserProfile) => void;
  isReadOnly?: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onUpdateUser,
  isReadOnly = false,
}) => {
  const [catchphrase, setCatchphrase] = useState(user.catchphrase || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handler enforcing < 2MB limit
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoError(null);
    setPhotoSuccess(null);

    // Limit check: under 2MB
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError(`Image exceeds 2 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB). Please pick a smaller image.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const updated = await supabaseService.updateProfilePicture(user.id, dataUrl);
      onUpdateUser?.(updated);
      setPhotoSuccess('Profile photo updated successfully!');
      setTimeout(() => setPhotoSuccess(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (isReadOnly) return;
    setPhotoError(null);
    const updated = await supabaseService.updateProfilePicture(user.id, null);
    onUpdateUser?.(updated);
    setPhotoSuccess('Profile photo removed.');
    setTimeout(() => setPhotoSuccess(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSaving(true);
    setSavedSuccess(false);

    const updated = await supabaseService.updateCatchphrase(user.id, catchphrase.trim());
    setSaving(false);
    setSavedSuccess(true);
    onUpdateUser?.(updated);

    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2 className="profile-title">
            {isReadOnly ? `STUDENT PROFILE // @${user.username.toUpperCase()}` : 'STUDENT IDENTITY // PROFILE'}
          </h2>
          <button className="profile-close-btn" onClick={onClose} title="Close (ESC)">
            ✕
          </button>
        </div>

        {/* Identity & Profile Photo Row */}
        <div className="profile-avatar-row">
          <div
            className={`avatar-preview-wrap ${isReadOnly ? 'readonly' : ''}`}
            onClick={() => !isReadOnly && fileInputRef.current?.click()}
            title={isReadOnly ? `@${user.username}` : 'Click to upload custom public avatar (max 2 MB)'}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="profile-face-photo" />
            ) : (
              <div className="profile-avatar-fallback">{user.avatar || user.username.charAt(0).toUpperCase() || 'S'}</div>
            )}
            {!isReadOnly && <div className="avatar-overlay-hint">Change</div>}
          </div>

          <div className="profile-meta-col">
            <span className="profile-username">@{user.username}</span>
            {!isReadOnly ? (
              <div className="avatar-action-links">
                <button
                  type="button"
                  className="profile-link-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📸 Upload Avatar (max 2MB)
                </button>
                {user.avatarUrl && (
                  <button
                    type="button"
                    className="profile-link-btn danger"
                    onClick={handleRemovePhoto}
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <span className="profile-status-badge">
                {user.isApproved || user.faceScanStatus === 'verified'
                  ? 'DevClass MCA Verified Member'
                  : 'Pending Student Verification'}
              </span>
            )}
            {photoError && <span className="photo-error-text">⚠ {photoError}</span>}
            {photoSuccess && <span className="photo-success-text">✓ {photoSuccess}</span>}
          </div>

          {!isReadOnly && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}
        </div>

        {/* Verified Identity Information */}
        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="info-label">Account Status</span>
            <span className="info-value">
              {user.isApproved || user.faceScanStatus === 'verified' ? (
                <span style={{ color: '#34d399', fontWeight: 600 }}>✅ Approved & Active</span>
              ) : (
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>⏳ Pending Admin Review</span>
              )}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="info-label">Biometric Clearance</span>
            <span className="info-value">
              {user.faceScanUrl || user.faceScanStatus === 'verified'
                ? '🔒 Verified College Biometric'
                : 'Pending Verification'}
            </span>
          </div>

          {!isReadOnly && (
            <div className="profile-info-item">
              <span className="info-label">Mobile Number</span>
              <span className="info-value">
                {user.phoneNumber || 'Not Linked'}
                <span className="locked-badge">🔒 NON-EDITABLE</span>
              </span>
            </div>
          )}

          <div className="profile-info-item">
            <span className="info-label">Google Identity</span>
            <span className="info-value">
              {isReadOnly ? 'Google SSO Verified' : user.email || 'Google Verified'}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="info-label">Classroom Hall</span>
            <span className="info-value">DevClass MCA (Batch 2026)</span>
          </div>
        </div>

        {/* Catchphrase Section: Read-only or Editable */}
        {isReadOnly ? (
          <div className="catchphrase-edit-box readonly">
            <div className="catchphrase-header">
              <span className="catchphrase-label">Bio / Catchphrase</span>
            </div>
            <div className="catchphrase-readonly-quote">
              "{user.catchphrase || 'Always present and coding.'}"
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="catchphrase-edit-box">
            <div className="catchphrase-header">
              <label className="catchphrase-label">Bio / Catchphrase</label>
              <span className="catchphrase-counter">{catchphrase.length}/60</span>
            </div>

            <input
              type="text"
              className="catchphrase-input"
              placeholder="e.g. Always sitting in row 2, Coming if attendance matters"
              maxLength={60}
              value={catchphrase}
              onChange={(e) => setCatchphrase(e.target.value)}
            />

            <button
              type="submit"
              className="save-catchphrase-btn"
              disabled={saving || catchphrase === user.catchphrase}
            >
              {saving ? 'UPDATING...' : '💾 SAVE CATCHPHRASE'}
            </button>

            {savedSuccess && (
              <div className="save-success-msg">✓ Catchphrase updated on classroom desk!</div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
