import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChatMessage,
  ChatAttachment,
  ChatGroup,
  MAX_CHAT_ATTACHMENTS,
  MAX_CHAT_ATTACHMENT_BYTES,
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

type PendingChatAttachment = {
  id: string;
  file: File;
  previewUrl: string;
};

const formatAttachmentSize = (bytes: number): string => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
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
  const [pendingAttachments, setPendingAttachments] = useState<PendingChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const pendingAttachmentsRef = useRef<PendingChatAttachment[]>(pendingAttachments);
  pendingAttachmentsRef.current = pendingAttachments;
  const messagesRef = useRef<ChatMessage[]>(messages);
  messagesRef.current = messages;
  const groupMessagesRef = useRef<ChatMessage[]>(groupMessages);
  groupMessagesRef.current = groupMessages;
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );
  const activeMessages = activeGroupId ? groupMessages : messages;
  const activeConversationTitle = activeGroup?.name || 'DevClass MCA';
  const activeConversationSubtitle = activeGroup
    ? activeGroup.isNotesRoom
      ? 'Open to every classmate'
      : `${activeGroup.memberCount} ${activeGroup.memberCount === 1 ? 'member' : 'members'}`
    : '46 Students';
  const classNotesGroup = useMemo(
    () => groups.find((group) => group.isNotesRoom) || null,
    [groups]
  );
  const studentGroups = useMemo(
    () => groups.filter((group) => !group.isNotesRoom),
    [groups]
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

  // Load discoverable groups whenever the chat workspace opens.
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadGroups = () => supabaseService.getChatGroups({ id: currentUser?.id, username: currentUsername }).then((loadedGroups) => {
      if (isMounted) setGroups(loadedGroups);
    });
    loadGroups();
    const interval = setInterval(loadGroups, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, currentUser?.id, currentUsername]);

  // Fetch messages with client-side cache & smart delta sync
  // Uses local cache on refresh so old history is never re-downloaded
  useEffect(() => {
    if (!isOpen || activeGroupId) return;

    let isMounted = true;
    const fetchMessages = async () => {
      const data = await supabaseService.syncChatMessages(messagesRef.current);
      if (!isMounted) return;

      setMessages((prev) => {
        const inFlight = prev.filter((m) => m.id.startsWith('temp_'));

        // Skip re-render if data is unchanged
        if (
          inFlight.length === 0 &&
          prev.length === data.length &&
          prev[prev.length - 1]?.id === data[data.length - 1]?.id &&
          prev[prev.length - 1]?.content === data[data.length - 1]?.content &&
          JSON.stringify(prev[prev.length - 1]?.reactions) === JSON.stringify(data[data.length - 1]?.reactions)
        ) {
          return prev;
        }

        const confirmedIds = new Set(data.map((d) => d.id));
        const stillPending = inFlight.filter((opt) => !confirmedIds.has(opt.id));
        const merged = [...data, ...stillPending];
        setCachedChatMessages(merged);
        return merged;
      });
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 1500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, activeGroupId]);

  // Group conversations use the same live polling rhythm as the global room.
  useEffect(() => {
    if (!isOpen || !activeGroupId) {
      if (!activeGroupId) setGroupMessages([]);
      return;
    }

    let isMounted = true;
    const fetchGroupMessages = async () => {
      const data = await supabaseService.syncGroupChatMessages(activeGroupId, groupMessagesRef.current);
      if (isMounted) setGroupMessages(data);
    };

    fetchGroupMessages();
    const interval = setInterval(fetchGroupMessages, 1800);

    return () => {
      isMounted = false;
      clearInterval(interval);
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
        if (messageToDelete) {
          setMessageToDelete(null);
        } else if (showCreateGroup) {
          setShowCreateGroup(false);
          setGroupFormError('');
        } else if (editingMessage) {
          handleCancelEdit();
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

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
  }, []);

  const clearPendingAttachments = () => {
    setPendingAttachments((previous) => {
      previous.forEach((attachment) => URL.revokeObjectURL(attachment.previewUrl));
      return [];
    });
  };

  const handleAttachmentInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    if (editingMessage) {
      setAttachmentError('Attachments can be added to new messages, not while editing an existing message.');
      return;
    }

    const availableSlots = Math.max(0, MAX_CHAT_ATTACHMENTS - pendingAttachments.length);
    const acceptedFiles = selectedFiles.slice(0, availableSlots).filter((file) => file.size <= MAX_CHAT_ATTACHMENT_BYTES);
    const rejectedCount = selectedFiles.length - acceptedFiles.length;

    if (rejectedCount > 0) {
      setAttachmentError(
        selectedFiles.some((file) => file.size > MAX_CHAT_ATTACHMENT_BYTES)
          ? 'Each attachment must be 25 MB or smaller.'
          : `You can attach up to ${MAX_CHAT_ATTACHMENTS} files per message.`
      );
    } else {
      setAttachmentError('');
    }

    const nextAttachments = acceptedFiles.map((file) => ({
      id: `pending_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingAttachments((previous) => [...previous, ...nextAttachments].slice(0, MAX_CHAT_ATTACHMENTS));
  };

  const handleRemovePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((previous) => {
      const removed = previous.find((attachment) => attachment.id === attachmentId);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return previous.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const handleSelectConversation = async (groupId: string | null) => {
    setActiveGroupId(groupId);
    setSearchQuery('');
    setShowInfoSheet(false);
    setActiveReactionMsgId(null);
    setAttachmentError('');
    clearPendingAttachments();
    handleCancelEdit();

    if (!groupId || !currentUsername) return;
    const group = groups.find((item) => item.id === groupId);
    if (!group || group.isMember || group.isNotesRoom) return;

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
    if (activeGroup.isNotesRoom) return;
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
  const handleSendMessage = async () => {
    const text = inputText.trim();
    if ((!text && pendingAttachments.length === 0) || !isApproved || isUploadingAttachments) return;

    const username = currentUsername || 'student';
    const userId = currentUser?.id;
    const avatarUrl = currentUser?.avatarUrl;
    const conversationGroupId = activeGroupId;
    const queuedAttachments = pendingAttachments.map((attachment) => attachment.file);

    // Handle Edit Submission
    if (editingMessage) {
      if (queuedAttachments.length > 0) {
        setAttachmentError('Attachments can be added to new messages, not while editing an existing message.');
        return;
      }
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
      if (conversationGroupId) setGroupMessages(updateMessages);
      else setMessages(updateMessages);
      handleCancelEdit();

      // Persist in background
      const editRequest = conversationGroupId
        ? supabaseService.editGroupChatMessage(targetId, text, currentUsername)
        : supabaseService.editChatMessage(targetId, text, currentUsername);
      editRequest.then((confirmed) => {
        if (confirmed) {
          const replaceMessage = (previous: ChatMessage[]) =>
            previous.map((m) => (m.id === targetId ? confirmed : m));
          if (conversationGroupId) setGroupMessages(replaceMessage);
          else setMessages(replaceMessage);
        }
      }).catch((err) => {
        console.warn('Failed to persist edit:', err);
      });
      return;
    }

    let uploadedAttachments: ChatAttachment[] = [];
    if (queuedAttachments.length > 0) {
      setIsUploadingAttachments(true);
      setAttachmentError('');
      try {
        uploadedAttachments = await supabaseService.uploadChatAttachments(queuedAttachments, {
          roomId: conversationGroupId || 'global',
          username,
        });
      } catch (error) {
        setAttachmentError(error instanceof Error ? error.message : 'The attachments could not be prepared.');
        setIsUploadingAttachments(false);
        return;
      }
      setIsUploadingAttachments(false);
      if (uploadedAttachments.some((attachment) => attachment.isLocalOnly)) {
        setAttachmentError('Shared storage is unavailable, so these files are visible only in this browser.');
      }
      clearPendingAttachments();
    }

    // Normal Send:
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
      attachments: uploadedAttachments,
      reactions: {},
      createdAt: new Date().toISOString(),
    };

    // 3. Append to state instantly and clear input
    if (conversationGroupId) setGroupMessages((prev) => [...prev, optimisticMsg]);
    else setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // 4. Smoothly scroll into view
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 20);

    // 5. Asynchronously persist to Supabase in background
    const sendRequest = conversationGroupId
      ? supabaseService.sendGroupChatMessage({
          groupId: conversationGroupId,
          userId,
          username,
          avatarUrl,
          content: text,
          attachments: uploadedAttachments,
        })
      : supabaseService.sendChatMessage({
          userId,
          username,
          avatarUrl,
          seatNumber: mySeat,
          content: text,
          attachments: uploadedAttachments,
        });
    sendRequest.then((confirmed) => {
      if (confirmed) {
        // Swap temp ID with the real database record
        const replaceMessage = (previous: ChatMessage[]) =>
          previous.map((m) => (m.id === tempId ? confirmed : m));
        if (conversationGroupId) setGroupMessages(replaceMessage);
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
    const updateReactions = (previous: ChatMessage[]) => previous.map((msg) => {
      if (msg.id !== messageId) return msg;
      const currentReactions: Record<string, string[]> = { ...(msg.reactions || {}) };
      const users = currentReactions[emoji] ? [...currentReactions[emoji]] : [];
      if (users.includes(currentUsername)) {
        const filtered = users.filter((u) => u !== currentUsername);
        if (filtered.length === 0) delete currentReactions[emoji];
        else currentReactions[emoji] = filtered;
      } else {
        currentReactions[emoji] = [...users, currentUsername];
      }
      return { ...msg, reactions: currentReactions };
    });
    if (activeGroupId) setGroupMessages(updateReactions);
    else setMessages(updateReactions);

    if (activeGroupId) {
      await supabaseService.toggleGroupChatMessageReaction(messageId, emoji, currentUsername);
    } else {
      await supabaseService.toggleChatMessageReaction(messageId, emoji, currentUsername);
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

  const formatMessageStamp = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${formatMessageTime(dateStr)}`;
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
          m.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.attachments || []).some((attachment) => attachment.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : activeMessages;

  const getMessagePreview = (message: ChatMessage): string => {
    if (message.content.trim()) return message.content;
    const count = message.attachments?.length || 0;
    return count === 1 ? `📎 ${message.attachments?.[0]?.name || 'Attachment'}` : `📎 ${count} attachments`;
  };

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
                  ? `${latestMessagePreview.username === currentUsername ? 'You: ' : `@${latestMessagePreview.username}: `}${getMessagePreview(latestMessagePreview)}`
                  : 'Auditorium Hall S01'}
              </p>
            </div>
          </div>

          {classNotesGroup && (
            <>
              <div className="sidebar-section-heading notes-section-heading">
                <span>CLASS NOTES</span>
                <span className="notes-public-pill">PUBLIC</span>
              </div>
              <div
                className={`sidebar-thread-cell group-thread notes-thread ${activeGroupId === classNotesGroup.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(classNotesGroup.id)}
                role="button"
                tabIndex={0}
              >
                <div className="thread-avatar-icon group-avatar-icon notes-avatar-icon">
                  <span>{classNotesGroup.emoji}</span>
                </div>
                <div className="thread-cell-info">
                  <div className="thread-top-line">
                    <span className="thread-name">{classNotesGroup.name}</span>
                    <span className="thread-member-mark">↗</span>
                  </div>
                  <p className="thread-preview-text">{classNotesGroup.description}</p>
                </div>
              </div>
            </>
          )}

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

          {studentGroups.length === 0 ? (
            <div className="sidebar-empty-groups">
              <span className="sidebar-empty-icon">✦</span>
              <span>Create a study circle, project room, or hangout.</span>
            </div>
          ) : (
            studentGroups.map((group) => (
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
                {activeGroup?.isNotesRoom
                  ? 'Share lecture notes, PDFs, images, and useful class files with everyone.'
                  : activeGroup
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
                  new Date(msg.createdAt).toDateString() !== new Date(filteredMessages[idx - 1].createdAt).toDateString();

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
                        {/* Sender name and sent time are shown for every message, including files. */}
                        <div className={`chat-sender-line ${isMine ? 'outgoing' : ''}`}>
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
                          <time
                            className="message-sent-time"
                            dateTime={msg.createdAt}
                            title={new Date(msg.createdAt).toLocaleString()}
                          >
                            {formatMessageStamp(msg.createdAt)}
                          </time>
                        </div>

                        {/* Interactive Message Bubble */}
                        <div
                          className={`chat-bubble ${isMine ? 'outgoing' : 'incoming'} ${msg.id.startsWith('temp_') ? 'optimistic' : ''}`}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setActiveReactionMsgId(msg.id);
                          }}
                          onTouchStart={() => handleTouchStartMessage(msg.id)}
                          onTouchEnd={handleTouchEndMessage}
                          onTouchMove={handleTouchEndMessage}
                        >
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="bubble-attachments" aria-label={`${msg.attachments.length} attachment${msg.attachments.length === 1 ? '' : 's'}`}>
                              {msg.attachments.map((attachment) => (
                                attachment.kind === 'image' ? (
                                  <a
                                    key={attachment.id}
                                    className="chat-image-attachment"
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={attachment.name}
                                    title={`Open ${attachment.name}`}
                                  >
                                    <img src={attachment.url} alt={attachment.name} loading="lazy" />
                                    <span className="attachment-image-caption">
                                      <span>{attachment.name}</span>
                                      <small>{formatAttachmentSize(attachment.size)}</small>
                                    </span>
                                  </a>
                                ) : (
                                  <a
                                    key={attachment.id}
                                    className="chat-file-attachment"
                                    href={attachment.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    download={attachment.name}
                                    title={`Open ${attachment.name}`}
                                  >
                                    <span className={`file-type-icon ${attachment.kind}`}>
                                      {attachment.kind === 'pdf' ? 'PDF' : 'FILE'}
                                    </span>
                                    <span className="file-attachment-copy">
                                      <strong>{attachment.name}</strong>
                                      <small>{attachment.kind === 'pdf' ? 'PDF document' : 'Downloadable file'} · {formatAttachmentSize(attachment.size)}</small>
                                    </span>
                                    <span className="file-download-icon" aria-hidden="true">↓</span>
                                  </a>
                                )
                              ))}
                              {msg.attachments.some((attachment) => attachment.isLocalOnly) && (
                                <span className="local-only-attachment-note">Only available in this browser</span>
                              )}
                            </div>
                          )}

                          {(msg.content || msg.isEdited) && (
                            <p className="bubble-text-content">
                              {msg.content}
                              {msg.isEdited && <span className="bubble-edited-badge" title="Edited message"> (edited)</span>}
                            </p>
                          )}

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

                              {isMine && (
                                <div className="floating-manage-group">
                                  <div className="floating-manage-divider" />
                                  {(() => {
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
                              )}
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
          <input
            ref={attachmentInputRef}
            className="chat-hidden-file-input"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar,.7z,.mp3,.wav,.mp4,.mov"
            onChange={handleAttachmentInputChange}
            aria-label="Choose images, PDFs, or files to attach"
          />

          {pendingAttachments.length > 0 && (
            <div className="pending-attachments-strip" aria-label="Attachments ready to send">
              {pendingAttachments.map((attachment) => (
                <div className="pending-attachment-chip" key={attachment.id}>
                  {attachment.file.type.startsWith('image/') ? (
                    <img src={attachment.previewUrl} alt="" />
                  ) : (
                    <span className="pending-file-icon">{attachment.file.type === 'application/pdf' ? 'PDF' : 'FILE'}</span>
                  )}
                  <span className="pending-attachment-copy">
                    <strong>{attachment.file.name}</strong>
                    <small>{formatAttachmentSize(attachment.file.size)}</small>
                  </span>
                  <button
                    type="button"
                    className="pending-attachment-remove"
                    onClick={() => handleRemovePendingAttachment(attachment.id)}
                    aria-label={`Remove ${attachment.file.name}`}
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {(isUploadingAttachments || attachmentError) && (
            <div className={`attachment-status-banner ${attachmentError ? 'warning' : ''}`}>
              <span>{isUploadingAttachments ? 'Preparing attachments…' : attachmentError}</span>
              {!isUploadingAttachments && attachmentError && (
                <button type="button" onClick={() => setAttachmentError('')} aria-label="Dismiss attachment notice">×</button>
              )}
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
                title="Attach images, PDFs, or files"
                aria-label="Attach images, PDFs, or files"
                onClick={() => attachmentInputRef.current?.click()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
              </button>

              {/* Text Area Input */}
              <textarea
                ref={textareaRef}
                className="composer-text-input"
                placeholder={editingMessage ? "Edit your message..." : activeGroup?.isNotesRoom ? "Share notes, files, or a message..." : "Type a message..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
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
                className={`composer-send-btn ${(inputText.trim() || pendingAttachments.length > 0) ? 'active' : ''} ${isDispatchingAnim ? 'dispatching' : ''}`}
                onClick={handleSendMessage}
                disabled={(!inputText.trim() && pendingAttachments.length === 0) || isUploadingAttachments}
                title={editingMessage ? "Save edit" : "Send message"}
                aria-label={editingMessage ? "Save edit" : "Send message"}
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
                  <span className="data-row-val">{activeGroup.isNotesRoom ? 'Everyone' : activeGroup.memberCount}</span>
                </div>
                <div className="data-row-card">
                  <span className="data-row-name">Access</span>
                  <span className="data-row-val">{activeGroup.isNotesRoom ? 'Public' : activeGroup.isPrivate ? 'Private' : 'Open'}</span>
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
              {activeGroup && !activeGroup.isNotesRoom && activeGroup.ownerUsername.toLowerCase() !== currentUsername.toLowerCase() && (
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
