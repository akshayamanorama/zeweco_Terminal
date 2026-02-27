import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, Video, VideoOff, Link as LinkIcon, Calendar, User, Building2, Paperclip, FileText, Copy, Users, ChevronRight, Camera, UserPlus, MoreVertical, Trash2, LogOut, Info, Pencil, UserMinus, CornerDownRight, Search, CheckCheck } from 'lucide-react';
import { User as UserType, Business, ChatThread, ChatMessage, Meeting } from '../types';
import { api } from '../src/api/client';

/**
 * Chat panel: DIRECT chats, GROUP chats (and ENTITY when opened from entity detail). WhatsApp-style.
 * - CXO: Create groups (name + photo), add participants, edit/leave/delete group, start direct with any manager.
 * - Manager: Start direct with CXO only; join groups when added; leave/delete chat.
 * Both: Send text, photo (inline view + Open), file (Open/Download), meeting link; copy; date separators; last-message preview + time.
 * Photos (≤3MB) and files (≤5MB) are sent so both sides can open/view — CXO to Manager and Manager to CXO.
 */
interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType | null;
  managers: UserType[];
  businesses: Business[];
  /** When set, open and select (or create) this entity's chat thread */
  initialEntityId?: string | null;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  currentUser,
  managers = [],
  businesses = [],
  initialEntityId,
}) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [cxoUser, setCxoUser] = useState<UserType | null>(null);
  const [entityTab, setEntityTab] = useState<'chat' | 'meetings'>('chat');
  const [meetLinkInput, setMeetLinkInput] = useState('');
  const [meetingHistory, setMeetingHistory] = useState<Meeting[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [chatUnavailable, setChatUnavailable] = useState(false);
  const [showQuickMeetPopover, setShowQuickMeetPopover] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupStep, setGroupStep] = useState<1 | 2>(1);
  const [groupSelectedIds, setGroupSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState<string>('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const groupPhotoInputRef = useRef<HTMLInputElement>(null);
  const [showAddParticipants, setShowAddParticipants] = useState(false);
  const [addParticipantIds, setAddParticipantIds] = useState<Set<string>>(new Set());
  const [addingParticipants, setAddingParticipants] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [optionsScreen, setOptionsScreen] = useState<'list' | 'groupInfo' | 'editGroup' | 'removeMember'>('list');
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupAvatar, setEditGroupAvatar] = useState('');
  const editGroupPhotoInputRef = useRef<HTMLInputElement>(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [leavingOrDeleting, setLeavingOrDeleting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const messageRefsMap = useRef<Record<string, HTMLDivElement | null>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const meetSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Demo/fallback logins use fake IDs (cxo-1, mgr-101, mgr-102); backend only accepts real DB user IDs. Treat those as chat unavailable.
  const isDemoUser = currentUser?.id && /^(cxo-|mgr-)\d+$/.test(currentUser.id);
  // Only show managers with real DB IDs for starting direct chat (so manager actually receives the thread and messages)
  const managersWithRealIds = managers.filter((m) => m.id && !/^(cxo-|mgr-)\d+$/.test(m.id));

  const loadChatThreads = React.useCallback(async () => {
    if (!currentUser || isDemoUser) return;
    setChatUnavailable(false);
    api.setAuthUser(currentUser.id);
    try {
      setLoading(true);
      const list = await api.getChatThreads();
      const arr = Array.isArray(list) ? list : [];
      setThreads(arr);
      if (currentUser?.role === 'Manager') {
        try {
          const cxo = await api.getCxo();
          setCxoUser(cxo);
        } catch {
          setCxoUser(null);
        }
      } else setCxoUser(null);
    } catch {
      setThreads([]);
      setCxoUser(null);
      setChatUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.role, isDemoUser]);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    if (isDemoUser) {
      setChatUnavailable(true);
      setThreads([]);
      setLoading(false);
      return;
    }
    loadChatThreads();
  }, [isOpen, currentUser?.id, isDemoUser, loadChatThreads]);

  // When initialEntityId is set, find or create entity thread and select it (only when chat is available)
  useEffect(() => {
    if (!isOpen || !currentUser || !initialEntityId || chatUnavailable) return;
    api.setAuthUser(currentUser.id);
    const existing = threads.find((t) => t.type === 'ENTITY' && t.entityId === initialEntityId);
    if (existing) {
      setSelectedThread(existing);
      return;
    }
    api.createChatThread({ type: 'ENTITY', entityId: initialEntityId })
      .then((t) => {
        if (t && t.id) {
          setThreads((prev) => [...prev, t]);
          setSelectedThread(t);
        }
      })
      .catch(() => {});
  }, [initialEntityId, isOpen, currentUser?.id, chatUnavailable]);

  // Load messages when thread is selected; mark as read and refresh thread (for read receipts)
  useEffect(() => {
    if (!selectedThread) {
      setMessages([]);
      setMeetingHistory([]);
      setActiveMeeting(null);
      setSearchQuery('');
      setReplyingTo(null);
      return;
    }
    api.setAuthUser(currentUser?.id ?? null);
    api.getChatMessages(selectedThread.id)
      .then((list) => setMessages(Array.isArray(list) ? list : []))
      .catch(() => setMessages([]));
    api.markThreadRead(selectedThread.id)
      .then((updated) => {
        setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setSelectedThread((s) => (s?.id === updated.id ? updated : s));
      })
      .catch(() => {});
    if (selectedThread.type === 'ENTITY' && selectedThread.entityId) {
      api.getMeetingHistory(selectedThread.entityId)
        .then((list) => {
          const arr = Array.isArray(list) ? list : [];
          setMeetingHistory(arr);
          const active = arr.find((m) => !m.endTime);
          setActiveMeeting(active ?? null);
        })
        .catch(() => {
          setMeetingHistory([]);
          setActiveMeeting(null);
        });
    } else {
      setMeetingHistory([]);
      setActiveMeeting(null);
    }
  }, [selectedThread?.id, selectedThread?.entityId, selectedThread?.type, currentUser?.id]);

  // Poll for new messages (5s) so manager sees CXO messages without refreshing
  useEffect(() => {
    if (!isOpen || !selectedThread || !currentUser || isDemoUser) return;
    const interval = setInterval(() => {
      api.setAuthUser(currentUser.id);
      api.getChatMessages(selectedThread.id)
        .then((list) => setMessages(Array.isArray(list) ? list : []))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, selectedThread?.id, currentUser?.id, isDemoUser]);

  // Refresh thread list periodically (10s) so new threads and last-message preview stay in sync
  useEffect(() => {
    if (!isOpen || !currentUser || isDemoUser || chatUnavailable) return;
    const interval = setInterval(() => {
      api.setAuthUser(currentUser.id);
      api.getChatThreads()
        .then((list) => {
          const arr = Array.isArray(list) ? list : [];
          setThreads(arr);
          setSelectedThread((sel) => (sel ? arr.find((t) => t.id === sel.id) ?? sel : null));
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [isOpen, currentUser?.id, isDemoUser, chatUnavailable]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const threadTitle = (t: ChatThread): string => {
    if (!t) return 'Chat';
    if (t.type === 'GROUP') {
      if (t.name && t.name.trim()) return t.name.trim();
      if (Array.isArray(t.members) && t.members.length > 0) {
        const names = t.members
          .filter((m) => m.userId !== currentUser?.id)
          .map((m) => {
            const u = managers.find((x) => x.id === m.userId) ?? (cxoUser?.id === m.userId ? cxoUser : null);
            return u?.name ?? 'Unknown';
          });
        return names.length > 0 ? names.join(', ') : 'Group';
      }
      return 'Group';
    }
    if (t.type === 'DIRECT' && Array.isArray(t.members) && t.members.length) {
      const otherId = t.members.find((m) => m && m.userId !== currentUser?.id)?.userId;
      if (otherId) {
        const manager = managers.find((m) => m.id === otherId);
        if (manager) return manager.name;
        if (cxoUser?.id === otherId) return cxoUser.name;
      }
    }
    return 'Chat';
  };

  const threadAvatar = (t: ChatThread): string | null => {
    if (!t) return null;
    if (t.type === 'GROUP' && t.avatar) return t.avatar;
    if (t.type === 'GROUP') return null;
    if (t.type === 'DIRECT' && Array.isArray(t.members) && t.members.length) {
      const otherId = t.members.find((m) => m && m.userId !== currentUser?.id)?.userId;
      if (otherId) {
        const manager = managers.find((m) => m.id === otherId);
        if (manager?.avatar) return manager.avatar;
        if (cxoUser?.id === otherId && cxoUser.avatar) return cxoUser.avatar;
      }
    }
    return null;
  };

  const threadSubtitle = (t: ChatThread): string => {
    return 'Chat';
  };

  // Relative time for list (e.g. "2m", "1h", "Yesterday", "Mon")
  const formatThreadTime = (iso: string | undefined): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24 && msgDate.getTime() === today.getTime()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const lastMessagePreview = (t: ChatThread): string => {
    const last = t?.lastMessage?.body;
    if (!last) return 'No messages yet';
    if (last.startsWith('📷IMAGE\n')) return '📷 Photo';
    if (last.startsWith('📎FILE\n')) {
      const parts = last.split('\n');
      const name = parts[1] || 'File';
      return name.length > 35 ? `📎 ${name.slice(0, 35)}…` : `📎 ${name}`;
    }
    const text = last.replace(/^📎\s*/, '📎 ').replace(/^🔗\s*Meeting:\s*/i, '🔗 ');
    return text.length > 42 ? text.slice(0, 42) + '…' : text;
  };

  // WhatsApp-style date labels: Today, Yesterday, or weekday/date
  const formatMessageDateLabel = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (msgDate.getTime() === today.getTime()) return 'Today';
    if (msgDate.getTime() === yesterday.getTime()) return 'Yesterday';
    const diffDays = Math.floor((now.getTime() - msgDate.getTime()) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'long' });
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const filteredMessages = React.useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => m.body.toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const messagesWithDateBreaks = React.useMemo(() => {
    const out: Array<{ type: 'date'; key: string; label: string } | { type: 'msg'; msg: ChatMessage }> = [];
    let lastDate = '';
    for (const msg of filteredMessages) {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (dateKey !== lastDate) {
        lastDate = dateKey;
        out.push({ type: 'date', key: `d-${dateKey}`, label: formatMessageDateLabel(msg.createdAt) });
      }
      out.push({ type: 'msg', msg });
    }
    return out;
  }, [filteredMessages]);

  const isMessageRead = (msg: ChatMessage): boolean => {
    if (msg.senderUserId !== currentUser?.id || !selectedThread?.members) return false;
    const others = selectedThread.members.filter((m) => m.userId !== currentUser.id);
    if (others.length === 0) return true;
    const msgTime = new Date(msg.createdAt).getTime();
    return others.every((m) => m.lastReadAt && new Date(m.lastReadAt).getTime() >= msgTime);
  };

  const replySnippet = (body: string): string => {
    if (body.startsWith('📷IMAGE\n')) return 'Photo';
    if (body.startsWith('📎FILE\n')) return (body.split('\n')[1] || 'File').slice(0, 30);
    if (body.startsWith('📎 ')) return body.replace(/^📎\s*/, '').slice(0, 40);
    if (body.startsWith('🔗')) return 'Meeting link';
    return body.replace(/\n/g, ' ').slice(0, 50);
  };

  const scrollToMessageAndHighlight = (messageId: string) => {
    const inView = filteredMessages.some((m) => m.id === messageId);
    if (!inView && searchQuery.trim()) {
      setSearchQuery('');
      setTimeout(() => {
        const el = messageRefsMap.current[messageId];
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedMessageId(messageId);
          setTimeout(() => setHighlightedMessageId(null), 2200);
        }
      }, 150);
    } else {
      const el = messageRefsMap.current[messageId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 2200);
      }
    }
  };

  const senderName = (msg: ChatMessage): string => {
    if (msg.messageType === 'SYSTEM') return 'System';
    if (!msg.senderUserId) return 'System';
    if (msg.senderUserId === currentUser?.id) return 'You';
    const manager = managers.find((m) => m.id === msg.senderUserId);
    if (manager) return manager.name;
    return 'CXO';
  };

  const senderAvatar = (msg: ChatMessage): string | null => {
    if (msg.messageType === 'SYSTEM' || !msg.senderUserId) return null;
    if (msg.senderUserId === currentUser?.id) return currentUser.avatar ?? null;
    const manager = managers.find((m) => m.id === msg.senderUserId);
    if (manager?.avatar) return manager.avatar;
    if (cxoUser?.id === msg.senderUserId && cxoUser.avatar) return cxoUser.avatar;
    return null;
  };

  const handleSend = async () => {
    const body = input.trim();
    if (!body || !selectedThread || !currentUser) return;
    setSending(true);
    api.setAuthUser(currentUser.id);
    const replyOpts = replyingTo
      ? { replyToMessageId: replyingTo.id, replyToBody: (replyingTo.body || '').replace(/\n/g, ' ').slice(0, 100) }
      : undefined;
    try {
      const msg = await api.sendChatMessage(selectedThread.id, body, 'USER', replyOpts);
      setMessages((prev) => [...prev, msg]);
      setInput('');
      setReplyingTo(null);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThread.id
            ? { ...t, lastMessage: { body: msg.body, createdAt: msg.createdAt, senderUserId: msg.senderUserId } }
            : t
        )
      );
    } catch (_) {
    } finally {
      setSending(false);
    }
  };

  const handleStartMeet = async () => {
    if (!selectedThread?.entityId || !currentUser) return;
    setMeetingLoading(true);
    api.setAuthUser(currentUser.id);
    try {
      await api.startMeeting(selectedThread.entityId, meetLinkInput.trim() || undefined);
      setMeetLinkInput('');
      const list = await api.getMeetingHistory(selectedThread.entityId);
      const arr = Array.isArray(list) ? list : [];
      setMeetingHistory(arr);
      setActiveMeeting(arr.find((m) => !m.endTime) ?? null);
      const msgs = await api.getChatMessages(selectedThread.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (_) {
    } finally {
      setMeetingLoading(false);
    }
  };

  const handleEndMeet = async () => {
    if (!activeMeeting || !selectedThread?.entityId || !currentUser) return;
    setMeetingLoading(true);
    api.setAuthUser(currentUser.id);
    try {
      await api.endMeeting(selectedThread.entityId, activeMeeting.id);
      const list = await api.getMeetingHistory(selectedThread.entityId);
      setMeetingHistory(Array.isArray(list) ? list : []);
      setActiveMeeting(null);
      const msgs = await api.getChatMessages(selectedThread.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (_) {
    } finally {
      setMeetingLoading(false);
    }
  };

  const creatorName = (m: Meeting): string => {
    if (m.createdByUserId === currentUser?.id) return 'You';
    const manager = managers.find((x) => x.id === m.createdByUserId);
    if (manager) return manager.name;
    return 'CXO';
  };

  const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3MB
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedThread || !currentUser) return;
    const isImage = file.type.startsWith('image/');
    const sizeLimit = isImage ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    if (file.size > sizeLimit) {
      const cap = isImage ? '3MB' : '5MB';
      alert(`File too large. Maximum size: ${cap}`);
      return;
    }
    setSending(true);
    api.setAuthUser(currentUser.id);

    const sendBody = (body: string) => {
      api.sendChatMessage(selectedThread!.id, body, 'USER')
        .then((msg) => {
          setMessages((prev) => [...prev, msg]);
          setThreads((prev) =>
            prev.map((t) =>
              t.id === selectedThread!.id
                ? { ...t, lastMessage: { body: msg.body, createdAt: msg.createdAt, senderUserId: msg.senderUserId } }
                : t
            )
          );
        })
        .catch(() => {})
        .finally(() => setSending(false));
    };

    const clearSending = () => setSending(false);

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataURL = String(reader.result);
        const body = `📷IMAGE\n${file.name}\n${dataURL}`;
        sendBody(body);
      };
      reader.onerror = () => clearSending();
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const buf = reader.result as ArrayBuffer;
        const bytes = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(bytes).toString('base64');
        const body = `📎FILE\n${file.name}\n${base64}`;
        sendBody(body);
      };
      reader.onerror = () => clearSending();
      reader.readAsArrayBuffer(file);
    }
  };

  const openQuickMeet = () => {
    if (selectedThread?.type === 'ENTITY' && selectedThread?.entityId) {
      meetSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowQuickMeetPopover(true);
    }
  };

  const handleCreateGroup = async () => {
    const ids = [...groupSelectedIds];
    if (ids.length === 0 || !currentUser) return;
    const name = groupName.trim() || undefined;
    setCreatingGroup(true);
    api.setAuthUser(currentUser.id);
    try {
      const t = await api.createChatThread({
        type: 'GROUP',
        memberIds: ids,
        name: name || `Group (${ids.length + 1})`,
        avatar: groupAvatar || undefined,
      });
      setThreads((prev) => [t, ...prev]);
      setSelectedThread(t);
      setShowNewGroup(false);
      setGroupStep(1);
      setGroupSelectedIds(new Set());
      setGroupName('');
      setGroupAvatar('');
    } catch (_) {}
    setCreatingGroup(false);
  };

  const closeNewGroup = () => {
    setShowNewGroup(false);
    setGroupStep(1);
    setGroupSelectedIds(new Set());
    setGroupName('');
    setGroupAvatar('');
  };

  const onGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setGroupAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const peopleForGroup = (): UserType[] => {
    const list: UserType[] = [];
    if (currentUser?.role === 'CXO') {
      list.push(...managersWithRealIds);
    } else {
      if (cxoUser) list.push(cxoUser);
      list.push(...managersWithRealIds.filter((m) => m.id !== currentUser?.id));
    }
    return list;
  };

  const peopleToAddToGroup = (): UserType[] => {
    if (!selectedThread || selectedThread.type !== 'GROUP' || !Array.isArray(selectedThread.members)) return [];
    const memberIds = new Set(selectedThread.members.map((m) => m.userId));
    return managersWithRealIds.filter((m) => !memberIds.has(m.id));
  };

  const handleAddParticipants = async () => {
    const ids = [...addParticipantIds];
    if (ids.length === 0 || !selectedThread || currentUser?.role !== 'CXO') return;
    setAddingParticipants(true);
    api.setAuthUser(currentUser.id);
    try {
      const updated = await api.addGroupMembers(selectedThread.id, ids);
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedThread(updated);
      setShowAddParticipants(false);
      setAddParticipantIds(new Set());
    } catch (_) {}
    setAddingParticipants(false);
  };

  // Resolve member userId to user (name, avatar) for group info / remove list
  const getMemberUser = (userId: string): UserType | null => {
    if (userId === currentUser?.id) return currentUser;
    const m = managers.find((x) => x.id === userId);
    if (m) return m;
    if (cxoUser?.id === userId) return cxoUser;
    return null;
  };

  const groupMembersList = (): UserType[] => {
    if (!selectedThread || selectedThread.type !== 'GROUP' || !Array.isArray(selectedThread.members)) return [];
    return selectedThread.members
      .map((m) => getMemberUser(m.userId))
      .filter((u): u is UserType => u != null);
  };

  const handleLeaveThread = async () => {
    if (!selectedThread || !currentUser) return;
    setLeavingOrDeleting(true);
    api.setAuthUser(currentUser.id);
    try {
      await api.leaveChatThread(selectedThread.id);
      setThreads((prev) => prev.filter((t) => t.id !== selectedThread.id));
      setSelectedThread(null);
      setShowOptionsMenu(false);
      setOptionsScreen('list');
    } catch (_) {}
    setLeavingOrDeleting(false);
  };

  const handleDeleteGroup = async () => {
    if (!selectedThread || selectedThread.type !== 'GROUP' || currentUser?.role !== 'CXO') return;
    setLeavingOrDeleting(true);
    api.setAuthUser(currentUser.id);
    try {
      await api.deleteGroup(selectedThread.id);
      setThreads((prev) => prev.filter((t) => t.id !== selectedThread.id));
      setSelectedThread(null);
      setShowOptionsMenu(false);
      setOptionsScreen('list');
    } catch (_) {}
    setLeavingOrDeleting(false);
  };

  const openEditGroup = () => {
    setEditGroupName(selectedThread?.name ?? '');
    setEditGroupAvatar(selectedThread?.avatar ?? '');
    setOptionsScreen('editGroup');
  };

  const onEditGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setEditGroupAvatar(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleUpdateGroup = async () => {
    if (!selectedThread || selectedThread.type !== 'GROUP' || currentUser?.role !== 'CXO') return;
    setUpdatingGroup(true);
    api.setAuthUser(currentUser.id);
    try {
      const updated = await api.updateGroup(selectedThread.id, { name: editGroupName.trim() || undefined, avatar: editGroupAvatar || undefined });
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedThread(updated);
      setOptionsScreen('list');
    } catch (_) {}
    setUpdatingGroup(false);
  };

  const handleRemoveParticipant = async (userId: string) => {
    if (!selectedThread || selectedThread.type !== 'GROUP' || currentUser?.role !== 'CXO') return;
    api.setAuthUser(currentUser.id);
    try {
      const updated = await api.removeGroupMember(selectedThread.id, userId);
      setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedThread(updated);
    } catch (_) {}
  };

  const closeOptionsMenu = () => {
    setShowOptionsMenu(false);
    setOptionsScreen('list');
  };

  const generateMeetingLink = (): string => {
    const id = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b % 36)
      .map((n) => (n < 10 ? String(n) : String.fromCharCode(87 + n)))
      .join('');
    return `https://meet.jit.si/zeweco-${id}`;
  };

  const createAndShareMeetingLink = () => {
    if (!selectedThread || !currentUser) return;
    const link = generateMeetingLink();
    setSending(true);
    api.setAuthUser(currentUser.id);
    const body = `🔗 Meeting: ${link}`;
    api.sendChatMessage(selectedThread.id, body, 'USER')
      .then((msg) => {
        setMessages((prev) => [...prev, msg]);
        setShowQuickMeetPopover(false);
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedThread.id
              ? { ...t, lastMessage: { body: msg.body, createdAt: msg.createdAt, senderUserId: msg.senderUserId } }
              : t
          )
        );
      })
      .catch(() => {})
      .finally(() => setSending(false));
  };

  const copyMessage = (text: string) => {
    let toCopy = text;
    if (text.startsWith('📷IMAGE\n')) {
      const parts = text.split('\n');
      toCopy = parts[1] ? `Image: ${parts[1]}` : 'Image';
    } else if (text.startsWith('📎FILE\n')) {
      const parts = text.split('\n');
      toCopy = parts[1] ? `File: ${parts[1]}` : 'File';
    } else {
      toCopy = text.replace(/^🔗\s*Meeting:\s*/i, '').trim() || text;
    }
    navigator.clipboard.writeText(toCopy);
  };

  const onMeetingShortcutClick = () => {
    if (selectedThread?.type === 'ENTITY' && selectedThread?.entityId) {
      meetSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setShowQuickMeetPopover(true);
    }
  };

  if (!isOpen) return null;

  // Avoid rendering panel content without user (prevents crashes from avatar/role access)
  if (!currentUser) {
    return (
      <>
        <div className="fixed inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} aria-hidden />
        <div className="fixed top-0 right-0 h-full w-full sm:max-w-[420px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[70] flex flex-col items-center justify-center p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Sign in to use chat.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-sm font-medium">Close</button>
        </div>
      </>
    );
  }

  const isEntityThread = selectedThread?.type === 'ENTITY' && selectedThread?.entityId;

  return (
    <>
      <div className="fixed inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-sm z-[60]" onClick={onClose} aria-hidden />
      <div className="fixed top-0 right-0 h-full w-full sm:max-w-[420px] bg-slate-50/95 dark:bg-zinc-950 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-[70] flex flex-col overflow-hidden backdrop-blur-sm">
        {/* Header — minimal, branded bar */}
        <header className="flex-none px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/90">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 dark:bg-zinc-700 flex items-center justify-center">
                  <MessageSquare size={18} className="text-white" />
                </div>
                <span className="text-base font-semibold text-slate-800 dark:text-white tracking-tight">Chat</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 pl-11">
                {currentUser?.role === 'CXO'
                  ? 'Direct chats, create groups, add participants'
                  : 'Chat with CXO or in groups you’re in'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* New group modal — WhatsApp-style: step 1 participants, step 2 name + photo */}
        {showNewGroup && (
          <>
            <div className="absolute inset-0 z-[80] bg-black/40 dark:bg-black/60" onClick={closeNewGroup} aria-hidden />
            <div className="absolute inset-x-0 bottom-0 top-auto z-[81] max-h-[85vh] flex flex-col rounded-t-2xl bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
              <div className="flex-none px-4 py-3 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/50">
                <button
                  type="button"
                  onClick={() => (groupStep === 2 ? setGroupStep(1) : closeNewGroup())}
                  className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  {groupStep === 1 ? 'Add participants' : 'Group info'}
                </h3>
                <div className="w-9" />
              </div>

              {groupStep === 1 && (
                <>
                  <div className="flex-1 overflow-y-auto p-3">
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-2">Select members</p>
                    {peopleForGroup().map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 active:bg-slate-200 dark:active:bg-zinc-700 cursor-pointer transition-colors"
                      >
                        <div className="relative shrink-0">
                          <img src={p.avatar ?? ''} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-zinc-600" />
                          {groupSelectedIds.has(p.id) && (
                            <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </span>
                          )}
                        </div>
                        <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white">{p.name}</span>
                        <input
                          type="checkbox"
                          checked={groupSelectedIds.has(p.id)}
                          onChange={(e) => {
                            setGroupSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(p.id); else next.delete(p.id);
                              return next;
                            });
                          }}
                          className="sr-only"
                        />
                      </label>
                    ))}
                    {peopleForGroup().length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-zinc-400 py-6 text-center">No one to add. Add team members first.</p>
                    )}
                  </div>
                  <div className="flex-none p-4 border-t border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                    <button
                      type="button"
                      onClick={() => groupSelectedIds.size > 0 && setGroupStep(2)}
                      disabled={groupSelectedIds.size === 0}
                      className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-slate-800 dark:bg-zinc-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next <ChevronRight size={18} />
                    </button>
                  </div>
                </>
              )}

              {groupStep === 2 && (
                <>
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                    <input ref={groupPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={onGroupPhotoChange} />
                    <button
                      type="button"
                      onClick={() => groupPhotoInputRef.current?.click()}
                      className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-700 flex items-center justify-center border-4 border-slate-300 dark:border-zinc-600 hover:border-slate-400 dark:hover:border-zinc-500 transition-colors mb-6"
                    >
                      {groupAvatar ? (
                        <img src={groupAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={32} className="text-slate-500 dark:text-zinc-400" />
                      )}
                    </button>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-2">Group photo</p>
                    <div className="w-full max-w-[280px]">
                      <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1.5">Group name</label>
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/30"
                      />
                    </div>
                  </div>
                  <div className="flex-none p-4 border-t border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex gap-2">
                    <button type="button" onClick={() => setGroupStep(1)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">Back</button>
                    <button
                      type="button"
                      onClick={handleCreateGroup}
                      disabled={creatingGroup || !groupName.trim()}
                      className="flex-1 py-3 rounded-xl bg-slate-800 dark:bg-zinc-600 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {creatingGroup ? 'Creating…' : 'Create group'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* Add participants to group — CXO only */}
        {showAddParticipants && selectedThread?.type === 'GROUP' && (
          <>
            <div className="absolute inset-0 z-[80] bg-black/40 dark:bg-black/60" onClick={() => { setShowAddParticipants(false); setAddParticipantIds(new Set()); }} aria-hidden />
            <div className="absolute inset-x-0 bottom-0 top-auto z-[81] max-h-[70vh] flex flex-col rounded-t-2xl bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
              <div className="flex-none px-4 py-3 border-b border-slate-200 dark:border-zinc-700 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-800/50">
                <button type="button" onClick={() => { setShowAddParticipants(false); setAddParticipantIds(new Set()); }} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                  <X size={20} />
                </button>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">Add participants</h3>
                <div className="w-9" />
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-2">Select to add</p>
                {peopleToAddToGroup().length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-zinc-400 py-6 text-center">Everyone is already in this group.</p>
                ) : (
                  peopleToAddToGroup().map((p) => (
                    <label key={p.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 cursor-pointer transition-colors">
                      <img src={p.avatar ?? ''} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-200 dark:ring-zinc-600 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white">{p.name}</span>
                      <input
                        type="checkbox"
                        checked={addParticipantIds.has(p.id)}
                        onChange={(e) => {
                          setAddParticipantIds((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(p.id); else next.delete(p.id);
                            return next;
                          });
                        }}
                        className="rounded border-slate-300 dark:border-zinc-600"
                      />
                    </label>
                  ))
                )}
              </div>
              <div className="flex-none p-4 border-t border-slate-200 dark:border-zinc-700 flex gap-2">
                <button type="button" onClick={() => { setShowAddParticipants(false); setAddParticipantIds(new Set()); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">Cancel</button>
                <button type="button" onClick={handleAddParticipants} disabled={addParticipantIds.size === 0 || addingParticipants} className="flex-1 py-2.5 rounded-xl bg-slate-700 dark:bg-zinc-600 text-white text-sm font-medium disabled:opacity-50">Add</button>
              </div>
            </div>
          </>
        )}

        {/* Chat options sheet — group info, edit, leave, delete group / delete chat */}
        {showOptionsMenu && selectedThread && (selectedThread.type === 'DIRECT' || selectedThread.type === 'GROUP') && (
          <>
            <div className="absolute inset-0 z-[80] bg-black/40 dark:bg-black/60" onClick={closeOptionsMenu} aria-hidden />
            <div className="absolute inset-x-0 bottom-0 top-auto z-[81] max-h-[85vh] flex flex-col rounded-t-2xl bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-700 shadow-2xl overflow-hidden">
              <div className="flex-none px-4 py-3 border-b border-slate-200 dark:border-zinc-700 flex items-center gap-3 bg-slate-50/50 dark:bg-zinc-800/50">
                <button type="button" onClick={() => optionsScreen === 'list' ? closeOptionsMenu() : setOptionsScreen('list')} className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  {optionsScreen === 'list' ? 'Chat options' : optionsScreen === 'groupInfo' ? 'Group info' : optionsScreen === 'editGroup' ? 'Edit group' : 'Remove participant'}
                </h3>
                <div className="w-9" />
              </div>

              {optionsScreen === 'list' && (
                <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                  {selectedThread.type === 'GROUP' && (
                    <>
                      <button type="button" onClick={() => setOptionsScreen('groupInfo')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-left">
                        <Info size={20} className="text-slate-500 dark:text-zinc-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-800 dark:text-white">Group info</span>
                      </button>
                      {currentUser?.role === 'CXO' && (
                        <>
                          <button type="button" onClick={openEditGroup} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-left">
                            <Pencil size={20} className="text-slate-500 dark:text-zinc-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-800 dark:text-white">Edit group</span>
                          </button>
                          <button type="button" onClick={() => { setShowOptionsMenu(false); setShowAddParticipants(true); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-left">
                            <UserPlus size={20} className="text-slate-500 dark:text-zinc-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-800 dark:text-white">Add participants</span>
                          </button>
                          <button type="button" onClick={() => setOptionsScreen('removeMember')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-left">
                            <UserMinus size={20} className="text-slate-500 dark:text-zinc-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-800 dark:text-white">Remove participant</span>
                          </button>
                        </>
                      )}
                      <button type="button" onClick={handleLeaveThread} disabled={leavingOrDeleting} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 text-left text-amber-600 dark:text-amber-400">
                        <LogOut size={20} className="shrink-0" />
                        <span className="text-sm font-medium">Leave group</span>
                      </button>
                      {currentUser?.role === 'CXO' && (
                        <button type="button" onClick={handleDeleteGroup} disabled={leavingOrDeleting} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-600 dark:text-red-400">
                          <Trash2 size={20} className="shrink-0" />
                          <span className="text-sm font-medium">Delete group</span>
                        </button>
                      )}
                    </>
                  )}
                  {selectedThread.type === 'DIRECT' && (
                    <button type="button" onClick={handleLeaveThread} disabled={leavingOrDeleting} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-left text-red-600 dark:text-red-400">
                      <Trash2 size={20} className="shrink-0" />
                      <span className="text-sm font-medium">Delete chat</span>
                    </button>
                  )}
                </div>
              )}

              {optionsScreen === 'groupInfo' && (
                <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                  {selectedThread.type === 'GROUP' && (
                    <>
                      {selectedThread.avatar ? (
                        <img src={selectedThread.avatar} alt="" className="w-24 h-24 rounded-full object-cover ring-2 ring-slate-200 dark:ring-zinc-700 mb-4" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center mb-4">
                          <Users size={32} className="text-white" />
                        </div>
                      )}
                      <p className="text-lg font-semibold text-slate-800 dark:text-white mb-1">{selectedThread.name || 'Unnamed group'}</p>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">Participants</p>
                      <div className="w-full space-y-2">
                        {groupMembersList().map((u) => (
                          <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-zinc-800/60">
                            <img src={u.avatar ?? ''} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                            <span className="text-sm font-medium text-slate-800 dark:text-white">{u.name}{u.id === currentUser?.id ? ' (You)' : ''}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {optionsScreen === 'editGroup' && (
                <>
                  <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
                    <input ref={editGroupPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={onEditGroupPhotoChange} />
                    <button type="button" onClick={() => editGroupPhotoInputRef.current?.click()} className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-700 flex items-center justify-center border-4 border-slate-300 dark:border-zinc-600 mb-6">
                      {editGroupAvatar ? <img src={editGroupAvatar} alt="" className="w-full h-full object-cover" /> : <Camera size={32} className="text-slate-500 dark:text-zinc-400" />}
                    </button>
                    <label className="block text-xs font-medium text-slate-600 dark:text-zinc-300 mb-1.5 w-full max-w-[280px]">Group name</label>
                    <input
                      type="text"
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Group name"
                      className="w-full max-w-[280px] px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex-none p-4 border-t border-slate-200 dark:border-zinc-700">
                    <button type="button" onClick={handleUpdateGroup} disabled={updatingGroup || !editGroupName.trim()} className="w-full py-3 rounded-xl bg-slate-800 dark:bg-zinc-600 text-white text-sm font-medium disabled:opacity-50">
                      {updatingGroup ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </>
              )}

              {optionsScreen === 'removeMember' && (
                <div className="flex-1 overflow-y-auto p-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-2">Tap Remove to take out of group</p>
                  {groupMembersList()
                    .filter((u) => u.id !== currentUser?.id)
                    .map((u) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60">
                        <img src={u.avatar ?? ''} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white">{u.name}</span>
                        <button type="button" onClick={() => handleRemoveParticipant(u.id)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                          Remove
                        </button>
                      </div>
                    ))}
                  {groupMembersList().filter((u) => u.id !== currentUser?.id).length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-zinc-400 py-6 text-center">No other participants to remove.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex-1 flex overflow-hidden min-h-0">
          {chatUnavailable ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-4">
                <MessageSquare size={26} className="text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mb-1">
                {isDemoUser ? 'Demo login — chat unavailable' : 'Couldn’t connect to chat'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-[280px] mb-4">
                {isDemoUser
                  ? 'Log in again with the backend running (same email & password) so you get a real session. Then open Chat.'
                  : 'Start the backend: in your project folder open a terminal and run: cd server && npm run dev. Then tap Retry.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {!isDemoUser && (
                  <button
                    type="button"
                    onClick={() => loadChatThreads()}
                    className="px-5 py-3 rounded-xl bg-slate-700 dark:bg-zinc-600 text-white text-sm font-semibold hover:bg-slate-800 dark:hover:bg-zinc-500 shadow-sm"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : !selectedThread ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-9 h-9 rounded-full border-2 border-slate-300 dark:border-zinc-600 border-t-slate-600 dark:border-t-zinc-400 animate-spin" />
                  <p className="text-sm text-slate-500 dark:text-zinc-400">Loading…</p>
                </div>
              ) : threads.filter((t) => t.type !== 'ENTITY').length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center mb-4">
                    <MessageSquare size={28} className="text-slate-400 dark:text-zinc-500" />
                  </div>
                  <p className="text-slate-600 dark:text-zinc-300 font-medium mb-1">No conversations yet</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-500 mb-4">Start a chat{currentUser?.role === 'CXO' ? ' or create a group' : ''}.</p>
                  {currentUser?.role === 'CXO' && (
                    <button
                      type="button"
                      onClick={() => setShowNewGroup(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 mb-4"
                    >
                      <Users size={18} /> New group
                    </button>
                  )}
                  {currentUser?.role === 'CXO' && managersWithRealIds.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Start a conversation</p>
                      {managersWithRealIds.map((m) => (
                        <button
                          key={m.id}
                          onClick={async () => {
                            api.setAuthUser(currentUser?.id ?? null);
                            try {
                              const t = await api.createChatThread({ type: 'DIRECT', otherUserId: m.id });
                              setThreads((prev) => [...prev, t]);
                              setSelectedThread(t);
                            } catch (_) {}
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 transition-all text-left"
                        >
                          <img src={m.avatar ?? ''} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-zinc-600" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{m.name}</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">Tap to chat</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {currentUser?.role === 'Manager' && cxoUser && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-500 uppercase tracking-wider">Start a conversation</p>
                      <button
                        onClick={async () => {
                          api.setAuthUser(currentUser?.id ?? null);
                          try {
                            const t = await api.createChatThread({ type: 'DIRECT', otherUserId: cxoUser.id });
                            setThreads((prev) => [...prev, t]);
                            setSelectedThread(t);
                          } catch (_) {}
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-zinc-600 transition-all text-left"
                      >
                        <img src={cxoUser.avatar ?? ''} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-200 dark:ring-zinc-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{cxoUser.name}</p>
                          <p className="text-xs text-slate-500 dark:text-zinc-400">Tap to chat</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-200/80 dark:divide-zinc-800/80">
                  {currentUser?.role === 'CXO' && (
                    <button
                      type="button"
                      onClick={() => setShowNewGroup(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-200/80 dark:border-zinc-800/80 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 transition-colors text-left"
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-600 text-white flex items-center justify-center shrink-0">
                        <Users size={18} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-slate-800 dark:text-white">New group</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">Add people and start chatting</p>
                      </div>
                      <span className="text-slate-300 dark:text-zinc-600">›</span>
                    </button>
                  )}
                  {threads.filter((t) => t.type !== 'ENTITY').map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedThread(t)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-none hover:bg-slate-100/80 dark:hover:bg-zinc-800/60 active:bg-slate-200/80 dark:active:bg-zinc-700/60 transition-colors text-left border-l-2 border-transparent hover:border-l-slate-400 dark:hover:border-l-zinc-500"
                    >
                      {threadAvatar(t) ? (
                        <img src={threadAvatar(t)!} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0 ring-1 ring-slate-200/60 dark:ring-zinc-700" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-slate-600 text-white">
                          {t.type === 'GROUP' ? <Users size={18} /> : <User size={18} />}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{threadTitle(t)}</p>
                          {t.lastMessage?.createdAt && (
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                              {formatThreadTime(t.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{lastMessagePreview(t)}</p>
                      </div>
                      <span className="text-slate-300 dark:text-zinc-600">›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-w-0">
              {/* Conversation header — back + avatar + name */}
              <div className="flex-none px-3 py-2.5 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-3 bg-white dark:bg-zinc-900/95">
                <button onClick={() => setSelectedThread(null)} className="p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors" aria-label="Back">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                </button>
                {threadAvatar(selectedThread) ? (
                  <img src={threadAvatar(selectedThread)!} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 ring-1 ring-slate-200 dark:ring-zinc-700" />
                ) : (
                  <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center ${selectedThread?.type === 'GROUP' ? 'bg-slate-600' : isEntityThread ? 'bg-amber-500/90' : 'bg-slate-600'}`}>
                    {selectedThread?.type === 'GROUP' ? <Users size={16} className="text-white" /> : isEntityThread ? <Building2 size={16} className="text-white" /> : <User size={16} className="text-white" />}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{threadTitle(selectedThread)}</p>
                </div>
                {currentUser?.role === 'CXO' && selectedThread?.type === 'GROUP' && (
                  <button
                    type="button"
                    onClick={() => setShowAddParticipants(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
                    title="Add participants"
                  >
                    <UserPlus size={18} />
                  </button>
                )}
                {(selectedThread?.type === 'DIRECT' || selectedThread?.type === 'GROUP') && (
                  <button
                    type="button"
                    onClick={() => { setShowOptionsMenu(true); setOptionsScreen('list'); }}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 transition-colors"
                    title="Chat options"
                  >
                    <MoreVertical size={18} />
                  </button>
                )}
              </div>

              {(entityTab === 'chat' || !isEntityThread) && (
                <div className="flex-none px-3 py-2 border-b border-slate-200/80 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                  <div className="flex items-center gap-2">
                    <Search size={16} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search in conversation"
                      className="flex-1 min-w-0 py-2 px-3 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {searchQuery.trim() && (
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">
                      {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}

              {isEntityThread && (
                <div className="flex-none flex gap-1 p-2 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50">
                  <button
                    onClick={() => setEntityTab('chat')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${entityTab === 'chat' ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                  >
                    Chat
                  </button>
                  <button
                    onClick={() => setEntityTab('meetings')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${entityTab === 'meetings' ? 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300'}`}
                  >
                    Meetings
                  </button>
                </div>
              )}

              {(entityTab === 'chat' || !isEntityThread) && (
                <>
                  {/* Messages — date separators + bubble layout (WhatsApp-style) */}
                  <div className="flex-1 overflow-y-auto px-3 py-4 bg-slate-100/80 dark:bg-zinc-900/80">
                    {messagesWithDateBreaks.map((item) =>
                      item.type === 'date' ? (
                        <div key={item.key} className="flex justify-center my-3">
                          <span className="px-3 py-1 rounded-full bg-slate-300/70 dark:bg-zinc-700/70 text-slate-600 dark:text-zinc-400 text-xs font-medium">
                            {item.label}
                          </span>
                        </div>
                      ) : (
                        <div
                          key={item.msg.id}
                          ref={(el) => { messageRefsMap.current[item.msg.id] = el; }}
                          data-message-id={item.msg.id}
                          className={`flex gap-2 mb-3 transition-all duration-300 ${item.msg.senderUserId === currentUser?.id ? 'flex-row-reverse' : ''} ${highlightedMessageId === item.msg.id ? 'ring-2 ring-amber-400 dark:ring-amber-500 rounded-xl bg-amber-500/10 dark:bg-amber-500/10' : ''}`}
                        >
                          {item.msg.messageType !== 'SYSTEM' && item.msg.senderUserId !== currentUser?.id && senderAvatar(item.msg) && (
                            <img src={senderAvatar(item.msg)!} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 mt-0.5 self-end" />
                          )}
                          {item.msg.messageType === 'SYSTEM' && (
                            <div className="w-full flex justify-center my-2">
                              <span className="px-3 py-1.5 rounded-full bg-slate-300/60 dark:bg-zinc-700/60 text-slate-600 dark:text-zinc-400 text-xs italic">
                                {item.msg.body}
                              </span>
                            </div>
                          )}
                          {item.msg.messageType !== 'SYSTEM' && (
                            <div
                              className={`group max-w-[78%] px-3.5 py-2.5 rounded-2xl ${
                                item.msg.senderUserId === currentUser?.id
                                  ? 'bg-slate-700 dark:bg-zinc-700 text-white rounded-br-md shadow-md'
                                  : 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white rounded-bl-md border border-slate-200 dark:border-zinc-700 shadow-sm'
                              }`}
                            >
                              {item.msg.replyToBody && (
                                <button
                                  type="button"
                                  onClick={() => item.msg.replyToMessageId && scrollToMessageAndHighlight(item.msg.replyToMessageId)}
                                  className={`w-full text-left mb-2 pl-2.5 py-1 border-l-2 rounded-r ${item.msg.senderUserId === currentUser?.id ? 'border-slate-400 text-slate-200 hover:bg-white/10' : 'border-slate-400 dark:border-zinc-500 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-700/50'} text-xs truncate transition-colors`}
                                  title="Tap to jump to message"
                                >
                                  {(() => {
                                    const original = messages.find((m) => m.id === item.msg.replyToMessageId);
                                    const who = original ? senderName(original) : null;
                                    return who ? <><span className="font-medium opacity-90">{who}:</span> {replySnippet(item.msg.replyToBody!)}</> : replySnippet(item.msg.replyToBody!);
                                  })()}
                                </button>
                              )}
                              <div className="flex items-start justify-between gap-1">
                                <div className="min-w-0 flex-1">
                                  {item.msg.body.startsWith('📷IMAGE\n') ? (() => {
                                    const parts = item.msg.body.split('\n');
                                    const filename = parts[1] || 'image';
                                    const dataURL = parts.slice(2).join('\n');
                                    return (
                                      <div className="space-y-2">
                                        <img src={dataURL} alt={filename} className="max-w-full max-h-64 rounded-lg object-contain bg-slate-200/50 dark:bg-zinc-700/50" />
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs opacity-80 truncate max-w-[180px]">{filename}</span>
                                          <a href={dataURL} target="_blank" rel="noopener noreferrer" className="text-xs font-medium underline opacity-90 hover:opacity-100">Open</a>
                                        </div>
                                      </div>
                                    );
                                  })() : item.msg.body.startsWith('📎FILE\n') ? (() => {
                                    const parts = item.msg.body.split('\n');
                                    const filename = parts[1] || 'file';
                                    const base64 = parts.slice(2).join('\n');
                                    const openFile = () => {
                                      try {
                                        const binary = atob(base64);
                                        const bytes = new Uint8Array(binary.length);
                                        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                        const blob = new Blob([bytes]);
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = filename;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      } catch (_) {}
                                    };
                                    return (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <FileText size={18} className="shrink-0 opacity-80" />
                                        <span className="text-sm break-all">{filename}</span>
                                        <button type="button" onClick={openFile} className="text-xs font-medium underline opacity-90 hover:opacity-100">Open / Download</button>
                                      </div>
                                    );
                                  })() : item.msg.body.startsWith('📎 ') ? (
                                    <div className="flex items-center gap-2">
                                      <FileText size={16} className="shrink-0 opacity-80" />
                                      <p className="text-sm leading-relaxed break-all">{item.msg.body.replace(/^📎\s*/, '')}</p>
                                    </div>
                                  ) : item.msg.body.startsWith('🔗') ? (
                                    <div className="flex items-start gap-2">
                                      <LinkIcon size={16} className="shrink-0 mt-0.5 opacity-80" />
                                      <span className="text-sm leading-relaxed break-all">
                                        {(() => {
                                          const link = item.msg.body.replace(/^🔗\s*Meeting:\s*/i, '').trim();
                                          const isUrl = /^https?:\/\//i.test(link);
                                          return isUrl ? (
                                            <a href={link} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-90">{link}</a>
                                          ) : (
                                            link
                                          );
                                        })()}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-sm leading-relaxed break-words">{item.msg.body}</p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => copyMessage(item.msg.body)}
                                  className={`shrink-0 p-1 rounded transition-opacity ${(item.msg.body.startsWith('🔗') || item.msg.body.startsWith('📷') || item.msg.body.startsWith('📎')) ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:opacity-100'}`}
                                  title="Copy"
                                >
                                  <Copy size={14} />
                                </button>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 mt-1">
                                <span className={`text-[10px] opacity-80 ${item.msg.senderUserId === currentUser?.id ? 'text-slate-200' : 'text-slate-500 dark:text-zinc-400'}`}>
                                  {new Date(item.msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {item.msg.senderUserId === currentUser?.id && isMessageRead(item.msg) && (
                                  <CheckCheck size={12} className="text-slate-200 shrink-0" title="Seen" />
                                )}
                                {item.msg.messageType !== 'SYSTEM' && (
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(item.msg)}
                                    className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity text-slate-400 dark:text-zinc-500"
                                    title="Reply"
                                  >
                                    <CornerDownRight size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          {item.msg.messageType !== 'SYSTEM' && item.msg.senderUserId === currentUser?.id && (
                            <img src={currentUser?.avatar ?? ''} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 mt-0.5 self-end" />
                          )}
                        </div>
                      )
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Instant Meet (entity only) */}
                  {isEntityThread && (
                    <div ref={meetSectionRef} className="flex-none p-3 border-t border-slate-200/60 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 space-y-2">
                      {activeMeeting ? (
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/80 dark:border-amber-800/50">
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-200">Meeting in progress</span>
                          <button
                            onClick={handleEndMeet}
                            disabled={meetingLoading}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                          >
                            <VideoOff size={12} /> End meet
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            type="url"
                            value={meetLinkInput}
                            onChange={(e) => setMeetLinkInput(e.target.value)}
                            placeholder="Paste Meet / Zoom link (optional)"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/30"
                          />
                          <button
                            onClick={handleStartMeet}
                            disabled={meetingLoading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-700 dark:bg-zinc-600 hover:bg-slate-800 dark:hover:bg-zinc-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
                          >
                            <Video size={16} /> Start instant meet
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Replying to — quoted preview (tap X to cancel) */}
                  {replyingTo && (
                    <div className="flex-none px-3 py-2 border-t border-slate-200 dark:border-zinc-800 bg-slate-100/90 dark:bg-zinc-800/90 flex items-stretch gap-2">
                      <div className="flex-1 min-w-0 flex flex-col justify-center pl-2.5 border-l-2 border-slate-400 dark:border-zinc-500 rounded-r overflow-hidden">
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                          Replying to {senderName(replyingTo)}
                        </span>
                        <span className="text-xs text-slate-700 dark:text-zinc-300 truncate mt-0.5">
                          {replySnippet(replyingTo.body)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="shrink-0 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 transition-colors"
                        title="Cancel reply"
                        aria-label="Cancel reply"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  {/* Input — attachment + pill bar (same for CXO & Manager) */}
                  <div className="flex-none p-3 border-t border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 relative">
                    {showQuickMeetPopover && (
                      <>
                        <div className="absolute inset-0 z-10 bg-black/20 dark:bg-black/40 rounded-t-xl" onClick={() => setShowQuickMeetPopover(false)} aria-hidden />
                        <div className="absolute bottom-full left-3 right-3 mb-1 z-20 p-3 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-xl">
                          <p className="text-xs font-medium text-slate-600 dark:text-zinc-300 mb-2">Create & share meeting link</p>
                          <div className="flex gap-2">
                            <button onClick={() => setShowQuickMeetPopover(false)} className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-zinc-600 text-slate-700 dark:text-zinc-300 text-sm font-medium">Cancel</button>
                            <button
                              type="button"
                              onClick={createAndShareMeetingLink}
                              disabled={sending}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-700 dark:bg-zinc-600 text-white text-sm font-medium hover:bg-slate-800 dark:hover:bg-zinc-500 disabled:opacity-50"
                            >
                              <Video size={16} /> Create & share
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex gap-2 items-center">
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={onMeetingShortcutClick}
                          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
                          title="Meeting"
                        >
                          <Video size={18} />
                        </button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center"
                          title="Send file"
                        >
                          <Paperclip size={18} />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                        placeholder="Message…"
                        className="flex-1 min-w-0 px-4 py-2.5 rounded-full border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/30 dark:focus:ring-zinc-500/30 focus:border-slate-400 dark:focus:border-zinc-500"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="shrink-0 w-10 h-10 rounded-full bg-slate-700 dark:bg-zinc-600 text-white hover:bg-slate-800 dark:hover:bg-zinc-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        title="Send"
                      >
                        <Send size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isEntityThread && entityTab === 'meetings' && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {meetingHistory.length === 0 ? (
                    <div className="py-8 text-center">
                      <Calendar size={32} className="mx-auto text-slate-300 dark:text-zinc-600 mb-3" />
                      <p className="text-sm text-slate-500 dark:text-zinc-400">No meetings yet</p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Start an instant meet from the Chat tab.</p>
                    </div>
                  ) : (
                    meetingHistory.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-200">
                            {new Date(m.startTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                          {m.durationMinutes != null && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                              {m.durationMinutes} min
                            </span>
                          )}
                          {!m.endTime && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Live</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                          <User size={10} /> {creatorName(m)}
                        </p>
                        {m.meetLink && (
                          <a
                            href={m.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <LinkIcon size={12} /> Join link
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
