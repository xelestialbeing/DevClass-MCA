import React, { useState, useRef } from 'react';
import { UserProfile, supabaseService } from '../lib/supabase';
import './ProfileModal.css';

interface ProfileModalProps {
  user: UserProfile;
  onClose: () => void;
  onUpdateUser: (updated: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  onClose,
  onUpdateUser,
}) => {
  const [catchphrase, setCatchphrase] = useState(user.catchphrase || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handler enforcing < 2MB limit
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      onUpdateUser(updated);
      setPhotoSuccess('Profile photo updated successfully!');
      setTimeout(() => setPhotoSuccess(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoError(null);
    const updated = await supabaseService.updateProfilePicture(user.id, null);
    onUpdateUser(updated);
    setPhotoSuccess('Profile photo removed.');
    setTimeout(() => setPhotoSuccess(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    const updated = await supabaseService.updateCatchphrase(user.id, catchphrase.trim());
    setSaving(false);
    setSavedSuccess(true);
    onUpdateUser(updated);

    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="profile-header">
          <h2 className="profile-title">STUDENT IDENTITY // PROFILE</h2>
          <button className="profile-close-btn" onClick={onClose} title="Close (ESC)">
            ✕
          </button>
        </div>

        {/* Identity & Profile Photo Row */}
        <div className="profile-avatar-row">
          <div
            className="avatar-preview-wrap"
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload custom public avatar (max 2 MB)"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username} className="profile-face-photo" />
            ) : (
              <div className="profile-avatar-fallback">{user.avatar || user.username.charAt(0).toUpperCase() || 'S'}</div>
            )}
            <div className="avatar-overlay-hint">Change</div>
          </div>

          <div className="profile-meta-col">
            <span className="profile-username">@{user.username}</span>
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
            {photoError && <span className="photo-error-text">⚠ {photoError}</span>}
            {photoSuccess && <span className="photo-success-text">✓ {photoSuccess}</span>}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {/* Non-Editable Verified Identity Information */}
        <div className="profile-info-grid">
          <div className="profile-info-item">
            <span className="info-label">Account Status</span>
            <span className="info-value">
              {user.isApproved || user.faceScanStatus === 'verified' ? (
                <span style={{ color: '#34d399', fontWeight: 600 }}>✅ Approved & Active</span>
              ) : (
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>⏳ Pending Admin Review (Voting & Seat Claims Locked)</span>
              )}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="info-label">Biometric Audit Record</span>
            <span className="info-value">
              {user.faceScanUrl ? '🔒 Biometric Scan Recorded for College' : 'Not Recorded'}
            </span>
          </div>

          <div className="profile-info-item">
            <span className="info-label">Mobile Number</span>
            <span className="info-value">
              {user.phoneNumber || 'Not Linked'}
              <span className="locked-badge">🔒 NON-EDITABLE</span>
            </span>
          </div>

          <div className="profile-info-item">
            <span className="info-label">Google Account</span>
            <span className="info-value">{user.email || 'Google Verified'}</span>
          </div>

          <div className="profile-info-item">
            <span className="info-label">Seat Registry</span>
            <span className="info-value">Room 104 (Batch 2026)</span>
          </div>
        </div>

        {/* Editable Catchphrase Section */}
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
      </div>
    </div>
  );
};
