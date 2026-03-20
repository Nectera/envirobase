"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Hash, Send, Paperclip, X, Plus, Search,
  Users, ChevronLeft, Loader2, Image as ImageIcon, FileText,
  AtSign, User as UserIcon, RefreshCw, Lock, Globe, Check,
  Pencil, Trash2, UserPlus, UserMinus, SmilePlus, Video,
} from "lucide-react";
import EmojiReactions from "@/components/EmojiReactions";

// ─── Pull-to-refresh hook ──────────────────────────────────────
function usePullToRefresh(onRefresh: () => Promise<void>, scrollRef: React.RefObject<HTMLElement | null>) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullDistanceRef = useRef(0);
  const onRefreshRef = useRef(onRefresh);
  const threshold = 60;

  // Keep callback ref fresh to avoid stale closures
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPulling.current) return;
      const diff = e.touches[0].clientY - startY.current;
      if (diff > 0 && el.scrollTop <= 0) {
        const distance = Math.min(diff * 0.5, 100);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
        setPulling(true);
        if (distance > 10) e.preventDefault();
      } else {
        isPulling.current = false;
        pullDistanceRef.current = 0;
        setPulling(false);
        setPullDistance(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;
      const dist = pullDistanceRef.current;
      if (dist >= threshold) {
        setRefreshing(true);
        setPullDistance(threshold);
        try { await onRefreshRef.current(); } catch {}
        setRefreshing(false);
      }
      pullDistanceRef.current = 0;
      setPulling(false);
      setPullDistance(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [scrollRef, threshold]);

  const indicator = (pulling || refreshing) ? (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200"
      style={{ height: refreshing ? threshold : pullDistance }}
    >
      <RefreshCw
        size={18}
        className={`text-green-500 transition-transform ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: `rotate(${pullDistance * 3}deg)`, opacity: Math.min(pullDistance / threshold, 1) }}
      />
    </div>
  ) : null;

  return { indicator, refreshing };
}

interface ChatUser {
  id: string;
  name: string;
  email: string;
  role: string;
  needsAccount?: boolean;
  workerId?: string | null;
}

interface Channel {
  id: string;
  name: string;
  type: string;
  description?: string;
  projectId?: string;
  isPrivate: boolean;
  memberCount: number;
  unreadCount: number;
  lastMessage?: { content: string; senderName: string; createdAt: string };
  createdAt: string;
}

interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  mentions?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  createdAt: string;
}

interface ChatViewProps {
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  allUsers: ChatUser[];
}

export default function ChatView({ currentUserId, currentUserName, currentUserRole, allUsers }: ChatViewProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");

  // Create channel form
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState("general");
  const [newChannelRestricted, setNewChannelRestricted] = useState(false);
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");

  // @mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);

  // File upload
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ fileUrl: string; fileName: string; fileSize: number; fileMimeType: string } | null>(null);

  // Multi-select DM
  const [dmSelectedUsers, setDmSelectedUsers] = useState<string[]>([]);
  const [dmSearchQuery, setDmSearchQuery] = useState("");

  // Members management
  const [showMembers, setShowMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState<{ id: string; userId: string; user: ChatUser }[]>([]);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Edit channel
  const [showEditChannel, setShowEditChannel] = useState(false);
  const [editChannelName, setEditChannelName] = useState("");
  const [editChannelDesc, setEditChannelDesc] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState(false);

  // Emoji reactions per message: { [messageId]: { emoji, userId, userName }[] }
  const [messageReactions, setMessageReactions] = useState<Record<string, { emoji: string; userId: string; userName: string }[]>>({});

  // Composer emoji picker
  const [showComposerEmoji, setShowComposerEmoji] = useState(false);
  const composerEmojiRef = useRef<HTMLDivElement>(null);

  // Video meeting
  const [startingMeet, setStartingMeet] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageTime = useRef<string | null>(null);
  const channelListRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // ─── Fetch channels ───────────────────────────────────────────
  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/channels");
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchChannels().then(() => setLoading(false));
    const interval = setInterval(fetchChannels, 10000);
    return () => clearInterval(interval);
  }, [fetchChannels]);

  // ─── Fetch messages (polling) ─────────────────────────────────
  const fetchMessages = useCallback(async (channelId: string, isPolling = false) => {
    try {
      const params = new URLSearchParams();
      if (isPolling && lastMessageTime.current) {
        params.set("after", lastMessageTime.current);
      } else {
        params.set("limit", "50");
      }
      const res = await fetch(`/api/chat/channels/${channelId}/messages?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (isPolling && lastMessageTime.current) {
          if (data.messages.length > 0) {
            setMessages((prev) => [...prev, ...data.messages]);
          }
        } else {
          setMessages(data.messages);
        }
        // Update last message time
        const allMsgs = isPolling ? data.messages : data.messages;
        if (allMsgs.length > 0) {
          lastMessageTime.current = allMsgs[allMsgs.length - 1].createdAt;
        }
      }
    } catch { }
  }, []);

  useEffect(() => {
    if (!selectedChannelId) return;
    lastMessageTime.current = null;
    fetchMessages(selectedChannelId);

    // Mark as read
    fetch(`/api/chat/channels/${selectedChannelId}/read`, { method: "PUT" }).catch(() => { });

    const interval = setInterval(() => fetchMessages(selectedChannelId, true), 3000);
    return () => clearInterval(interval);
  }, [selectedChannelId, fetchMessages]);

  // ─── Fetch reactions for visible messages ─────────────────────
  const fetchReactionsForMessages = useCallback(async (msgs: Message[]) => {
    if (msgs.length === 0) return;
    try {
      const ids = msgs.map((m) => m.id).join(",");
      const res = await fetch(`/api/reactions?targetType=message&targetIds=${ids}`);
      if (res.ok) {
        const grouped: Record<string, { emoji: string; userId: string; userName: string }[]> = await res.json();
        setMessageReactions((prev) => ({ ...prev, ...grouped }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length > 0) fetchReactionsForMessages(messages);
  }, [messages, fetchReactionsForMessages]);

  // ─── Auto-scroll on new messages ──────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Composer emoji picker ───────────────────────────────────
  const COMPOSER_EMOJIS = ["😀","😂","😍","🤔","👍","👎","❤️","🔥","🎉","✅","👀","💯","😎","🙏","💪","😢","😮","🤣","👏","🙌","😊","🥳","😤","🤝"];

  useEffect(() => {
    if (!showComposerEmoji) return;
    const handler = (e: MouseEvent) => {
      if (composerEmojiRef.current && !composerEmojiRef.current.contains(e.target as Node)) {
        setShowComposerEmoji(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showComposerEmoji]);

  const insertEmoji = (emoji: string) => {
    setMessageInput((prev) => prev + emoji);
    setShowComposerEmoji(false);
    inputRef.current?.focus();
  };

  // ─── Send message ─────────────────────────────────────────────
  const handleSend = async () => {
    if ((!messageInput.trim() && !pendingFile) || !selectedChannelId || sendingMessage) return;

    setSendingMessage(true);
    try {
      const payload: any = {
        content: messageInput.trim(),
        mentions: pendingMentions.length > 0 ? pendingMentions : undefined,
      };
      if (pendingFile) {
        payload.fileUrl = pendingFile.fileUrl;
        payload.fileName = pendingFile.fileName;
        payload.fileSize = pendingFile.fileSize;
        payload.fileMimeType = pendingFile.fileMimeType;
      }

      const res = await fetch(`/api/chat/channels/${selectedChannelId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages((prev) => [...prev, newMsg]);
        lastMessageTime.current = newMsg.createdAt;
        setMessageInput("");
        setPendingMentions([]);
        setPendingFile(null);
        inputRef.current?.focus();
      }
    } catch { } finally {
      setSendingMessage(false);
    }
  };

  // ─── File upload ──────────────────────────────────────────────
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        setPendingFile(data);
      }
    } catch { } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Start video meeting ─────────────────────────────────────
  const handleStartMeet = async () => {
    if (!selectedChannelId || startingMeet) return;
    setStartingMeet(true);
    try {
      const res = await fetch("/api/chat/meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: selectedChannelId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        lastMessageTime.current = data.message.createdAt;
        window.open(data.meetUrl, "_blank");
      }
    } catch { } finally {
      setStartingMeet(false);
    }
  };

  // ─── Create channel ───────────────────────────────────────────
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      const res = await fetch("/api/chat/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChannelName,
          type: newChannelType,
          description: newChannelDesc || undefined,
          isPrivate: newChannelRestricted,
          memberIds: newChannelRestricted ? newChannelMembers : undefined,
        }),
      });
      if (res.ok) {
        const ch = await res.json();
        await fetchChannels();
        setSelectedChannelId(ch.id);
        setShowCreateChannel(false);
        setNewChannelName("");
        setNewChannelDesc("");
        setNewChannelRestricted(false);
        setNewChannelMembers([]);
        setMemberSearchQuery("");
      }
    } catch { }
  };

  // ─── Start DM (supports multi-person) ────────────────────────
  const handleStartDm = async (userId?: string) => {
    const userIds = userId ? [userId] : dmSelectedUsers;
    if (userIds.length === 0) return;
    try {
      const res = await fetch("/api/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchChannels();
        setSelectedChannelId(data.channelId);
        setShowNewDm(false);
        setShowSidebar(false);
        setDmSelectedUsers([]);
        setDmSearchQuery("");
      }
    } catch { }
  };

  // ─── Members management ─────────────────────────────────────
  const fetchMembers = async (channelId: string) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/chat/channels/${channelId}/members`);
      if (res.ok) {
        const data = await res.json();
        setChannelMembers(data);
      }
    } catch { }
    setLoadingMembers(false);
  };

  const handleAddMember = async (userId: string) => {
    if (!selectedChannelId) return;
    try {
      const res = await fetch(`/api/chat/channels/${selectedChannelId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchMembers(selectedChannelId);
        await fetchChannels();
        setAddMemberSearch("");
      }
    } catch { }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedChannelId) return;
    if (!confirm("Remove this member from the channel?")) return;
    try {
      const res = await fetch(`/api/chat/channels/${selectedChannelId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchMembers(selectedChannelId);
        await fetchChannels();
      }
    } catch { }
  };

  // ─── Edit channel ──────────────────────────────────────────
  const handleEditChannel = async () => {
    if (!selectedChannelId || !editChannelName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/chat/channels/${selectedChannelId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editChannelName, description: editChannelDesc }),
      });
      if (res.ok) {
        await fetchChannels();
        setShowEditChannel(false);
      }
    } catch { }
    setSavingEdit(false);
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannelId) return;
    if (!confirm("Delete this channel? All messages will be permanently removed.")) return;
    setDeletingChannel(true);
    try {
      const res = await fetch(`/api/chat/channels/${selectedChannelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSelectedChannelId(null);
        setShowEditChannel(false);
        setShowSidebar(true);
        await fetchChannels();
      }
    } catch { }
    setDeletingChannel(false);
  };

  // ─── @mention handling ────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessageInput(val);

    // Detect @mention
    const cursorPos = e.target.selectionStart || 0;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionSearch(atMatch[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const filteredMentionUsers = allUsers.filter(
    (u) =>
      u.id !== currentUserId &&
      !u.needsAccount &&
      u.name.toLowerCase().includes(mentionSearch)
  ).slice(0, 8);

  // Check if @all should appear in mention list
  const showAllOption = "all".includes(mentionSearch) || mentionSearch === "";

  const insertMention = (user: ChatUser | "all") => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBefore = messageInput.slice(0, cursorPos);
    const textAfter = messageInput.slice(cursorPos);

    if (user === "all") {
      const replaced = textBefore.replace(/@\w*$/, `@all `);
      setMessageInput(replaced + textAfter);
      // Add special "all" token — backend resolves to all channel members
      setPendingMentions((prev) => Array.from(new Set([...prev, "all"])));
    } else {
      const replaced = textBefore.replace(/@\w*$/, `@${user.name} `);
      setMessageInput(replaced + textAfter);
      setPendingMentions((prev) => Array.from(new Set([...prev, user.id])));
    }
    setShowMentions(false);
    inputRef.current?.focus();
  };

  // ─── Key handling ─────────────────────────────────────────────
  // Total mention options: @all (if shown) + filtered users
  const mentionOptions: ({ type: "all" } | { type: "user"; user: ChatUser })[] = [
    ...(showAllOption ? [{ type: "all" as const }] : []),
    ...filteredMentionUsers.map((u) => ({ type: "user" as const, user: u })),
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => Math.min(prev + 1, mentionOptions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const opt = mentionOptions[mentionIndex];
        if (opt) {
          insertMention(opt.type === "all" ? "all" : opt.user);
        }
        return;
      } else if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Helper: render message content with @mentions highlighted ─
  const renderContent = (msg: Message) => {
    let text = msg.content;

    // Detect meeting messages (Google Meet or Zoom)
    const meetMatch = text.match(/📹 Started a (Google Meet|Zoom Meeting)\n(https:\/\/\S+)/);
    if (meetMatch) {
      const platformLabel = meetMatch[1];
      const url = meetMatch[2];
      const isZoom = platformLabel === "Zoom Meeting";
      return (
        <div className="inline-block bg-green-50 border border-green-200 rounded-lg px-3 py-2 mt-1">
          <div className="flex items-center gap-2">
            <Video size={16} className={isZoom ? "text-blue-600" : "text-green-600"} />
            <span className="text-sm font-medium text-slate-800">{platformLabel}</span>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs font-medium mt-1 inline-block ${isZoom ? "text-blue-600 hover:text-blue-700" : "text-green-600 hover:text-green-700"}`}
          >
            Join meeting &rarr;
          </a>
        </div>
      );
    }

    // Highlight @mentions
    const mentionIds: string[] = msg.mentions ? JSON.parse(msg.mentions) : [];

    // Handle @all highlight
    if (mentionIds.includes("all")) {
      text = text.replace(
        /@all\b/gi,
        `<span class="bg-amber-100 text-amber-800 px-1 rounded font-medium">@all</span>`
      );
    }

    for (const id of mentionIds) {
      if (id === "all") continue;
      const user = allUsers.find((u) => u.id === id);
      if (user) {
        text = text.replace(
          new RegExp(`@${user.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gi"),
          `<span class="bg-green-100 text-green-800 px-1 rounded font-medium">@${user.name}</span>`
        );
      }
    }
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  // ─── Helpers ──────────────────────────────────────────────────
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })} ${time}`;
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // ─── Pull-to-refresh ─────────────────────────────────────────
  const handleRefreshChannels = useCallback(async () => {
    await fetchChannels();
  }, [fetchChannels]);

  const handleRefreshMessages = useCallback(async () => {
    if (selectedChannelId) {
      lastMessageTime.current = null;
      await fetchMessages(selectedChannelId);
      // Re-mark as read
      fetch(`/api/chat/channels/${selectedChannelId}/read`, { method: "PUT" }).catch(() => {});
    }
  }, [selectedChannelId, fetchMessages]);

  const { indicator: channelPullIndicator } = usePullToRefresh(handleRefreshChannels, channelListRef);
  const { indicator: messagesPullIndicator } = usePullToRefresh(handleRefreshMessages, messagesScrollRef);

  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase())
  );
  const groupChannels = filteredChannels.filter((c) => c.type !== "dm");
  const dmChannels = filteredChannels.filter((c) => c.type === "dm");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-400" size={24} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl border border-slate-100 overflow-hidden relative" style={{ overscrollBehavior: "none" }}>
      {/* ─── Channel Sidebar ──────────────────────────────────── */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden md:flex"
        } flex-col w-full md:w-72 border-r border-slate-100 bg-white md:bg-slate-50/50 absolute md:relative inset-0 z-10 md:z-auto`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-green-600" />
              Messages
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewDm(true)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                title="New Direct Message"
              >
                <UserIcon size={16} />
              </button>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                title="New Channel"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search channels..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
            />
          </div>
        </div>

        {/* Channel List */}
        <div ref={channelListRef} className="flex-1 overflow-y-auto" style={{ overscrollBehavior: "none", WebkitOverflowScrolling: "touch" }}>
          {channelPullIndicator}
          {groupChannels.length > 0 && (
            <div className="px-3 pt-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">Channels</p>
              {groupChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { setSelectedChannelId(ch.id); setShowSidebar(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    selectedChannelId === ch.id
                      ? "bg-green-50 text-green-800"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  {ch.isPrivate ? (
                    <Lock size={14} className="text-amber-500 flex-shrink-0" />
                  ) : (
                    <Hash size={14} className="text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ch.name}</p>
                    {ch.lastMessage && (
                      <p className="text-xs text-slate-400 truncate">
                        {ch.lastMessage.senderName}: {ch.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {ch.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {dmChannels.length > 0 && (
            <div className="px-3 pt-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">Direct Messages</p>
              {dmChannels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => { setSelectedChannelId(ch.id); setShowSidebar(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    selectedChannelId === ch.id
                      ? "bg-green-50 text-green-800"
                      : "hover:bg-slate-100 text-slate-700"
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-semibold text-slate-600">{getInitials(ch.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ch.name}</p>
                    {ch.lastMessage && (
                      <p className="text-xs text-slate-400 truncate">{ch.lastMessage.content}</p>
                    )}
                  </div>
                  {ch.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full">
                      {ch.unreadCount > 99 ? "99+" : ch.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {channels.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              <p>No conversations yet.</p>
              <p className="text-xs mt-1">Create a channel or start a DM!</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Message Area ─────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${showSidebar ? "hidden md:flex" : "flex"}`}>
        {selectedChannel ? (
          <>
            {/* Channel Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <button
                onClick={() => { setShowSidebar(true); setSelectedChannelId(null); }}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2 min-w-0">
                {selectedChannel.type === "dm" ? (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-600">{getInitials(selectedChannel.name)}</span>
                  </div>
                ) : selectedChannel.isPrivate ? (
                  <Lock size={16} className="text-amber-500 flex-shrink-0" />
                ) : (
                  <Hash size={16} className="text-slate-400 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">{selectedChannel.name}</h3>
                  {selectedChannel.description && (
                    <p className="text-xs text-slate-400 truncate">{selectedChannel.description}</p>
                  )}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {selectedChannel.type !== "dm" && (
                  <button
                    onClick={handleStartMeet}
                    disabled={startingMeet}
                    className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition disabled:opacity-50"
                    title="Start video meeting"
                  >
                    {startingMeet ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
                  </button>
                )}
                {selectedChannel.type !== "dm" && (
                  <button
                    onClick={() => { setEditChannelName(selectedChannel.name); setEditChannelDesc(selectedChannel.description || ""); setShowEditChannel(true); }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                    title="Edit channel"
                  >
                    <Pencil size={13} />
                  </button>
                )}
                <button
                  onClick={() => { setShowMembers(true); if (selectedChannelId) fetchMembers(selectedChannelId); }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition"
                  title="Manage members"
                >
                  <Users size={12} />
                  <span>{selectedChannel.memberCount}</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-4 space-y-1" style={{ overscrollBehavior: "none", WebkitOverflowScrolling: "touch" }}>
              {messagesPullIndicator}
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  <div className="text-center">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              )}
              {messages.map((msg, i) => {
                const isOwn = msg.senderId === currentUserId;
                const showAvatar = i === 0 || messages[i - 1].senderId !== msg.senderId;
                const isImage = msg.fileMimeType?.startsWith("image/");

                return (
                  <div key={msg.id} className={`flex gap-2.5 group ${showAvatar ? "mt-4" : "mt-0.5"}`}>
                    {/* Avatar */}
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold ${
                            isOwn ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {getInitials(msg.senderName)}
                        </div>
                      )}
                    </div>

                    {/* Message Bubble */}
                    <div className="flex-1 min-w-0">
                      {showAvatar && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-slate-800">{msg.senderName}</span>
                          <span className="text-[10px] text-slate-400">{formatTime(msg.createdAt)}</span>
                        </div>
                      )}
                      {msg.content && (
                        <p className="text-sm text-slate-700 leading-relaxed break-words">
                          {renderContent(msg)}
                        </p>
                      )}
                      {msg.fileUrl && isImage && (
                        <img
                          src={msg.fileUrl}
                          alt={msg.fileName || "Image"}
                          className="mt-1 rounded-lg max-w-xs max-h-60 object-cover border border-slate-200"
                        />
                      )}
                      {msg.fileUrl && !isImage && (
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <FileText size={14} className="text-slate-500" />
                          <span className="text-sm text-slate-700 truncate max-w-[200px]">{msg.fileName || "File"}</span>
                          {msg.fileSize && (
                            <span className="text-[10px] text-slate-400">
                              {(msg.fileSize / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </a>
                      )}
                      <EmojiReactions
                        targetType="message"
                        targetId={msg.id}
                        currentUserId={currentUserId}
                        initialReactions={messageReactions[msg.id] || []}
                      />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="px-4 py-3 pb-16 md:pb-3 border-t border-slate-100 bg-white relative z-20">
              {/* Pending file preview */}
              {pendingFile && (
                <div className="mb-2 flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                  {pendingFile.fileMimeType.startsWith("image/") ? (
                    <ImageIcon size={14} className="text-blue-500" />
                  ) : (
                    <FileText size={14} className="text-slate-500" />
                  )}
                  <span className="text-xs text-slate-600 truncate flex-1">{pendingFile.fileName}</span>
                  <button onClick={() => setPendingFile(null)} className="text-slate-400 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="relative">
                {/* @mention dropdown */}
                {showMentions && mentionOptions.length > 0 && (
                  <div className="absolute bottom-full left-0 mb-1 w-64 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-20">
                    {mentionOptions.map((opt, i) =>
                      opt.type === "all" ? (
                        <button
                          key="__all__"
                          onClick={() => insertMention("all")}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                            i === mentionIndex ? "bg-green-50 text-green-800" : "text-slate-700"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                            <Users size={11} className="text-amber-600" />
                          </div>
                          <span className="font-medium">@all</span>
                          <span className="text-xs text-slate-400 ml-auto">Notify everyone</span>
                        </button>
                      ) : (
                        <button
                          key={opt.user.id}
                          onClick={() => insertMention(opt.user)}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                            i === mentionIndex ? "bg-green-50 text-green-800" : "text-slate-700"
                          }`}
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-[9px] font-semibold text-slate-600">{getInitials(opt.user.name)}</span>
                          </div>
                          <span className="font-medium">{opt.user.name}</span>
                          <span className="text-xs text-slate-400 ml-auto">{opt.user.role}</span>
                        </button>
                      )
                    )}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx,.xlsx,.csv,.txt"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex-shrink-0"
                    title="Attach file"
                  >
                    {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                  </button>
                  {/* Emoji picker for composer */}
                  <div className="relative flex-shrink-0" ref={composerEmojiRef}>
                    <button
                      onClick={() => setShowComposerEmoji(!showComposerEmoji)}
                      className={`p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition ${showComposerEmoji ? "bg-slate-100 text-slate-600" : ""}`}
                      title="Insert emoji"
                    >
                      <SmilePlus size={16} />
                    </button>
                    {showComposerEmoji && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-xl border border-slate-200 shadow-lg z-30 p-2 grid grid-cols-8 gap-0.5" style={{ width: "280px" }}>
                        {COMPOSER_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => insertEmoji(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-slate-100 transition"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    ref={inputRef}
                    value={messageInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (@ to mention)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 max-h-32"
                    style={{ minHeight: "40px" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sendingMessage || (!messageInput.trim() && !pendingFile)}
                    className="p-2.5 rounded-xl bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:hover:bg-green-500 transition-colors flex-shrink-0"
                  >
                    {sendingMessage ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* No channel selected */
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium text-slate-500">Select a conversation</p>
              <p className="text-sm mt-1">Choose a channel or start a new message</p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create Channel Modal ─────────────────────────────── */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowCreateChannel(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Create Channel</h3>
              <button onClick={() => setShowCreateChannel(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="text-sm font-medium text-slate-700">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. general, safety-updates"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Description (optional)</label>
                <input
                  type="text"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What's this channel about?"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Type</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                >
                  <option value="general">General</option>
                  <option value="project">Project</option>
                </select>
              </div>

              {/* Access control */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Access</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setNewChannelRestricted(false); setNewChannelMembers([]); }}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      !newChannelRestricted
                        ? "border-green-400 bg-green-50 text-green-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Globe size={14} />
                    <div className="text-left">
                      <p className="font-medium">Open</p>
                      <p className="text-[10px] opacity-70">Everyone can see</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewChannelRestricted(true)}
                    className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                      newChannelRestricted
                        ? "border-green-400 bg-green-50 text-green-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Lock size={14} />
                    <div className="text-left">
                      <p className="font-medium">Restricted</p>
                      <p className="text-[10px] opacity-70">Invite only</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Member picker (shown when restricted) */}
              {newChannelRestricted && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Add Members
                    {newChannelMembers.length > 0 && (
                      <span className="ml-1.5 text-xs text-green-600 font-normal">
                        ({newChannelMembers.length} selected)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 mb-2"
                  />
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50">
                    {allUsers
                      .filter((u) =>
                        u.id !== currentUserId &&
                        u.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
                      )
                      .map((user) => {
                        const isSelected = newChannelMembers.includes(user.id);
                        return (
                          <button
                            key={user.id}
                            type="button"
                            disabled={user.needsAccount}
                            onClick={() =>
                              !user.needsAccount && setNewChannelMembers((prev) =>
                                isSelected ? prev.filter((id) => id !== user.id) : [...prev, user.id]
                              )
                            }
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                              user.needsAccount ? "opacity-50 cursor-not-allowed" : isSelected ? "bg-green-50" : "hover:bg-slate-50"
                            }`}
                            title={user.needsAccount ? "Create a login account for this worker first" : undefined}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isSelected ? "bg-green-500" : "bg-slate-200"
                            }`}>
                              {isSelected ? (
                                <Check size={12} className="text-white" />
                              ) : (
                                <span className="text-[9px] font-semibold text-slate-600">{getInitials(user.name)}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-slate-800 truncate">{user.name}</p>
                                {user.needsAccount && (
                                  <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">Needs Login</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400">{user.role}</p>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 flex-shrink-0">
              <button
                onClick={() => setShowCreateChannel(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || (newChannelRestricted && newChannelMembers.length === 0)}
                className="px-4 py-2 rounded-xl text-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
              >
                Create Channel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── New DM Modal (multi-select) ─────────────────────── */}
      {showNewDm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowNewDm(false); setDmSelectedUsers([]); setDmSearchQuery(""); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">New Message</h3>
              <button onClick={() => { setShowNewDm(false); setDmSelectedUsers([]); setDmSearchQuery(""); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 pt-3">
              <input
                type="text"
                value={dmSearchQuery}
                onChange={(e) => setDmSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                autoFocus
              />
              {dmSelectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dmSelectedUsers.map((uid) => {
                    const u = allUsers.find((x) => x.id === uid);
                    return (
                      <span key={uid} className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        {u?.name || "User"}
                        <button onClick={() => setDmSelectedUsers((prev) => prev.filter((id) => id !== uid))} className="hover:text-green-900">
                          <X size={10} />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-0.5">
              {allUsers
                .filter((u) => u.id !== currentUserId && u.name.toLowerCase().includes(dmSearchQuery.toLowerCase()))
                .map((user) => {
                  const isSelected = dmSelectedUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      disabled={user.needsAccount}
                      onClick={() => !user.needsAccount && setDmSelectedUsers((prev) => isSelected ? prev.filter((id) => id !== user.id) : [...prev, user.id])}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-colors ${
                        user.needsAccount ? "opacity-50 cursor-not-allowed" : isSelected ? "bg-green-50" : "hover:bg-slate-50"
                      }`}
                      title={user.needsAccount ? "Create a login account for this worker first" : undefined}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? "bg-green-500" : "bg-slate-200"}`}>
                        {isSelected ? (
                          <Check size={12} className="text-white" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-600">{getInitials(user.name)}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-slate-800">{user.name}</p>
                          {user.needsAccount && (
                            <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">Needs Login</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{user.role}</p>
                      </div>
                    </button>
                  );
                })}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => handleStartDm()}
                disabled={dmSelectedUsers.length === 0}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 transition"
              >
                {dmSelectedUsers.length <= 1 ? "Start Conversation" : `Message ${dmSelectedUsers.length} People`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Members Management Modal ────────────────────────── */}
      {showMembers && selectedChannel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => { setShowMembers(false); setAddMemberSearch(""); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <h3 className="text-lg font-semibold text-slate-900">Members</h3>
              <button onClick={() => { setShowMembers(false); setAddMemberSearch(""); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Add member section */}
            <div className="px-6 py-3 border-b border-slate-50">
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Add Member</label>
              <input
                type="text"
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
                placeholder="Search people to add..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
              />
              {addMemberSearch.trim() && (
                <div className="mt-2 max-h-32 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50">
                  {allUsers
                    .filter((u) =>
                      u.name.toLowerCase().includes(addMemberSearch.toLowerCase()) &&
                      !channelMembers.some((m) => m.userId === u.id)
                    )
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => !user.needsAccount && handleAddMember(user.id)}
                        disabled={user.needsAccount}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                          user.needsAccount ? "opacity-50 cursor-not-allowed" : "hover:bg-green-50"
                        }`}
                        title={user.needsAccount ? "Create a login account for this worker first" : undefined}
                      >
                        <UserPlus size={14} className={user.needsAccount ? "text-slate-300" : "text-green-500"} />
                        <span className="font-medium text-slate-800">{user.name}</span>
                        <span className="text-[10px] text-slate-400">{user.role}</span>
                        {user.needsAccount && (
                          <span className="ml-auto text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Needs Login</span>
                        )}
                      </button>
                    ))}
                  {allUsers.filter((u) => u.name.toLowerCase().includes(addMemberSearch.toLowerCase()) && !channelMembers.some((m) => m.userId === u.id)).length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">No matching users to add</p>
                  )}
                </div>
              )}
            </div>

            {/* Current members */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {loadingMembers ? (
                <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
              ) : (
                <div className="space-y-0.5">
                  {channelMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-slate-600">{getInitials(member.user.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {member.user.name}
                          {member.userId === currentUserId && <span className="text-[10px] text-slate-400 ml-1">(you)</span>}
                        </p>
                        <p className="text-[10px] text-slate-400">{member.user.role}</p>
                      </div>
                      {member.userId !== currentUserId && (
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition"
                          title="Remove member"
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Channel Modal ──────────────────────────────── */}
      {showEditChannel && selectedChannel && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowEditChannel(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Edit Channel</h3>
              <button onClick={() => setShowEditChannel(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Channel Name</label>
                <input
                  type="text"
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Description (optional)</label>
                <input
                  type="text"
                  value={editChannelDesc}
                  onChange={(e) => setEditChannelDesc(e.target.value)}
                  placeholder="What's this channel about?"
                  className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={handleDeleteChannel}
                disabled={deletingChannel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition"
              >
                {deletingChannel ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete Channel
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowEditChannel(false)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  onClick={handleEditChannel}
                  disabled={!editChannelName.trim() || savingEdit}
                  className="px-4 py-2 rounded-xl text-sm bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
