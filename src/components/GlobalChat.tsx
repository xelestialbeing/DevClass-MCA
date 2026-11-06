import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChatMessage, UserProfile, supabaseService } from '../lib/supabase';
import { ProfileModal } from './ProfileModal';
import './GlobalChat.css';

export interface GlobalChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  mySeat?: number | null;
  isApproved: boolean;
  onSelectSeat?: (seatNumber: number) => void;
}

const MESSAGE_REACTIONS = [
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'thumbs_up', emoji: '👍', label: 'Like' },
  { id: 'thumbs_down', emoji: '👎', label: 'Dislike' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'celebrate', emoji: '🎉', label: 'Celebrate' },
];

export const GlobalChat: React.FC<GlobalChatProps> = ({
  isOpen,
  onClose,
  currentUser,
  mySeat,
  isApproved,
  onSelectSeat,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDispatchingAnim, setIsDispatchingAnim] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectProfileUser, setInspectProfileUser] = useState<UserProfile | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentUsername = currentUser?.username ? currentUser.username.replace(/^@/, '').trim() : '';

  // Classmates active in conversation for the Details inspector
  const uniqueClassmates = useMemo(() => {
    const map = new Map<string, { username: string; avatarUrl?: string; userId?: string; seatNumber?: number | null }>();
    messages.forEach((m) => {
      const uname = m.username.replace(/^@/, '').trim();
      if (!map.has(uname.toLowerCase())) {
        map.set(uname.toLowerCase(), {
          username: uname,
          avatarUrl: m.avatarUrl,
          userId: m.userId,
          seatNumber: m.seatNumber,
        });
      }
    });
    return Array.from(map.values());
  }, [messages]);

  // Open full student profile on avatar/username click
  const handleOpenUserProfile = async (username: string, avatarUrl?: string, userId?: string) => {
    if (!username) return;
    const clean = username.replace(/^@/, '').trim();

    // If it's the current user, inspect self
    if (currentUser && currentUser.username.toLowerCase() === clean.toLowerCase()) {
      setInspectProfileUser(currentUser);
      return;
    }

    // Immediately open modal with available data for instant tactile responsiveness
    const placeholder: UserProfile = {
      id: userId || `usr_${clean}`,
      username: clean,
      avatar: clean.charAt(0).toUpperCase(),
      avatarUrl: avatarUrl,
      catchphrase: 'DevClass MCA Student',
      faceScanStatus: 'verified',
      isApproved: true,
    };
    setInspectProfileUser(placeholder);

    // Asynchronously fetch complete profile record from database
    try {
      const fetched = await supabaseService.getUserByUsername(clean, false);
      if (fetched) {
        setInspectProfileUser(fetched);
      }
    } catch {
      // Keep placeholder if offline or unconfigured
    }
  };

  // Synchronize browser history / URL hash
  useEffect(() => {
    if (isOpen) {
      if (window.location.hash !== '#chat') {
        window.history.pushState(null, '', '#chat');
      }
    }
  }, [isOpen]);

  // Fetch messages with smart merge (prevents overwriting in-flight optimistic messages)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchMessages = async () => {
      const data = await supabaseService.getChatMessages(80);
      if (!isMounted) return;

      setMessages((prev) => {
        const inFlight = prev.filter((m) => m.id.startsWith('temp_'));

        // Skip re-render if data is unchanged
        if (
          inFlight.length === 0 &&
          prev.length === data.length &&
          prev[prev.length - 1]?.id === data[data.length - 1]?.id
        ) {
          return prev;
        }

        const confirmedIds = new Set(data.map((d) => d.id));
        const stillPending = inFlight.filter((opt) => !confirmedIds.has(opt.id));
        return [...data, ...stillPending];
      });
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isOpen]);

  // Handle keyboard escape to exit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showInfoSheet) {
          setShowInfoSheet(false);
        } else if (activeReactionMsgId) {
          setActiveReactionMsgId(null);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showInfoSheet, activeReactionMsgId]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [inputText]);

  // Instant Optimistic Message Dispatch (0ms UI latency with tactile spring animations)
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text || !isApproved) return;

    const username = currentUsername || 'student';
    const userId = currentUser?.id;
    const avatarUrl = currentUser?.avatarUrl;

    // 1. Trigger immediate button pop/spring animation
    setIsDispatchingAnim(true);
    setTimeout(() => setIsDispatchingAnim(false), 360);

    // 2. Generate optimistic temporary message for 0ms visual rendering
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      userId,
      username,
      avatarUrl,
      seatNumber: mySeat,
      content: text,
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    // 3. Append to state instantly and clear input
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // 4. Smoothly scroll into view
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 20);

    // 5. Asynchronously persist to Supabase in background
    supabaseService.sendChatMessage({
      userId,
      username,
      avatarUrl,
      seatNumber: mySeat,
      content: text,
    }).then((confirmed) => {
      if (confirmed) {
        // Swap temp ID with the real database record
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? confirmed : m))
        );
      }
    }).catch((err) => {
      console.warn('Message dispatch failed:', err);
    }).finally(() => {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    });
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUsername) return;
    setActiveReactionMsgId(null);

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const currentReactions: Record<string, string[]> = { ...(msg.reactions || {}) };
        const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
        if (users.includes(currentUsername)) {
          const filtered = users.filter((u) => u !== currentUsername);
          if (filtered.length === 0) {
            delete currentReactions[emoji];
          } else {
            currentReactions[emoji] = filtered;
          }
        } else {
          currentReactions[emoji] = [...users, currentUsername];
        }
        return { ...msg, reactions: currentReactions };
      })
    );

    await supabaseService.toggleChatMessageReaction(messageId, emoji, currentUsername);
  };

  const formatMessageTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatMessageHeaderDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Today';
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return `Today ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
      }
      return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return 'Today';
    }
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const latestMessagePreview = messages.length > 0 ? messages[messages.length - 1] : null;

  if (!isOpen) return null;

  return (
    <div className="chat-full-workspace" role="dialog" aria-modal="true" aria-label="DevClass MCA Chat">
      {/* ----------------------------------------------------------------------
          Split-View Sidebar (Desktop & Tablet)
          ---------------------------------------------------------------------- */}
      <aside className="chat-split-sidebar">
        {/* Top Header with Return Button */}
        <div className="sidebar-top-bar">
          <button
            type="button"
            className="sidebar-return-btn"
            onClick={onClose}
            title="Return to 3D Classroom (ESC)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>Classroom</span>
          </button>

          <div className="sidebar-header-title">Class Chat</div>
        </div>

        {/* Search Bar */}
        <div className="sidebar-search-box">
          <div className="sidebar-search-field">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="sidebar-search-input"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="sidebar-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conversation List */}
        <div className="sidebar-threads-list">
          <div className="sidebar-thread-cell active">
            <div className="thread-avatar-icon">
              <span>🎓</span>
            </div>

            <div className="thread-cell-info">
              <div className="thread-top-line">
                <span className="thread-name">DevClass MCA</span>
                {latestMessagePreview && (
                  <span className="thread-timestamp">
                    {formatMessageTime(latestMessagePreview.createdAt)}
                  </span>
                )}
              </div>
              <p className="thread-preview-text">
                {latestMessagePreview
                  ? `${latestMessagePreview.username === currentUsername ? 'You: ' : `@${latestMessagePreview.username}: `}${latestMessagePreview.content}`
                  : 'Auditorium Hall S01'}
              </p>
            </div>
          </div>
        </div>

        {/* Student Desk Status Card */}
        <div className="sidebar-desk-box">
          <div className="desk-box-header">
            <span className="desk-box-label">MY DESK</span>
            {mySeat ? (
              <span className="desk-seat-pill">Seat #{mySeat < 10 ? `0${mySeat}` : mySeat}</span>
            ) : (
              <span className="desk-seat-pill unreserved">Unreserved</span>
            )}
          </div>
          <p className="desk-box-caption">
            {mySeat
              ? 'Confirmed for tomorrow lecture'
              : 'Select an open desk in the 3D auditorium'}
          </p>
          {mySeat && onSelectSeat && (
            <button
              type="button"
              className="desk-view-hall-btn"
              onClick={() => {
                onSelectSeat(mySeat);
                onClose();
              }}
            >
              View in Classroom
            </button>
          )}
        </div>

        {/* Current User Footprint */}
        <div 
          className="sidebar-user-card clickable"
          onClick={() => {
            if (currentUser) {
              handleOpenUserProfile(currentUser.username, currentUser.avatarUrl, currentUser.id);
            }
          }}
          title="Click to view & edit your student profile"
        >
          <div className="user-card-avatar">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="User Avatar" className="user-avatar-image" />
            ) : (
              <div className="user-avatar-initial">
                {currentUser?.username?.charAt(0).toUpperCase() || 'S'}
              </div>
            )}
          </div>
          <div className="user-card-details">
            <span className="user-card-handle">@{currentUser?.username || 'Student'}</span>
            <span className={`user-card-status ${isApproved ? 'verified' : 'pending'}`}>
              {isApproved ? 'Verified Member' : 'Verification Pending'}
            </span>
          </div>
        </div>
      </aside>

      {/* ----------------------------------------------------------------------
          Main Conversation Pane
          ---------------------------------------------------------------------- */}
      <main className="chat-conversation-pane">
        {/* Navigation Bar */}
        <header className="chat-main-navbar">
          <div className="navbar-left-cluster">
            <button
              type="button"
              className="chat-mobile-back-action"
              onClick={onClose}
              aria-label="Back to Classroom"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>Classroom</span>
            </button>
          </div>

          <div className="navbar-center-cluster" onClick={() => setShowInfoSheet((v) => !v)}>
            <div className="navbar-badge-icon">
              <span>🎓</span>
            </div>
            <div className="navbar-text-group">
              <span className="navbar-main-title">DevClass MCA</span>
              <span className="navbar-sub-status">46 Students</span>
            </div>
          </div>

          <div className="navbar-right-cluster">
            {currentUser && (
              <button
                type="button"
                className="navbar-profile-btn"
                onClick={() => handleOpenUserProfile(currentUser.username, currentUser.avatarUrl, currentUser.id)}
                title="View & edit your student profile"
                aria-label="Student Profile"
              >
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt={currentUser.username} className="navbar-profile-avatar" />
                ) : (
                  <div className="navbar-profile-initial">
                    {currentUser.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </button>
            )}
            <button
              type="button"
              className={`navbar-info-toggle ${showInfoSheet ? 'active' : ''}`}
              onClick={() => setShowInfoSheet((v) => !v)}
              title="Classmates & Room Details"
              aria-label="Conversation details"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </div>
        </header>

        {/* Message Feed Canvas */}
        <div
          ref={scrollContainerRef}
          className="chat-message-feed"
          onClick={() => setActiveReactionMsgId(null)}
        >
          {filteredMessages.length === 0 ? (
            <div className="chat-welcome-state">
              <div className="welcome-avatar-bubble">
                <span>🎓</span>
              </div>
              <h2 className="welcome-headline">DevClass MCA</h2>
              <p className="welcome-subline">
                No messages yet. Send a message to your classmates to start the conversation.
              </p>
            </div>
          ) : (
            <div className="chat-messages-flow">
              {filteredMessages.map((msg, idx) => {
                const isMine = Boolean(
                  currentUsername && msg.username.toLowerCase() === currentUsername.toLowerCase()
                );
                const reactions = msg.reactions || {};
                const reactionEntries = Object.entries(reactions);

                // Date stamp insertion
                const showDateHeader =
                  idx === 0 ||
                  Math.abs(
                    new Date(msg.createdAt).getTime() -
                      new Date(filteredMessages[idx - 1].createdAt).getTime()
                  ) > 1000 * 60 * 30;

                const isReactionPickerOpen = activeReactionMsgId === msg.id;

                return (
                  <React.Fragment key={msg.id}>
                    {showDateHeader && (
                      <div className="chat-date-separator">
                        <span>{formatMessageHeaderDate(msg.createdAt)}</span>
                      </div>
                    )}

                    <div className={`chat-message-entry ${isMine ? 'outgoing' : 'incoming'}`}>
                      {/* Classmate Avatar for incoming */}
                      {!isMine && (
                        <div 
                          className="chat-sender-avatar"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUserProfile(msg.username, msg.avatarUrl, msg.userId);
                          }}
                          title={`Click to view @${msg.username}'s profile`}
                          role="button"
                          tabIndex={0}
                        >
                          {msg.avatarUrl ? (
                            <img src={msg.avatarUrl} alt={msg.username} className="sender-avatar-img" />
                          ) : (
                            <div className="sender-avatar-initial">
                              {msg.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}

                      <div className={`chat-bubble-wrapper ${isMine ? 'outgoing' : 'incoming'}`}>
                        {/* Sender metadata for incoming */}
                        {!isMine && (
                          <div className="chat-sender-line">
                            <span 
                              className="sender-username"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenUserProfile(msg.username, msg.avatarUrl, msg.userId);
                              }}
                              title={`Click to view @${msg.username}'s profile`}
                              role="button"
                              tabIndex={0}
                            >
                              @{msg.username}
                            </span>
                            {msg.seatNumber && (
                              <button
                                type="button"
                                className="sender-seat-chip"
                                onClick={() => {
                                  if (onSelectSeat && msg.seatNumber) {
                                    onSelectSeat(msg.seatNumber);
                                    onClose();
                                  }
                                }}
                                title={`View Seat #${msg.seatNumber}`}
                              >
                                Seat {msg.seatNumber < 10 ? `0${msg.seatNumber}` : msg.seatNumber}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Interactive Message Bubble */}
                        <div
                          className={`chat-bubble ${isMine ? 'outgoing' : 'incoming'} ${msg.id.startsWith('temp_') ? 'optimistic' : ''}`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setActiveReactionMsgId(msg.id);
                          }}
                        >
                          <p className="bubble-text-content">{msg.content}</p>

                          {/* Reaction Action Trigger */}
                          <button
                            type="button"
                            className="bubble-reaction-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveReactionMsgId(isReactionPickerOpen ? null : msg.id);
                            }}
                            title="Add Reaction"
                            aria-label="React"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" />
                              <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                          </button>

                          {/* Floating Reaction Bar */}
                          {isReactionPickerOpen && (
                            <div
                              className="floating-reaction-bar"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {MESSAGE_REACTIONS.map((r) => {
                                const hasReacted = Boolean(
                                  reactions[r.emoji]?.includes(currentUsername)
                                );
                                return (
                                  <button
                                    key={r.id}
                                    type="button"
                                    className={`reaction-item-btn ${hasReacted ? 'active' : ''}`}
                                    onClick={() => handleToggleReaction(msg.id, r.emoji)}
                                    title={r.label}
                                  >
                                    <span className="reaction-glyph-icon">{r.emoji}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Attached Reaction Stickers */}
                          {reactionEntries.length > 0 && (
                            <div className="bubble-attached-reactions">
                              {reactionEntries.map(([emoji, users]) => {
                                const hasReacted = Boolean(currentUsername && users.includes(currentUsername));
                                return (
                                  <button
                                    key={emoji}
                                    type="button"
                                    className={`attached-reaction-pill ${hasReacted ? 'active' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleReaction(msg.id, emoji);
                                    }}
                                    title={`Reacted by ${users.join(', ')}`}
                                  >
                                    <span className="reaction-symbol">{emoji}</span>
                                    {users.length > 1 && (
                                      <span className="reaction-tally">{users.length}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Outgoing user avatar */}
                      {isMine && (
                        <div 
                          className="chat-sender-avatar outgoing"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenUserProfile(msg.username, msg.avatarUrl, msg.userId);
                          }}
                          title="Click to view your profile"
                          role="button"
                          tabIndex={0}
                        >
                          {msg.avatarUrl || currentUser?.avatarUrl ? (
                            <img src={msg.avatarUrl || currentUser?.avatarUrl} alt={msg.username} className="sender-avatar-img" />
                          ) : (
                            <div className="sender-avatar-initial">
                              {msg.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------------
            Message Input Dock
            ---------------------------------------------------------------------- */}
        <footer className="chat-composer-dock">
          {!isApproved ? (
            <div className="composer-locked-notice">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Account pending administrator verification</span>
            </div>
          ) : (
            <div className="composer-pill-card">
              {/* Plus Option Button */}
              <button
                type="button"
                className="composer-add-btn"
                title="Options"
                aria-label="Add options"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {/* Text Area Input */}
              <textarea
                ref={textareaRef}
                className="composer-text-input"
                placeholder="Type a message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDownTextarea}
                rows={1}
                maxLength={1000}
              />

              {/* Send Button with Tactile Spring Animation */}
              <button
                type="button"
                className={`composer-send-btn ${inputText.trim() ? 'active' : ''} ${isDispatchingAnim ? 'dispatching' : ''}`}
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                title="Send"
                aria-label="Send"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          )}
        </footer>
      </main>

      {/* ----------------------------------------------------------------------
          Details Sheet (i)
          ---------------------------------------------------------------------- */}
      {showInfoSheet && (
        <aside className="chat-info-sheet">
          <div className="info-sheet-header">
            <span className="info-sheet-title">Details</span>
            <button
              type="button"
              className="info-sheet-done-btn"
              onClick={() => setShowInfoSheet(false)}
              aria-label="Close details"
            >
              Done
            </button>
          </div>

          <div className="info-sheet-body">
            <div className="info-hall-card">
              <div className="info-hall-avatar">
                <span>🎓</span>
              </div>
              <h3 className="info-hall-title">DevClass MCA</h3>
              <span className="info-hall-subtitle">Auditorium Hall S01</span>
            </div>

            <div className="info-data-section">
              <span className="data-section-label">SEATING ATTENDANCE</span>
              <div className="data-row-card">
                <span className="data-row-name">Your Reserved Seat</span>
                <span className="data-row-val">
                  {mySeat ? `Seat #${mySeat < 10 ? `0${mySeat}` : mySeat}` : 'None'}
                </span>
              </div>
              <div className="data-row-card">
                <span className="data-row-name">Total Classroom Desks</span>
                <span className="data-row-val">46 Desks</span>
              </div>
            </div>

            <div className="info-data-section">
              <span className="data-section-label">CLASSMATES IN CHAT ({uniqueClassmates.length})</span>
              <div className="info-classmates-list">
                {uniqueClassmates.map((c) => (
                  <div
                    key={c.username}
                    className="info-classmate-row"
                    onClick={() => handleOpenUserProfile(c.username, c.avatarUrl, c.userId)}
                    title={`Click to view @${c.username}'s profile`}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="info-classmate-avatar">
                      {c.avatarUrl ? (
                        <img src={c.avatarUrl} alt={c.username} className="info-classmate-img" />
                      ) : (
                        <div className="info-classmate-initial">
                          {c.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="info-classmate-text">
                      <span className="info-classmate-handle">@{c.username}</span>
                      <span className="info-classmate-desk">
                        {c.seatNumber ? `Desk #${c.seatNumber < 10 ? `0${c.seatNumber}` : c.seatNumber}` : 'DevClass Member'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="info-data-section">
              <span className="data-section-label">ACTIONS</span>
              {mySeat && onSelectSeat && (
                <button
                  type="button"
                  className="info-action-btn primary"
                  onClick={() => {
                    onSelectSeat(mySeat);
                    onClose();
                  }}
                >
                  Focus My Desk in 3D Hall
                </button>
              )}
              <button
                type="button"
                className="info-action-btn secondary"
                onClick={onClose}
              >
                Return to Classroom
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Student Profile Modal (Read-only for other classmates, Editable for self) */}
      {inspectProfileUser && (
        <ProfileModal
          user={inspectProfileUser}
          onClose={() => setInspectProfileUser(null)}
          isReadOnly={
            !currentUser ||
            inspectProfileUser.username.toLowerCase() !== (currentUser.username || '').toLowerCase()
          }
        />
      )}
    </div>
  );
};
