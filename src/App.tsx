import React, { useState, useEffect, useRef } from 'react';
import { CrtBackground } from './shaders/crt/CrtBackground';
import { UplinkLoader } from './shaders/uplink-loader/UplinkLoader';
import { Classroom } from './components/Classroom';
import { AuthModal } from './components/AuthModal';
import { supabaseService, UserProfile } from './lib/supabase';
import './shaders/threeui.css';
import './App.css';

export function App() {
  // Authentication & Navigation State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => supabaseService.getCurrentUser());
  const [inClassroom, setInClassroom] = useState<boolean>(() => !!supabaseService.getCurrentUser());
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState('AUTHENTICATING IDENTITY...');

  // CRT Terminal user typing state
  const [terminalStep, setTerminalStep] = useState<'username' | 'password'>('username');
  const [typedUsername, setTypedUsername] = useState('');
  const [typedPassword, setTypedPassword] = useState('');
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Google Onboarding State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingGoogleAccount, setPendingGoogleAccount] = useState<{
    id: string;
    email: string;
    name?: string;
    avatar?: string;
  } | null>(null);

  // Check if returning from Google OAuth redirect on page load
  useEffect(() => {
    const checkRedirect = async () => {
      const result = await supabaseService.checkGoogleCallback();
      if (result) {
        if (result.needsSetup && result.googleAccount) {
          // New student: prompt for Username onboarding
          setPendingGoogleAccount(result.googleAccount);
          setShowAuthModal(true);
        } else if (result.existingUser) {
          // Existing student: straight to classroom
          handleAuthSuccess(result.existingUser);
        }
      }
    };

    checkRedirect();
  }, []);

  // Terminal Enter or Sign In submission
  const handleTerminalSubmit = async () => {
    if (isAuthenticating || inClassroom || showAuthModal) return;

    if (terminalStep === 'username') {
      const clean = typedUsername.trim();
      if (!clean) {
        // Empty input -> Proceed directly to Google Sign In / Sign Up
        handleGoogleSignIn();
        return;
      }

      // Username entered -> transition to password input
      setTerminalStep('password');
      setTypedPassword('');
      setTimeout(() => mobileInputRef.current?.focus(), 50);
      return;
    }

    // Password step: execute direct login
    const cleanUser = typedUsername.trim();
    if (!cleanUser) {
      setTerminalStep('username');
      return;
    }

    setIsAuthenticating(true);
    setAuthStatusMessage(`AUTHENTICATING @${cleanUser.toUpperCase()}...`);

    const existing = await supabaseService.getUserByUsername(cleanUser);
    if (existing) {
      handleAuthSuccess(existing);
    } else {
      // Username not found -> proceed to Google signup
      setAuthStatusMessage(`@${cleanUser.toUpperCase()} NOT FOUND // CONTINUING TO GOOGLE SIGN UP...`);
      setTimeout(() => {
        handleGoogleSignIn();
      }, 1500);
    }
  };

  // Keyboard routing on landing page: route cleanly into the hidden input without doubling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAuthModal || inClassroom || isAuthenticating) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        handleTerminalSubmit();
        return;
      }

      if (e.key === 'Escape' && terminalStep === 'password') {
        e.preventDefault();
        setTerminalStep('username');
        setTypedPassword('');
        return;
      }

      // If key is typed outside of active input, focus the input
      if (document.activeElement !== mobileInputRef.current) {
        mobileInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuthModal, inClassroom, isAuthenticating, terminalStep, typedUsername, typedPassword]);

  // Primary Single-Sign-On Trigger
  const handleGoogleSignIn = async () => {
    if (!supabaseService.isConfigured()) {
      // Local dev simulation mode when keys are not yet configured
      setPendingGoogleAccount({
        id: 'google_local_' + Date.now(),
        email: 'student@college.edu',
        name: 'College Student',
        avatar: '',
      });
      setShowAuthModal(true);
      return;
    }

    // Live Supabase Google OAuth redirect
    setIsAuthenticating(true);
    setAuthStatusMessage('CONNECTING TO GOOGLE AUTHENTICATION...');
    const res = await supabaseService.signInWithGoogle();
    if (res.error) {
      setAuthStatusMessage(`AUTHENTICATION FAILED: ${res.error.toUpperCase()}`);
      setTimeout(() => {
        setIsAuthenticating(false);
      }, 3000);
    }
  };

  // Called when user completes Google + Face ID setup
  const handleAuthSuccess = (user: UserProfile) => {
    setShowAuthModal(false);
    setCurrentUser(user);
    setIsAuthenticating(true);
    setAuthStatusMessage(
      user.faceScanStatus === 'pending'
        ? `BIOMETRICS DISPATCHED TO TELEGRAM ADMIN // CONNECTING ${user.username.toUpperCase()}...`
        : `GOOGLE SSO VERIFIED // WELCOME ${user.username.toUpperCase()}...`
    );

    setTimeout(() => {
      setIsAuthenticating(false);
      setInClassroom(true);
    }, 3200);
  };

  const handleSignOut = () => {
    supabaseService.signOut();
    setCurrentUser(null);
    setInClassroom(false);
    setPendingGoogleAccount(null);
  };

  // If in Classroom, show classroom view
  if (inClassroom) {
    return <Classroom currentUser={currentUser} onSignOut={handleSignOut} />;
  }

  return (
    <div 
      className="terminal-landing"
      onClick={() => {
        if (!showAuthModal && !isAuthenticating) {
          mobileInputRef.current?.focus();
        }
      }}
    >
      {/* Invisible full-screen input capturing virtual keyboard on mobile / Android */}
      <input
        ref={mobileInputRef}
        type={terminalStep === 'password' ? 'password' : 'text'}
        className="crt-hidden-input"
        value={terminalStep === 'username' ? typedUsername : typedPassword}
        onChange={(e) => {
          if (terminalStep === 'username') {
            setTypedUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''));
          } else {
            setTypedPassword(e.target.value);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleTerminalSubmit();
          } else if (e.key === 'Escape' && terminalStep === 'password') {
            e.preventDefault();
            setTerminalStep('username');
            setTypedPassword('');
          } else if (e.key === 'Backspace' && terminalStep === 'password' && typedPassword === '') {
            e.preventDefault();
            setTerminalStep('username');
          }
        }}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck="false"
      />
      {/* 
        Condition 1: UplinkLoader ONLY pops up when someone signs in.
        Never shows on initial page visit.
      */}
      {isAuthenticating ? (
        <div className="shader-frame" style={{ width: '100%', height: '100%', position: 'relative' }}>
          <UplinkLoader />
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#8df0b4',
              fontFamily: 'monospace',
              fontSize: '0.88rem',
              letterSpacing: '2px',
              textShadow: '0 0 10px rgba(28,236,132,0.8)',
              zIndex: 20,
              textAlign: 'center',
            }}
          >
            <div>{authStatusMessage}</div>
            <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '6px' }}>
              ENCRYPTED PROTOCOL ACTIVE // ROOM-104
            </div>
          </div>
        </div>
      ) : (
        /* Condition 2: Pure CRT Window acting directly as interactive terminal */
        <div className="shader-frame" style={{ width: '100%', height: '100%', position: 'relative' }}>
          <CrtBackground
            variant="terminal"
            speed={1.0}
            typeSpeed={1.0}
            motion={1.0}
            hue={0}
            saturation={1.0}
            brightness={1.0}
            opacity={1.0}
            inputPrompt={terminalStep === 'password' ? 'enter password: ' : 'enter username: '}
            userInput={terminalStep === 'password' ? '•'.repeat(typedPassword.length) : typedUsername}
          />

          {/* Top Bar: System Status badge + Sign In & Sign Up buttons */}
          <header className="top-nav-bar">
            <div className="system-status-badge">
              <span className="status-dot"></span>
              <span>NODE: ROOM-104 [ONLINE]</span>
            </div>

            <div className="top-auth-buttons">
              <button
                type="button"
                className="nav-auth-btn signin"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTerminalSubmit();
                }}
                title="Sign In with entered username"
              >
                SIGN IN
              </button>

              <button
                type="button"
                className="nav-auth-btn signup"
                onClick={(e) => {
                  e.stopPropagation();
                  handleGoogleSignIn();
                }}
                title="Single Sign-On with Google"
              >
                SIGN UP (GOOGLE)
              </button>
            </div>
          </header>
        </div>
      )}

      {/* Cyberpunk First-Time Setup Modal (Face ID + Username + Locked Phone + Catchphrase) */}
      {showAuthModal && (
        <AuthModal
          googleAccount={pendingGoogleAccount}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}
