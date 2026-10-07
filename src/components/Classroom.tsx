import { useState, useEffect } from 'react';
import { ProfileModal } from './ProfileModal';
import { Classroom3D, StudentVote } from './Classroom3D';
import { UserProfile, supabaseService, TELEGRAM_BOT_USERNAME } from '../lib/supabase';
import { SpatialModal, SpatialToast, SpatialModalProps } from './SpatialModal';
import './Classroom.css';

interface Vote extends StudentVote {}

interface ClassroomProps {
  currentUser?: UserProfile | null;
  onSignOut?: () => void;
}

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'success' | 'error';
}

export function Classroom({ currentUser, onSignOut }: ClassroomProps) {
  const [user, setUser] = useState<UserProfile | undefined | null>(currentUser);
  const userKey = user?.username || user?.id || 'guest';
  const seatStorageKey = `college_seat_${userKey}`;
  const [mySeat, setMySeat] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(`college_seat_${currentUser?.username || currentUser?.id || 'guest'}`);
      if (stored) {
        const val = parseInt(stored, 10);
        if (val >= 1 && val <= 46) return val;
      }
    } catch {}
    return null;
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [boardMessage] = useState("DEVCLASS MCA - WELCOME");
  const [modalConfig, setModalConfig] = useState<SpatialModalProps | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isVerifyingStatus, setIsVerifyingStatus] = useState(false);

  const addToast = (message: string, type: 'info' | 'warning' | 'success' | 'error' = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, title }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Live approval state
  const isApproved = Boolean(user?.isApproved) || user?.faceScanStatus === 'verified';

  // Manual trigger for student checking approval status
  const handleManualStatusCheck = async () => {
    if (!user?.username && !user?.id) return;
    setIsVerifyingStatus(true);
    try {
      const serverApproved = await supabaseService.checkApprovalStatus(user.username || user.id);
      if (serverApproved) {
        setUser((prev) => {
          if (!prev) return prev;
          const updated: UserProfile = { ...prev, isApproved: true, faceScanStatus: 'verified' };
          localStorage.setItem('college_presence_user', JSON.stringify(updated));
          return updated;
        });
        setModalConfig(null);
        addToast('Administrator clearance confirmed! DevClass MCA access unlocked.', 'success', 'Approval Granted');
      } else {
        addToast('Verification is still pending in Telegram bot queue.', 'info', 'Status: Pending');
      }
    } finally {
      setIsVerifyingStatus(false);
    }
  };

  const showPendingApprovalNotice = () => {
    setModalConfig({
      isOpen: true,
      onClose: () => setModalConfig(null),
      type: 'security',
      badge: 'CLEARANCE PENDING // DEVCLASS MCA',
      title: 'Account Pending Admin Verification',
      description: 'Your biometric face scan and student registration are currently in queue for administrator review. Seat reservations, daily attendance voting, and campus communication unlock immediately upon verification.',
      meta: [
        { label: 'STUDENT HANDLE', value: `@${user?.username || 'Student'}` },
        { label: 'SECURITY STATUS', value: 'Pending Admin Review' },
        { label: 'CLASSROOM HALL', value: 'DevClass MCA Hall' },
        { label: 'DISPATCH BOT', value: TELEGRAM_BOT_USERNAME ? `@${TELEGRAM_BOT_USERNAME}` : 'Verification Bot' },
      ],
      primaryAction: {
        label: isVerifyingStatus ? 'Verifying...' : 'Check Approval Status',
        onClick: handleManualStatusCheck,
        loading: isVerifyingStatus,
      },
      secondaryAction: {
        label: 'Return to Auditorium',
        onClick: () => setModalConfig(null),
      },
    });
  };

  // Live verification on mount & periodic polling until approved
  useEffect(() => {
    if (!user?.username && !user?.id) return;

    let isMounted = true;
    const verifyStatus = async () => {
      const serverApproved = await supabaseService.checkApprovalStatus(user.username || user.id);
      if (!isMounted) return;

      if (serverApproved !== isApproved) {
        setUser((prev) => {
          if (!prev) return prev;
          const updated: UserProfile = {
            ...prev,
            isApproved: serverApproved,
            faceScanStatus: serverApproved ? 'verified' : (prev.faceScanStatus === 'rejected' ? 'rejected' : 'pending'),
          };
          try {
            localStorage.setItem('college_presence_user', JSON.stringify(updated));
          } catch {
            // ignore localStorage quota errors
          }
          return updated;
        });

        if (serverApproved) {
          setModalConfig(null);
          addToast('Account verified by administrator! DevClass MCA access unlocked.', 'success', 'Approved');
        }
      }
    };

    // Always run initial check against server (neutralizes localStorage spoofing)
    verifyStatus();

    // If not approved yet, keep polling for admin decision
    if (!isApproved) {
      const timer = setInterval(verifyStatus, 2500);
      return () => {
        isMounted = false;
        clearInterval(timer);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [isApproved, user?.id, user?.username]);

  // Live classroom seat votes (starts clean with 0/46 occupied)
  const [votes] = useState<Vote[]>([]);

  const totalComing = votes.length + (mySeat !== null ? 1 : 0);

  const handleSeatClick = (seatNumber: number) => {
    if (!isApproved) {
      showPendingApprovalNotice();
      return;
    }

    const isOccupied = votes.find((v) => v.seatNumber === seatNumber);
    if (isOccupied) {
      addToast(`Seat #${seatNumber} is occupied by @${isOccupied.username}. Select an available desk.`, 'warning', 'Seat Unavailable');
      return;
    }

    if (mySeat === seatNumber) {
      // Un-claim seat
      setMySeat(null);
      try {
        localStorage.removeItem(seatStorageKey);
      } catch {}
      addToast(`Seat #${seatNumber} released. Attendance cancelled.`, 'info', 'Desk Released');
    } else {
      // Claim seat
      setMySeat(seatNumber);
      try {
        localStorage.setItem(seatStorageKey, seatNumber.toString());
      } catch {}
      addToast(`Seat #${seatNumber} confirmed! You are marked attending tomorrow.`, 'success', 'Attendance Confirmed');
    }
  };

  const handleClearSeat = () => {
    setMySeat(null);
    try {
      localStorage.removeItem(seatStorageKey);
    } catch {}
    addToast('Seat reservation cleared. Attendance cancelled.', 'info', 'Desk Released');
  };

  const handleRandomSeat = () => {
    if (!isApproved) {
      showPendingApprovalNotice();
      return;
    }

    const occupiedSeats = new Set(votes.map(v => v.seatNumber));
    if (mySeat !== null) occupiedSeats.add(mySeat);
    
    const availableSeats = Array.from({ length: 46 }, (_, i) => i + 1).filter(s => !occupiedSeats.has(s));
    
    if (availableSeats.length === 0) {
      addToast('Classroom has reached maximum capacity (46/46 seats claimed).', 'warning', 'Classroom Full');
      return;
    }
    
    const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
    setMySeat(randomSeat);
    try {
      localStorage.setItem(seatStorageKey, randomSeat.toString());
    } catch {}
    addToast(`Auto-assigned to Seat #${randomSeat}! You are marked attending tomorrow.`, 'success', 'Attendance Confirmed');
  };

  return (
    <div className="classroom-container fullscreen-3d">
      {/* Top Floating Spatial HUD Islands */}
      <div className="classroom-top-hud">
        {/* Left Island: Room Status & Attendance Badge */}
        <div className="hud-island hud-brand-card">
          <div className="hud-brand-header">
            <span className="hud-live-dot" />
            <span className="hud-room-code">DEVCLASS MCA</span>
            <span className="hud-batch-badge">2026</span>
            <span className={`hud-account-status ${isApproved ? 'active' : 'pending'}`} title={isApproved ? 'Active Verified Account' : 'Account Pending Admin Verification'}>
              {isApproved ? '● Active' : '⏳ Pending Approval'}
            </span>
          </div>
          <div className="hud-attendance-meta">
            <div className="hud-count-wrap">
              <span className="hud-count-highlight">{totalComing}</span>
              <span className="hud-count-total">/ 46</span>
              <span className="hud-count-label">Present</span>
            </div>
            {mySeat === null && isApproved ? (
              <button
                type="button"
                className="hud-quick-attend-btn"
                onClick={handleRandomSeat}
                title="1-tap attendance: claim an available desk"
              >
                + I'm Coming
              </button>
            ) : mySeat !== null ? (
              <span className="hud-quick-seat-badge" title="Your confirmed seat">
                Seat #{mySeat < 10 ? `0${mySeat}` : mySeat}
              </span>
            ) : null}
          </div>
        </div>

        {/* Right Island: Student Profile & Navigation */}
        <div className="hud-island hud-actions-card">
          <div 
            onClick={() => setShowProfileModal(true)}
            className="hud-profile-chip"
            title="Click to view profile & edit catchphrase"
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="hud-avatar-img"
              />
            ) : (
              <div className="hud-avatar-fallback">
                {user?.avatar || user?.username?.charAt(0).toUpperCase() || 'S'}
              </div>
            )}
            <div className="hud-profile-text">
              <span className="hud-username">@{user?.username || 'Student'}</span>
              <span className="hud-bio">"{user?.catchphrase || 'Class of 2026'}"</span>
            </div>
          </div>

          <div className="hud-island-divider" />

          <button 
            type="button" 
            className="hud-icon-action" 
            onClick={() => {
              if (!isApproved) {
                showPendingApprovalNotice();
                return;
              }
              addToast('Connecting to DevClass MCA frequency...', 'info', 'Chat Channel');
            }}
            title="Open Campus Chat"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Chat</span>
          </button>

          {onSignOut && (
            <button 
              type="button" 
              className="hud-icon-action exit-action" 
              onClick={onSignOut} 
              title="Return to Terminal"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Exit</span>
            </button>
          )}
        </div>
      </div>

      {/* Pure 3D Classroom View (2D grid completely removed) */}
      <div className="classroom-3d-stage">
        <Classroom3D
          mySeat={mySeat}
          onSeatSelect={handleSeatClick}
          onRandomSeat={handleRandomSeat}
          onClearSeat={handleClearSeat}
          votes={votes}
          currentUser={user}
          boardAnnouncement={boardMessage}
          onPendingNotice={showPendingApprovalNotice}
        />
      </div>

      {showProfileModal && user && (
        <ProfileModal
          user={user as any}
          onClose={() => setShowProfileModal(false)}
          onUpdateUser={(updated) => setUser(updated)}
        />
      )}

      {/* High-End Spatial Modal Dialog */}
      {modalConfig && (
        <SpatialModal
          {...modalConfig}
          onClose={() => setModalConfig(null)}
        />
      )}

      {/* Spatial Floating Toasts */}
      {toasts.length > 0 && (
        <div className="spatial-toast-container">
          {toasts.map((t) => (
            <SpatialToast
              key={t.id}
              id={t.id}
              title={t.title}
              message={t.message}
              type={t.type}
              onDismiss={removeToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
