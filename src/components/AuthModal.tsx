import React, { useState, useEffect, useRef } from 'react';
import { supabaseService, UserProfile, TELEGRAM_BOT_USERNAME } from '../lib/supabase';
import { FaceScanner } from './FaceScanner';
import './AuthModal.css';

interface AuthModalProps {
  googleAccount?: { id: string; email: string; name?: string; avatar?: string } | null;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  googleAccount: initialGoogleAccount,
  onClose,
  onAuthSuccess,
}) => {
  const [googleAccount, setGoogleAccount] = useState(initialGoogleAccount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [catchphrase, setCatchphrase] = useState('');

  // Telegram 1-Tap Phone Verification State
  const [telegramSession, setTelegramSession] = useState<{ code: string; telegramLink: string } | null>(null);
  const [waitingTelegram, setWaitingTelegram] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleStartTelegramVerification = async () => {
    setPinError(null);
    if (telegramSession && waitingTelegram) {
      window.open(telegramSession.telegramLink, '_blank');
      return;
    }
    const session = await supabaseService.createPhoneVerificationSession();
    setTelegramSession(session);
    setWaitingTelegram(true);

    // Open Telegram Bot
    window.open(session.telegramLink, '_blank');

    // Poll for verification status every 2 seconds
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      const res = await supabaseService.checkPhoneVerificationStatus(session.code);
      if (res.verified && res.phoneNumber) {
        setPhoneNumber(res.phoneNumber);
        setPhoneVerified(true);
        setWaitingTelegram(false);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      }
    }, 2000);
  };

  const handleVerifyPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!enteredPin.trim()) return;
    setPinError(null);

    const res = await supabaseService.verifyPhonePin(enteredPin);
    if (res.valid && res.phoneNumber) {
      setPhoneNumber(res.phoneNumber);
      setPhoneVerified(true);
      setWaitingTelegram(false);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    } else {
      setPinError('Invalid PIN code. Please check the PIN sent in Telegram.');
    }
  };

  // FAANG-scale availability state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Biometric face scan state (mandatory for audit record)
  const [faceScanImage, setFaceScanImage] = useState<string | null>(null);
  const [isScanningFace, setIsScanningFace] = useState(false);

  // Custom public profile avatar state (optional, under 2MB)
  const [customAvatarImage, setCustomAvatarImage] = useState<string | null>(null);

  // Real-time debounced availability check
  useEffect(() => {
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameStatus('idle');
      setSuggestions([]);
      return;
    }

    setUsernameStatus('checking');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      const res = await supabaseService.checkUsernameAvailability(trimmed);
      if (res.available) {
        setUsernameStatus('available');
        setSuggestions([]);
      } else {
        setUsernameStatus('taken');
        setSuggestions(res.suggestions);
      }
    }, 280);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [username]);

  // Trigger Google Sign-In
  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);

    if (!supabaseService.isConfigured()) {
      // Local dev simulation
      const mockGoogle = {
        id: 'google_' + Date.now(),
        email: 'student@college.edu',
        name: 'College Student',
        avatar: '',
      };
      setGoogleAccount(mockGoogle);
      setLoading(false);
      return;
    }

    const res = await supabaseService.signInWithGoogle();
    if (res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  // Submit complete onboarding setup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    const cleanPhone = phoneNumber.trim();

    if (!cleanUsername) {
      setError('Username is mandatory.');
      return;
    }

    if (usernameStatus === 'taken') {
      setError('This username is already taken. Please choose another or click a suggestion.');
      return;
    }

    if (!cleanPhone || !phoneVerified) {
      setError('Student mobile number must be verified via Telegram Bot.');
      return;
    }

    if (!faceScanImage) {
      setError('Biometric face scan is required for student verification record.');
      return;
    }

    setLoading(true);

    try {
      const result = await supabaseService.registerStudent({
        username: cleanUsername,
        phoneNumber: cleanPhone,
        catchphrase: catchphrase.trim(), // Optional!
        faceScanBase64: faceScanImage,
        customAvatarBase64: customAvatarImage || undefined,
        email: googleAccount?.email,
      });

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      if (result.user) {
        // Link Google email and avatar if available
        result.user.email = googleAccount?.email;
        onAuthSuccess(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Setup error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <h2 className="auth-title">
            {!googleAccount ? 'AUTHENTICATION // GOOGLE SIGN IN' : 'FIRST-TIME SETUP // FACE ID'}
          </h2>
          <button className="auth-close-btn" onClick={onClose} title="Close (ESC)">
            ✕
          </button>
        </div>

        {error && <div className="auth-error">⚠ {error}</div>}

        {/* Step 1: Google OAuth is the ONLY authentication method */}
        {!googleAccount ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
            <p style={{ fontSize: '0.85rem', color: '#8df0b4', lineHeight: 1.5, margin: 0 }}>
              All students must sign in using their Google account for campus authentication.
            </p>

            <button
              type="button"
              className="google-auth-btn"
              onClick={handleGoogleAuth}
              disabled={loading}
              style={{ minHeight: '52px', fontSize: '0.95rem' }}
            >
              <svg viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.26v3.15C3.27 21.37 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.26c-.24-.72-.38-1.49-.38-2.26s.14-1.54.38-2.26V6.59H1.26C.46 8.18 0 9.99 0 12s.46 3.82 1.26 5.41l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.63 1.26 6.59l4.02 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                />
              </svg>
              {loading ? 'CONNECTING TO GOOGLE...' : 'CONTINUE WITH GOOGLE'}
            </button>

            <div style={{ fontSize: '0.72rem', color: '#4f9a76', textAlign: 'center' }}>
              First-time sign up includes Biometric Face ID scan and unique username setup.
            </div>
          </div>
        ) : (
          /* Step 2: Post-Google First-Time Onboarding Form */
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Confirmed Google Account Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(28,236,132,0.1)',
                border: '1px solid rgba(141,240,180,0.3)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#8df0b4',
              }}
            >
              <span>✅ Google Linked:</span>
              <strong style={{ color: '#fff' }}>{googleAccount.email}</strong>
            </div>

            {/* Field 1: Phone Number (Mandatory, Cryptographically Verified via Telegram Bot) */}
            <div className="form-group">
              <div className="label-row">
                <label className="form-label">
                  Student Mobile Number <span style={{ color: '#ff8888' }}>*</span>
                </label>
                <span className={`phone-lock-badge ${phoneVerified ? 'locked' : ''}`}>
                  {phoneVerified ? '✅ VERIFIED & PERMANENTLY LOCKED' : '🔒 1-TAP TELEGRAM VERIFICATION'}
                </span>
              </div>

              {!phoneVerified ? (
                <div className="telegram-verify-box">
                  <button
                    type="button"
                    className="telegram-verify-btn"
                    onClick={handleStartTelegramVerification}
                  >
                    <span>📱</span>
                    <span>{waitingTelegram ? 'RE-OPEN TELEGRAM BOT' : '1-TAP VERIFY VIA TELEGRAM BOT'}</span>
                  </button>

                  {waitingTelegram && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="telegram-waiting-pill">
                        <span className="pulse-indicator">●</span>
                        <span>Waiting for 1-tap contact share in Telegram...</span>
                      </div>

                      <div style={{ fontSize: '0.7rem', color: '#8df0b4', opacity: 0.8 }}>
                        Or enter the 4-digit confirmation PIN sent by the bot:
                      </div>

                      <div className="telegram-pin-input-row">
                        <input
                          type="text"
                          className="telegram-pin-input"
                          placeholder="e.g. 7482"
                          maxLength={6}
                          value={enteredPin}
                          onChange={(e) => setEnteredPin(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleVerifyPin();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="telegram-pin-btn"
                          onClick={() => handleVerifyPin()}
                        >
                          CONFIRM PIN
                        </button>
                      </div>

                      {pinError && (
                        <div style={{ fontSize: '0.72rem', color: '#ff8888' }}>⚠ {pinError}</div>
                      )}
                    </div>
                  )}

                  <span style={{ fontSize: '0.68rem', color: '#68ab8b', lineHeight: 1.4 }}>
                    ℹ Tap the button to launch {TELEGRAM_BOT_USERNAME ? `@${TELEGRAM_BOT_USERNAME}` : 'the Telegram verification bot'}. Share your contact with 1 tap — Telegram cryptographically verifies your real phone number without SMS delays.
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <input
                    type="tel"
                    className="form-input"
                    value={phoneNumber}
                    disabled
                    readOnly
                    style={{
                      borderColor: '#1cec84',
                      color: '#1cec84',
                      fontWeight: 600,
                      background: 'rgba(28, 236, 132, 0.08)',
                    }}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#1cec84' }}>
                    ✔ Cryptographically verified via Telegram. Permanently linked to your student profile.
                  </span>
                </div>
              )}
            </div>

            {/* Field 2: Select Anonymous Username (Mandatory with FAANG Availability) */}
            <div className="form-group">
              <div className="label-row">
                <label className="form-label">
                  Select Username <span style={{ color: '#ff8888' }}>*</span>
                </label>
                <span className={`username-status ${usernameStatus}`}>
                  {usernameStatus === 'checking' && '🔍 Checking...'}
                  {usernameStatus === 'available' && '✅ Available'}
                  {usernameStatus === 'taken' && '❌ Taken'}
                </span>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Neo, CyberGhost, QuantumCoder"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />

              {/* Suggestions Chips if Taken */}
              {suggestions.length > 0 && (
                <div className="suggestions-box">
                  <span className="suggestions-title">Available Suggestions:</span>
                  <div className="suggestions-list">
                    {suggestions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => setUsername(item)}
                      >
                        +{item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Field 3: Biometric Face Scan ID (Mandatory for record / audit only) */}
            <div className="face-id-section">
              <div className="face-id-header">
                <span className="face-id-title">
                  BIOMETRIC FACE SCAN <span style={{ color: '#ff8888' }}>* (Mandatory Audit Record)</span>
                </span>
                <span className={`face-status-badge ${faceScanImage ? 'captured' : 'optional'}`}>
                  {faceScanImage ? '● SCANNED & RECORDED' : '● REQUIRED'}
                </span>
              </div>

              <p style={{ fontSize: '0.74rem', color: '#8df0b4', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                🔒 <strong>Identity Verification:</strong> Your biometric face scan is stored securely for college administration records only. It is <strong>NEVER</strong> used as your public profile picture.
              </p>

              {isScanningFace ? (
                <div style={{ marginBottom: '12px' }}>
                  <FaceScanner
                    onCapture={(base64) => {
                      setFaceScanImage(base64);
                      setIsScanningFace(false);
                    }}
                    onCancel={() => setIsScanningFace(false)}
                  />
                </div>
              ) : !faceScanImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="scanner-btn-primary"
                    onClick={() => setIsScanningFace(true)}
                  >
                    📷 LAUNCH BIOMETRIC FACE SCANNER
                  </button>
                  <label className="scanner-btn-secondary" style={{ cursor: 'pointer', textAlign: 'center' }}>
                    📁 UPLOAD PHOTO FALLBACK (IF NO WEBCAM)
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setFaceScanImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="face-preview-card">
                  <img src={faceScanImage} alt="Biometric Face Scan Record" className="face-thumbnail" />
                  <div className="face-info">
                    <span className="face-info-title">Biometric Record Verified</span>
                    <span className="face-info-subtitle">Secured for college administration</span>
                  </div>
                  <button
                    type="button"
                    className="face-retake-btn"
                    onClick={() => {
                      setFaceScanImage(null);
                      setIsScanningFace(true);
                    }}
                  >
                    Rescan
                  </button>
                </div>
              )}
            </div>

            {/* Field 4: Custom Profile Picture (Optional, max 2 MB) */}
            <div className="face-id-section" style={{ borderColor: 'rgba(56, 189, 248, 0.25)' }}>
              <div className="face-id-header">
                <span className="face-id-title">
                  PUBLIC PROFILE AVATAR <span style={{ color: '#38bdf8' }}>(Optional, max 2 MB)</span>
                </span>
                <span className={`face-status-badge ${customAvatarImage ? 'captured' : 'optional'}`}>
                  {customAvatarImage ? '● SELECTED' : '○ OPTIONAL'}
                </span>
              </div>

              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                🖼 Upload a custom image or avatar for your public classroom presence. If skipped, your initials are shown.
              </p>

              {!customAvatarImage ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label className="scanner-btn-primary" style={{ cursor: 'pointer', textAlign: 'center', background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}>
                    📁 CHOOSE PUBLIC AVATAR PHOTO
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) {
                          setError(`Selected image is ${(file.size / (1024 * 1024)).toFixed(2)} MB. Must be under 2 MB.`);
                          return;
                        }
                        setError(null);
                        const reader = new FileReader();
                        reader.onload = () => setCustomAvatarImage(reader.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              ) : (
                <div className="face-preview-card">
                  <img src={customAvatarImage} alt="Custom Avatar" className="face-thumbnail" />
                  <div className="face-info">
                    <span className="face-info-title">Custom Avatar Selected</span>
                    <span className="face-info-subtitle">Will display on your classroom profile</span>
                  </div>
                  <button
                    type="button"
                    className="face-retake-btn"
                    onClick={() => setCustomAvatarImage(null)}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Field 5: Catchphrase (Optional! Can be edited later via Profile icon) */}
            <div className="form-group">
              <div className="label-row">
                <label className="form-label">
                  Bio / Catchphrase <span style={{ color: '#4f9a76' }}>(Optional)</span>
                </label>
                <span style={{ fontSize: '0.68rem', color: '#4f9a76' }}>{catchphrase.length}/60</span>
              </div>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Always sitting in row 2 (Editable anytime in profile)"
                maxLength={60}
                value={catchphrase}
                onChange={(e) => setCatchphrase(e.target.value)}
              />
              <span style={{ fontSize: '0.68rem', color: '#4f9a76' }}>
                💡 You can edit this bio anytime by clicking your profile icon in the classroom.
              </span>
            </div>

            {/* Final Submit Button */}
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={
                loading ||
                usernameStatus === 'taken' ||
                !faceScanImage ||
                !phoneVerified ||
                !phoneNumber.trim() ||
                !username.trim()
              }
            >
              {loading ? 'TRANSMITTING CREDENTIALS...' : 'COMPLETE REGISTRATION & ENTER ↵'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
