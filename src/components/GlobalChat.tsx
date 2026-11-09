import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChatMessage,
  ChatGroup,
  UserProfile,
  supabaseService,
  getMessageActionStatus,
  getCachedChatMessages,
  setCachedChatMessages,
} from '../lib/supabase';
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

const areMessagesEqual = (a: ChatMessage[], b: ChatMessage[]): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ma = a[i];
    const mb = b[i];
    if (ma.id !== mb.id || ma.content !== mb.content || ma.isEdited !== mb.isEdited) return false;
    const ra = ma.reactions || {};
    const rb = mb.reactions || {};
    const ka = Object.keys(ra);
    const kb = Object.keys(rb);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      const ua = ra[k] || [];
      const ub = rb[k] || [];
      if (ua.length !== ub.length) return false;
      for (let j = 0; j < ua.length; j++) {
        if (ua[j] !== ub[j]) return false;
      }
    }
  }
  return true;
};

export const GlobalChat: React.FC<GlobalChatProps> = ({
  isOpen,
  onClose,
  currentUser,
  mySeat,
  isApproved,
  onSelectSeat,
}) => {
  // Pre-load from user-side cache on mount (instant 0ms display on page refresh without waiting for server)
  const [messages, setMessages] = useState<ChatMessage[]>(() => getCachedChatMessages());
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isDispatchingAnim, setIsDispatchingAnim] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showInfoSheet, setShowInfoSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectProfileUser, setInspectProfileUser] = useState<UserProfile | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupEmoji, setNewGroupEmoji] = useState('💬');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [groupFormError, setGroupFormError] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [classroomMembers, setClassroomMembers] = useState<Array<{ username: string; avatarUrl?: string | null }>>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionCursorIndex, setMentionCursorIndex] = useState<number | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const groupMessagesRef = useRef<ChatMessage[]>(groupMessages);
  groupMessagesRef.current = groupMessages;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load classroom members on open for mention directory
  useEffect(() => {
    if (isOpen) {
      supabaseService.getClassroomMembers().then((mems) => {
        if (mems && mems.length > 0) {
          setClassroomMembers(mems);
        }
      });
    }
  }, [isOpen]);

  const handleTouchStartMessage = (msgId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(28); // Tactile Android haptic feedback
      }
      setActiveReactionMsgId(msgId);
    }, 450);
  };

  const handleTouchEndMessage = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const currentUsername = currentUser?.username ? currentUser.username.replace(/^@/, '').trim() : '';
  const isUserInReactions = (userList?: string[]): boolean => {
    if (!userList || !currentUsername) return false;
    const cleanCurrent = currentUsername.toLowerCase();
    return userList.some((u) => u.replace(/^@/, '').trim().toLowerCase() === cleanCurrent);
  };
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );
  const activeMessages = activeGroupId ? groupMessages : messages;
  const activeConversationTitle = activeGroup?.name || 'DevClass MCA';
  const activeConversationSubtitle = activeGroup
    ? `${activeGroup.memberCount} ${activeGroup.memberCount === 1 ? 'member' : 'members'}`
    : '46 Students';

  const activeReactionMsg = useMemo(
    () => messages.find((m) => m.id === activeReactionMsgId) || null,
    [messages, activeReactionMsgId]
  );

  // Classmates active in conversation for the Details inspector
  const uniqueClassmates = useMemo(() => {
    const map = new Map<string, { username: string; avatarUrl?: string; userId?: string; seatNumber?: number | null }>();
    activeMessages.forEach((m) => {
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
  }, [activeMessages]);

  // Mention autocomplete candidate directory
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const map = new Map<string, { username: string; avatarUrl?: string | null }>();

    classroomMembers.forEach((m) => {
      const u = m.username.replace(/^@/, '').trim();
      if (u) map.set(u.toLowerCase(), { username: u, avatarUrl: m.avatarUrl });
    });

    messages.forEach((m) => {
      const u = m.username.replace(/^@/, '').trim();
      if (u && !map.has(u.toLowerCase())) {
        map.set(u.toLowerCase(), { username: u, avatarUrl: m.avatarUrl });
      }
    });

    const list = Array.from(map.values());
    if (!mentionQuery) return list.slice(0, 8);
    return list
      .filter((c) => c.username.toLowerCase().includes(mentionQuery))
      .slice(0, 8);
  }, [mentionQuery, classroomMembers, messages]);

  // Smooth scroll to quoted message with premium Telegram/iMessage style highlight flash
  const scrollToMessage = (targetId: string) => {
    const el = document.getElementById(`chat-msg-${targetId}`);
    if (el) {
      const bubble = el.querySelector('.chat-bubble');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Apply target flash to both the row container and the specific bubble
      el.classList.remove('message-target-pulse');
      bubble?.classList.remove('bubble-target-flash');
      // Trigger reflow to restart animation smoothly if clicked repeatedly
      void el.offsetWidth;

      el.classList.add('message-target-pulse');
      bubble?.classList.add('bubble-target-flash');

      setTimeout(() => {
        el.classList.remove('message-target-pulse');
        bubble?.classList.remove('bubble-target-flash');
      }, 1800);
    }
  };

  // Start reply to a message
  const handleStartReply = (msg: ChatMessage) => {
    setReplyingToMessage(msg);
    setActiveReactionMsgId(null);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 40);
  };

  // Insert mention into input text
  const handleInsertMention = (targetUsername: string) => {
    const cleanName = targetUsername.replace(/^@/, '').trim();
    const cursorPos = mentionCursorIndex ?? (textareaRef.current?.selectionStart || inputText.length);
    const textBefore = inputText.slice(0, cursorPos);
    const textAfter = inputText.slice(cursorPos);
    const atIndex = textBefore.lastIndexOf('@');
    if (atIndex !== -1) {
      const insertion = `@${cleanName} `;
      const newText = textBefore.slice(0, atIndex) + insertion + textAfter;
      setInputText(newText);
      setShowMentionPicker(false);
      setMentionQuery(null);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = atIndex + insertion.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 30);
    }
  };

  // Interactive mention token parser
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const uname = part.slice(1);
        const isMe = Boolean(currentUsername && uname.toLowerCase() === currentUsername.toLowerCase());
        return (
          <span
            key={idx}
            className={`chat-mention-tag ${isMe ? 'is-me' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenUserProfile(uname);
            }}
            title={isMe ? 'You were mentioned' : `Click to view @${uname}'s profile`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

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

  // Load discoverable groups whenever the chat workspace opens (adaptive interval, paused when document is hidden)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loadGroups = async () => {
      if (document.hidden) {
        scheduleNext(30000); // 30s when backgrounded
        return;
      }
      try {
        const loadedGroups = await supabaseService.getChatGroups({ id: currentUser?.id, username: currentUsername });
        if (isMounted) setGroups(loadedGroups);
      } catch {}
      scheduleNext(20000); // 20s when active (groups rarely change)
    };

    const scheduleNext = (delayMs: number) => {
      if (!isMounted) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(loadGroups, delayMs);
    };

    loadGroups();

    const handleVisibility = () => {
      if (!document.hidden) loadGroups();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isOpen, currentUser?.id, currentUsername]);

  // Fetch messages with client-side cache & adaptive smart polling:
  // - 2.5s base interval (relaxed from 1.5s)
  // - Exponential backoff up to 8s during chat inactivity (no new messages)
  // - 20s when user switches tab or minimizes window (document.hidden)
  // - Instantly wakes up upon user activity or tab refocus
  useEffect(() => {
    if (!isOpen || activeGroupId) return;

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let consecutiveUnchanged = 0;

    const fetchMessages = async () => {
      if (document.hidden) {
        scheduleNext(20000);
        return;
      }

      let hasNewData = false;
      try {
        const data = await supabaseService.syncChatMessages(messagesRef.current);
        if (!isMounted) return;

        setMessages((prev) => {
          const inFlight = prev.filter((m) => m.id.startsWith('temp_'));

          // Skip re-render if data is unchanged
          if (inFlight.length === 0 && areMessagesEqual(prev, data)) {
            hasNewData = false;
            return prev;
          }

          hasNewData = true;
          const confirmedIds = new Set(data.map((d) => d.id));
          const stillPending = inFlight.filter((opt) => !confirmedIds.has(opt.id));
          const merged = [...data, ...stillPending];
          setCachedChatMessages(merged);
          return merged;
        });
      } catch {}

      if (hasNewData) {
        consecutiveUnchanged = 0;
      } else {
        consecutiveUnchanged = Math.min(consecutiveUnchanged + 1, 6);
      }

      // 2.5s -> 3.2s -> 4.0s -> ... up to 7.5s when idle
      const nextDelay = 2500 + consecutiveUnchanged * 800;
      scheduleNext(nextDelay);
    };

    const scheduleNext = (delayMs: number) => {
      if (!isMounted) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchMessages, delayMs);
    };

    fetchMessages();

    // Wakes up immediately when user focuses or returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        consecutiveUnchanged = 0;
        fetchMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, activeGroupId]);

  // Group conversations use the same adaptive backoff rhythm
  useEffect(() => {
    if (!isOpen || !activeGroupId) {
      if (!activeGroupId) setGroupMessages([]);
      return;
    }

    let isMounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let idleCount = 0;

    const fetchGroupMessages = async () => {
      if (document.hidden) {
        scheduleNext(20000);
        return;
      }

      try {
        const data = await supabaseService.syncGroupChatMessages(activeGroupId, groupMessagesRef.current);
        if (isMounted) {
          setGroupMessages((prev) => {
            if (areMessagesEqual(prev, data)) {
              idleCount = Math.min(idleCount + 1, 6);
              return prev;
            }
            idleCount = 0;
            return data;
          });
        }
      } catch {}

      const nextDelay = 2500 + idleCount * 900;
      scheduleNext(nextDelay);
    };

    const scheduleNext = (delayMs: number) => {
      if (!isMounted) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(fetchGroupMessages, delayMs);
    };

    fetchGroupMessages();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        idleCount = 0;
        fetchGroupMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, activeGroupId]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, isOpen, activeGroupId]);

  // Handle keyboard escape to exit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMentionPicker) {
          setShowMentionPicker(false);
          setMentionQuery(null);
        } else if (messageToDelete) {
          setMessageToDelete(null);
        } else if (showCreateGroup) {
          setShowCreateGroup(false);
          setGroupFormError('');
        } else if (editingMessage) {
          handleCancelEdit();
        } else if (replyingToMessage) {
          setReplyingToMessage(null);
        } else if (showInfoSheet) {
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
  }, [isOpen, onClose, showInfoSheet, activeReactionMsgId, editingMessage, messageToDelete, showCreateGroup]);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [inputText]);

  const handleSelectConversation = async (groupId: string | null) => {
    setActiveGroupId(groupId);
    setSearchQuery('');
    setShowInfoSheet(false);
    setActiveReactionMsgId(null);
    handleCancelEdit();

    if (!groupId || !currentUsername) return;
    const group = groups.find((item) => item.id === groupId);
    if (!group || group.isMember) return;

    const joined = await supabaseService.joinChatGroup(groupId, {
      userId: currentUser?.id,
      username: currentUsername,
    });
    if (joined) {
      setGroups((previous) => previous.map((item) => (
        item.id === groupId
          ? { ...item, isMember: true, memberCount: item.memberCount + 1 }
          : item
      )));
    }
  };

  const handleCreateGroup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isApproved || !currentUsername) return;

    const name = newGroupName.trim();
    if (name.length < 2) {
      setGroupFormError('Give your group a name with at least 2 characters.');
      return;
    }

    setIsCreatingGroup(true);
    setGroupFormError('');
    const created = await supabaseService.createChatGroup({
      name,
      description: newGroupDescription,
      emoji: newGroupEmoji,
      ownerId: currentUser?.id,
      ownerUsername: currentUsername,
      isPrivate: newGroupPrivate,
    });
    setIsCreatingGroup(false);

    if (!created) {
      setGroupFormError('The group could not be created. Please try again.');
      return;
    }

    setGroups((previous) => [created, ...previous.filter((group) => group.id !== created.id)]);
    setShowCreateGroup(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupEmoji('💬');
    setNewGroupPrivate(false);
    setGroupFormError('');
    setActiveGroupId(created.id);
  };

  const handleLeaveActiveGroup = async () => {
    if (!activeGroupId || !activeGroup || !currentUsername) return;
    if (activeGroup.ownerUsername.toLowerCase() === currentUsername.toLowerCase()) {
      alert('The group owner cannot leave yet. Transfer ownership or delete the group from a future group settings panel.');
      return;
    }

    const left = await supabaseService.leaveChatGroup(activeGroupId, currentUsername);
    if (left) {
      setGroups((previous) => previous.filter((group) => group.id !== activeGroupId));
      setActiveGroupId(null);
      setGroupMessages([]);
    }
  };

  // Start editing a message within the 15-30 min window
  const handleStartEdit = (msg: ChatMessage) => {
    const status = getMessageActionStatus(msg.createdAt);
    if (!status.canEditOrDelete) {
      alert('This message was sent more than 30 minutes ago and can no longer be edited.');
      setActiveReactionMsgId(null);
      return;
    }
    setEditingMessage(msg);
    setInputText(msg.content);
    setActiveReactionMsgId(null);
    setTimeout(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(msg.content.length, msg.content.length);
      }
    }, 40);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
    setShowMentionPicker(false);
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  // Confirm delete message within the 15-30 min window
  const handleConfirmDelete = async (msg: ChatMessage) => {
    const status = getMessageActionStatus(msg.createdAt);
    if (!status.canEditOrDelete) {
      alert('This message was sent more than 30 minutes ago and can no longer be deleted.');
      setMessageToDelete(null);
      return;
    }

    const targetId = msg.id;
    // 1. Optimistic removal in 0ms & immediate ref synchronization
    if (activeGroupId) {
      setGroupMessages((prev) => prev.filter((m) => m.id !== targetId));
      groupMessagesRef.current = groupMessagesRef.current.filter((m) => m.id !== targetId);
    } else {
      setMessages((prev) => prev.filter((m) => m.id !== targetId));
      messagesRef.current = messagesRef.current.filter((m) => m.id !== targetId);
    }
    setMessageToDelete(null);
    setActiveReactionMsgId(null);

    if (editingMessage?.id === targetId) {
      handleCancelEdit();
    }

    // 2. Persist deletion in background
    if (activeGroupId) {
      await supabaseService.deleteGroupChatMessage(targetId, currentUsername);
    } else {
      await supabaseService.deleteChatMessage(targetId, currentUsername);
    }
  };

  // Instant Optimistic Message Dispatch & Update (0ms UI latency with tactile spring animations)
  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text || !isApproved) return;

    const username = currentUsername || 'student';
    const userId = currentUser?.id;
    const avatarUrl = currentUser?.avatarUrl;

    // Handle Edit Submission
    if (editingMessage) {
      const targetId = editingMessage.id;
      const originalText = editingMessage.content;
      if (text === originalText) {
        handleCancelEdit();
        return;
      }

      const status = getMessageActionStatus(editingMessage.createdAt);
      if (!status.canEditOrDelete) {
        alert('Message edit window has expired (30-minute limit exceeded).');
        handleCancelEdit();
        return;
      }

      setIsDispatchingAnim(true);
      setTimeout(() => setIsDispatchingAnim(false), 360);

      // Optimistic inline update in 0ms
      const updateMessages = (previous: ChatMessage[]) =>
        previous.map((m) => (m.id === targetId ? { ...m, content: text, isEdited: true } : m));
      if (activeGroupId) setGroupMessages(updateMessages);
      else setMessages(updateMessages);
      handleCancelEdit();

      // Persist in background
      const editRequest = activeGroupId
        ? supabaseService.editGroupChatMessage(targetId, text, currentUsername)
        : supabaseService.editChatMessage(targetId, text, currentUsername);
      editRequest.then((confirmed) => {
        if (confirmed) {
          const replaceMessage = (previous: ChatMessage[]) =>
            previous.map((m) => (m.id === targetId ? confirmed : m));
          if (activeGroupId) setGroupMessages(replaceMessage);
          else setMessages(replaceMessage);
        }
      }).catch((err) => {
        console.warn('Failed to persist edit:', err);
      });
      return;
    }

    // Normal Send:
    const replyMeta = replyingToMessage ? {
      id: replyingToMessage.id,
      username: replyingToMessage.username,
      content: replyingToMessage.content,
    } : null;

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
      replyTo: replyMeta,
    };

    // 3. Append to state instantly and clear input
    if (activeGroupId) setGroupMessages((prev) => [...prev, optimisticMsg]);
    else setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setReplyingToMessage(null);
    setShowMentionPicker(false);
    setMentionQuery(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // 4. Smoothly scroll into view
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 20);

    // 5. Asynchronously persist to Supabase in background
    const sendRequest = activeGroupId
      ? supabaseService.sendGroupChatMessage({
          groupId: activeGroupId,
          userId,
          username,
          avatarUrl,
          content: text,
          replyTo: replyMeta,
        })
      : supabaseService.sendChatMessage({
          userId,
          username,
          avatarUrl,
          seatNumber: mySeat,
          content: text,
          replyTo: replyMeta,
        });
    sendRequest.then((confirmed) => {
      if (confirmed) {
        // Swap temp ID with the real database record
        const replaceMessage = (previous: ChatMessage[]) =>
          previous.map((m) => (m.id === tempId ? confirmed : m));
        if (activeGroupId) setGroupMessages(replaceMessage);
        else setMessages(replaceMessage);
      }
    }).catch((err) => {
      console.warn('Message dispatch failed:', err);
    }).finally(() => {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 30);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setMentionCursorIndex(cursorPos);
      setShowMentionPicker(true);
      setMentionSelectedIndex(0);
    } else {
      setShowMentionPicker(false);
      setMentionQuery(null);
    }
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionPicker && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleInsertMention(mentionCandidates[mentionSelectedIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentionPicker(false);
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!currentUsername) return;
    const cleanUser = currentUsername.replace(/^@/, '').trim().toLowerCase();
    setActiveReactionMsgId(null);

    // Optimistic UI update (case-insensitive username comparison)
    const updateReactions = (previous: ChatMessage[]) => previous.map((msg) => {
      if (msg.id !== messageId) return msg;
      const currentReactions: Record<string, string[]> = { ...(msg.reactions || {}) };
      const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
      const userIndex = users.findIndex((u) => u.replace(/^@/, '').trim().toLowerCase() === cleanUser);

      if (userIndex !== -1) {
        users.splice(userIndex, 1);
        if (users.length === 0) delete currentReactions[emoji];
        else currentReactions[emoji] = users;
      } else {
        currentReactions[emoji] = [...users, cleanUser];
      }
      return { ...msg, reactions: currentReactions };
    });
    if (activeGroupId) setGroupMessages(updateReactions);
    else setMessages(updateReactions);

    if (activeGroupId) {
      await supabaseService.toggleGroupChatMessageReaction(messageId, emoji, cleanUser);
    } else {
      await supabaseService.toggleChatMessageReaction(messageId, emoji, cleanUser);
    }
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
    ? activeMessages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : activeMessages;

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
          <div
            className={`sidebar-thread-cell ${!activeGroupId ? 'active' : ''}`}
            onClick={() => handleSelectConversation(null)}
            role="button"
            tabIndex={0}
          >
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

          <div className="sidebar-section-heading">
            <span>GROUP CHATS</span>
            <button
              type="button"
              className="sidebar-create-group-btn"
              onClick={(event) => {
                event.stopPropagation();
                setGroupFormError('');
                setShowCreateGroup(true);
              }}
              aria-label="Create a group chat"
              title="Create a group chat"
            >
              <span>＋</span> Create
            </button>
          </div>

          {groups.length === 0 ? (
            <div className="sidebar-empty-groups">
              <span className="sidebar-empty-icon">✦</span>
              <span>Create a study circle, project room, or hangout.</span>
            </div>
          ) : (
            groups.map((group) => (
              <div
                key={group.id}
                className={`sidebar-thread-cell group-thread ${activeGroupId === group.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(group.id)}
                role="button"
                tabIndex={0}
              >
                <div className="thread-avatar-icon group-avatar-icon">
                  <span>{group.emoji}</span>
                </div>
                <div className="thread-cell-info">
                  <div className="thread-top-line">
                    <span className="thread-name">{group.name}</span>
                    {group.isMember && <span className="thread-member-mark">✓</span>}
                  </div>
                  <p className="thread-preview-text">
                    {group.description || `${group.memberCount} ${group.memberCount === 1 ? 'member' : 'members'} · ${group.isPrivate ? 'Private' : 'Open to classmates'}`}
                  </p>
                </div>
              </div>
            ))
          )}
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
              <span className="navbar-main-title">{activeConversationTitle}</span>
              <span className="navbar-sub-status">{activeConversationSubtitle}</span>
            </div>
          </div>

          <div className="navbar-right-cluster">
            {isApproved && (
              <button
                type="button"
                className="navbar-create-group-btn"
                onClick={() => {
                  setGroupFormError('');
                  setShowCreateGroup(true);
                }}
                title="Create a group chat"
                aria-label="Create a group chat"
              >
                <span>＋</span>
              </button>
            )}
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
              <h2 className="welcome-headline">{activeConversationTitle}</h2>
              <p className="welcome-subline">
                {activeGroup
                  ? 'No messages yet. Say hello and make this group your own space.'
                  : 'No messages yet. Send a message to your classmates to start the conversation.'}
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

                    <div id={`chat-msg-${msg.id}`} className={`chat-message-entry ${isMine ? 'outgoing' : 'incoming'}`}>
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
                          className={`chat-bubble ${isMine ? 'outgoing' : 'incoming'} ${msg.id.startsWith('temp_') ? 'optimistic' : ''} ${reactionEntries.length > 0 ? 'has-reactions' : ''}`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setActiveReactionMsgId(msg.id);
                          }}
                          onTouchStart={() => handleTouchStartMessage(msg.id)}
                          onTouchEnd={handleTouchEndMessage}
                          onTouchMove={handleTouchEndMessage}
                        >
                          {/* Attached Reply Quote Card */}
                          {msg.replyTo && (
                            <div
                              className="bubble-reply-quote"
                              onClick={(e) => {
                                e.stopPropagation();
                                scrollToMessage(msg.replyTo!.id);
                              }}
                              title="Click to jump to quoted message"
                            >
                              <div className="reply-quote-bar" />
                              <div className="reply-quote-body">
                                <span className="reply-quote-author">@{msg.replyTo.username.replace(/^@/, '')}</span>
                                <span className="reply-quote-snippet">{msg.replyTo.content}</span>
                              </div>
                            </div>
                          )}

                          <p className="bubble-text-content">
                            {renderMessageContent(msg.content)}
                            {msg.isEdited && <span className="bubble-edited-badge" title="Edited message"> (edited)</span>}
                          </p>

                          {/* Reaction Action Trigger */}
                          <button
                            type="button"
                            className="bubble-reaction-trigger"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveReactionMsgId(isReactionPickerOpen ? null : msg.id);
                            }}
                            title="Add Reaction / Manage"
                            aria-label="React or manage"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                              <line x1="9" y1="9" x2="9.01" y2="9" />
                              <line x1="15" y1="9" x2="15.01" y2="9" />
                            </svg>
                          </button>

                          {/* Floating Reaction Bar & Manage Actions */}
                          {isReactionPickerOpen && (
                            <div
                              className="floating-reaction-bar"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="reaction-emojis-cluster">
                                {MESSAGE_REACTIONS.map((r) => {
                                  const hasReacted = isUserInReactions(reactions[r.emoji]);
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

                              <div className="floating-manage-group">
                                <div className="floating-manage-divider" />
                                <button
                                  type="button"
                                  className="manage-item-btn reply"
                                  onClick={() => {
                                    setActiveReactionMsgId(null);
                                    handleStartReply(msg);
                                  }}
                                  title="Reply to message"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 17 4 12 9 7" />
                                    <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                                  </svg>
                                  <span>Reply</span>
                                </button>

                                {isMine && (() => {
                                  const actionStatus = getMessageActionStatus(msg.createdAt);
                                  if (actionStatus.canEditOrDelete) {
                                    return (
                                      <>
                                        <button
                                          type="button"
                                          className="manage-item-btn edit"
                                          onClick={() => handleStartEdit(msg)}
                                          title={`Edit message (${actionStatus.minutesRemaining}m remaining)`}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                          </svg>
                                          <span>Edit ({actionStatus.minutesRemaining}m)</span>
                                        </button>
                                        <button
                                          type="button"
                                          className="manage-item-btn delete"
                                          onClick={() => {
                                            setActiveReactionMsgId(null);
                                            setMessageToDelete(msg);
                                          }}
                                          title={`Delete message (${actionStatus.minutesRemaining}m remaining)`}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          </svg>
                                          <span>Delete</span>
                                        </button>
                                      </>
                                    );
                                  }
                                  return (
                                    <span className="manage-item-expired" title="Message can no longer be edited or deleted (30-minute window exceeded)">
                                      🔒 30m window closed
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Attached Reaction Stickers */}
                          {reactionEntries.length > 0 && (
                            <div className="bubble-attached-reactions">
                              {reactionEntries.map(([emoji, users]) => {
                                const hasReacted = isUserInReactions(users);
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
          {/* Active Reply Message Banner */}
          {replyingToMessage && (
            <div className="composer-reply-banner">
              <div className="reply-banner-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="reply-banner-icon">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                <div className="reply-banner-text-wrap">
                  <span className="reply-banner-heading">
                    Replying to <strong>@{replyingToMessage.username.replace(/^@/, '')}</strong>
                  </span>
                  <span className="reply-banner-preview">{replyingToMessage.content}</span>
                </div>
              </div>
              <button
                type="button"
                className="reply-banner-cancel-action"
                onClick={() => setReplyingToMessage(null)}
                title="Cancel reply (ESC)"
                aria-label="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}

          {/* Active Edit Message Banner */}
          {editingMessage && (
            <div className="composer-edit-banner">
              <div className="edit-banner-left">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="edit-banner-icon">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <div className="edit-banner-text-wrap">
                  <span className="edit-banner-heading">Editing message</span>
                  <span className="edit-banner-preview">{editingMessage.content}</span>
                </div>
              </div>
              <button
                type="button"
                className="edit-banner-cancel-action"
                onClick={handleCancelEdit}
                title="Cancel editing (ESC)"
                aria-label="Cancel edit"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mention Autocomplete Popover */}
          {showMentionPicker && mentionCandidates.length > 0 && (
            <div className="mention-autocomplete-popover">
              <div className="mention-popover-header">
                <span>MENTION CLASSMATE</span>
                <span className="mention-hint-kbd">Tab / Enter to select</span>
              </div>
              <div className="mention-popover-list">
                {mentionCandidates.map((c, i) => (
                  <div
                    key={c.username}
                    className={`mention-popover-item ${i === mentionSelectedIndex ? 'active' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleInsertMention(c.username);
                    }}
                    onMouseEnter={() => setMentionSelectedIndex(i)}
                  >
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt={c.username} className="mention-item-avatar" />
                    ) : (
                      <div className="mention-item-fallback">
                        {c.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="mention-item-info">
                      <span className="mention-item-username">@{c.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                title="Create a group chat"
                aria-label="Create a group chat"
                onClick={() => {
                  setGroupFormError('');
                  setShowCreateGroup(true);
                }}
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
                placeholder={
                  editingMessage
                    ? 'Edit your message...'
                    : replyingToMessage
                    ? `Reply to @${replyingToMessage.username}...`
                    : 'Type a message... (@ to mention)'
                }
                value={inputText}
                onChange={handleInputChange}
                onFocus={() => {
                  setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                  }, 260);
                }}
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
                title={editingMessage ? "Save edit" : "Send"}
                aria-label={editingMessage ? "Save edit" : "Send"}
              >
                {editingMessage ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
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
              <h3 className="info-hall-title">{activeConversationTitle}</h3>
              <span className="info-hall-subtitle">
                {activeGroup?.description || (activeGroup ? 'Student-created group chat' : 'Auditorium Hall S01')}
              </span>
            </div>

            {activeGroup && (
              <div className="info-data-section">
                <span className="data-section-label">GROUP DETAILS</span>
                <div className="data-row-card">
                  <span className="data-row-name">Created by</span>
                  <span className="data-row-val">@{activeGroup.ownerUsername}</span>
                </div>
                <div className="data-row-card">
                  <span className="data-row-name">Members</span>
                  <span className="data-row-val">{activeGroup.memberCount}</span>
                </div>
                <div className="data-row-card">
                  <span className="data-row-name">Access</span>
                  <span className="data-row-val">{activeGroup.isPrivate ? 'Private' : 'Open'}</span>
                </div>
              </div>
            )}

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
              {activeGroup && activeGroup.ownerUsername.toLowerCase() !== currentUsername.toLowerCase() && (
                <button
                  type="button"
                  className="info-action-btn danger"
                  onClick={handleLeaveActiveGroup}
                >
                  Leave this group
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

      {/* Create Group Chat Modal */}
      {showCreateGroup && (
        <div className="group-create-backdrop" onClick={() => setShowCreateGroup(false)}>
          <form
            className="group-create-modal"
            onSubmit={handleCreateGroup}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="group-create-header">
              <div>
                <span className="group-create-kicker">NEW SPACE</span>
                <h3>Create a group chat</h3>
                <p>Make a focused room for projects, study circles, or friends.</p>
              </div>
              <button
                type="button"
                className="group-create-close"
                onClick={() => setShowCreateGroup(false)}
                aria-label="Close create group dialog"
              >
                ×
              </button>
            </div>

            <label className="group-form-label" htmlFor="group-name">Group name</label>
            <input
              id="group-name"
              className="group-form-input"
              value={newGroupName}
              onChange={(event) => setNewGroupName(event.target.value)}
              placeholder="e.g. React Study Circle"
              maxLength={60}
              autoFocus
            />

            <label className="group-form-label" htmlFor="group-description">Description <span>optional</span></label>
            <textarea
              id="group-description"
              className="group-form-input group-form-textarea"
              value={newGroupDescription}
              onChange={(event) => setNewGroupDescription(event.target.value)}
              placeholder="What is this group for?"
              maxLength={180}
              rows={3}
            />

            <div className="group-form-row">
              <div className="group-form-field group-emoji-field">
                <label className="group-form-label" htmlFor="group-emoji">Icon</label>
                <input
                  id="group-emoji"
                  className="group-form-input group-emoji-input"
                  value={newGroupEmoji}
                  onChange={(event) => setNewGroupEmoji(event.target.value.slice(0, 2) || '💬')}
                  aria-label="Group emoji"
                />
              </div>
              <label className="group-visibility-toggle">
                <input
                  type="checkbox"
                  checked={newGroupPrivate}
                  onChange={(event) => setNewGroupPrivate(event.target.checked)}
                />
                <span className="group-toggle-track" aria-hidden="true" />
                <span>
                  <strong>Private group</strong>
                  <small>Only members can discover it</small>
                </span>
              </label>
            </div>

            {!newGroupPrivate && (
              <p className="group-form-hint">Open groups appear in the class directory so classmates can join.</p>
            )}
            {groupFormError && <p className="group-form-error">{groupFormError}</p>}

            <div className="group-create-actions">
              <button
                type="button"
                className="group-cancel-btn"
                onClick={() => setShowCreateGroup(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="group-submit-btn"
                disabled={isCreatingGroup || !isApproved || !newGroupName.trim()}
              >
                {isCreatingGroup ? 'Creating...' : 'Create group'}
              </button>
            </div>
          </form>
        </div>
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

      {/* Mobile Reaction & Message Action Sheet (Optimized for Android & Touch Devices) */}
      {activeReactionMsg && (
        <div
          className="mobile-action-sheet-backdrop"
          onClick={() => setActiveReactionMsgId(null)}
        >
          <div className="mobile-action-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-drag-handle" />

            {/* Reaction Emojis Cluster */}
            <div className="mobile-reaction-emojis-cluster">
              {MESSAGE_REACTIONS.map((r) => {
                const hasReacted = isUserInReactions(activeReactionMsg.reactions?.[r.emoji]);
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`mobile-reaction-btn ${hasReacted ? 'active' : ''}`}
                    onClick={() => {
                      handleToggleReaction(activeReactionMsg.id, r.emoji);
                      setActiveReactionMsgId(null);
                    }}
                    title={r.label}
                    aria-label={`React with ${r.label}`}
                  >
                    <span className="mobile-reaction-emoji">{r.emoji}</span>
                  </button>
                );
              })}
            </div>

            {/* Actions List */}
            <div className="mobile-action-items-list">
              {/* Reply to Message */}
              <button
                type="button"
                className="mobile-action-row-btn reply"
                onClick={() => {
                  const target = activeReactionMsg;
                  setActiveReactionMsgId(null);
                  if (target) handleStartReply(target);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
                <span>Reply to Message</span>
              </button>

              {/* Mention Author if not self */}
              {Boolean(currentUsername && activeReactionMsg.username.toLowerCase() !== currentUsername.toLowerCase()) && (
                <button
                  type="button"
                  className="mobile-action-row-btn"
                  onClick={() => {
                    const author = activeReactionMsg.username.replace(/^@/, '');
                    setActiveReactionMsgId(null);
                    setInputText((prev) => (prev ? `${prev} @${author} ` : `@${author} `));
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
                  </svg>
                  <span>Mention @{activeReactionMsg.username.replace(/^@/, '')}</span>
                </button>
              )}

              {/* Copy Message Text */}
              <button
                type="button"
                className="mobile-action-row-btn"
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(activeReactionMsg.content).catch(() => {});
                  }
                  setActiveReactionMsgId(null);
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy Message Text</span>
              </button>

              {/* Author Actions */}
              {Boolean(currentUsername && activeReactionMsg.username.toLowerCase() === currentUsername.toLowerCase()) && (() => {
                const actionStatus = getMessageActionStatus(activeReactionMsg.createdAt);
                if (actionStatus.canEditOrDelete) {
                  return (
                    <>
                      <button
                        type="button"
                        className="mobile-action-row-btn"
                        onClick={() => handleStartEdit(activeReactionMsg)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit Message ({actionStatus.minutesRemaining}m left)</span>
                      </button>

                      <button
                        type="button"
                        className="mobile-action-row-btn destructive"
                        onClick={() => {
                          const target = activeReactionMsg;
                          setActiveReactionMsgId(null);
                          setMessageToDelete(target);
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        <span>Delete Message</span>
                      </button>
                    </>
                  );
                }
                return (
                  <div className="mobile-action-locked-badge">
                    🔒 Message sent more than 30m ago (cannot be edited or deleted)
                  </div>
                );
              })()}
            </div>

            <button
              type="button"
              className="mobile-action-cancel-btn"
              onClick={() => setActiveReactionMsgId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Message Confirmation Dialog */}
      {messageToDelete && (
        <div className="chat-delete-modal-backdrop" onClick={() => setMessageToDelete(null)}>
          <div className="chat-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 className="delete-modal-title">Delete Message?</h3>
            <p className="delete-modal-desc">
              Are you sure you want to delete this message? This action will permanently remove it from the classroom chat for everyone.
            </p>
            <div className="delete-modal-preview">
              "{messageToDelete.content}"
            </div>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="delete-modal-btn cancel"
                onClick={() => setMessageToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="delete-modal-btn confirm"
                onClick={() => handleConfirmDelete(messageToDelete)}
              >
                Delete Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
