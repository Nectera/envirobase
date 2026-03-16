"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  StickyNote, Pin, PinOff, Plus, Trash2, Pencil, MessageSquare, Send,
  Lock, Users, ChevronDown, ChevronUp, X, Loader2, MoreHorizontal,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

type NoteComment = {
  id: string;
  noteId: string;
  content: string;
  mentions: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

type Note = {
  id: string;
  title: string | null;
  content: string;
  color: string;
  isPinned: boolean;
  visibility: string;
  entityType: string | null;
  entityId: string | null;
  mentions: string | null;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  comments: NoteComment[];
};

type TeamUser = {
  id: string;
  name: string;
  email: string;
};

// ── Color Map ──────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { key: "default", label: "Default", bg: "bg-white", border: "border-slate-200", dot: "bg-slate-400" },
  { key: "red", label: "Red", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500" },
  { key: "orange", label: "Orange", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
  { key: "yellow", label: "Yellow", bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-500" },
  { key: "green", label: "Green", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500" },
  { key: "blue", label: "Blue", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  { key: "purple", label: "Purple", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
];

function getColor(key: string) {
  return COLOR_OPTIONS.find((c) => c.key === key) || COLOR_OPTIONS[0];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Mention Input Helper ──────────────────────────────────────────

function MentionInput({
  value,
  onChange,
  placeholder,
  users,
  className = "",
  multiline = false,
}: {
  value: string;
  onChange: (text: string, mentionedIds: string[]) => void;
  placeholder?: string;
  users: TeamUser[];
  className?: string;
  multiline?: boolean;
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleInput = (text: string) => {
    const cursorPos = inputRef.current?.selectionStart || text.length;
    const textBeforeCursor = text.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");

    if (atIndex !== -1 && (atIndex === 0 || textBeforeCursor[atIndex - 1] === " ")) {
      const query = textBeforeCursor.slice(atIndex + 1);
      if (!query.includes(" ")) {
        setMentionQuery(query);
        setMentionStart(atIndex);
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    } else {
      setShowDropdown(false);
    }

    // Extract all @mentions from text
    const mentionPattern = /@(\w+(?:\s\w+)?)/g;
    const mentioned: string[] = [];
    let match;
    while ((match = mentionPattern.exec(text)) !== null) {
      const name = match[1].toLowerCase();
      const user = users.find(
        (u) => u.name.toLowerCase() === name || u.name.toLowerCase().startsWith(name)
      );
      if (user && !mentioned.includes(user.id)) mentioned.push(user.id);
    }

    onChange(text, mentioned);
  };

  const selectMention = (user: TeamUser) => {
    const before = value.slice(0, mentionStart);
    const after = value.slice((inputRef.current?.selectionStart || value.length));
    const newText = `${before}@${user.name} ${after}`;
    setShowDropdown(false);
    onChange(newText, []);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const Tag = multiline ? "textarea" : "input";

  return (
    <div className="relative">
      <Tag
        ref={inputRef as any}
        value={value}
        onChange={(e: any) => handleInput(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${className}`}
        rows={multiline ? 3 : undefined}
      />
      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute z-50 mt-1 w-64 bg-white rounded-lg shadow-lg border border-slate-200 max-h-40 overflow-y-auto">
          {filteredUsers.slice(0, 6).map((u) => (
            <button
              key={u.id}
              onClick={() => selectMention(u)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-slate-700">{u.name}</div>
                <div className="text-xs text-slate-400">{u.email}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Note Card ──────────────────────────────────────────────────────

function NoteCard({
  note,
  currentUserId,
  currentUserRole,
  users,
  onUpdate,
  onDelete,
  onAddComment,
}: {
  note: Note;
  currentUserId: string;
  currentUserRole: string;
  users: TeamUser[];
  onUpdate: (id: string, data: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddComment: (noteId: string, content: string, mentions: string[]) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title || "");
  const [editContent, setEditContent] = useState(note.content);
  const [editColor, setEditColor] = useState(note.color);
  const [editVisibility, setEditVisibility] = useState(note.visibility);
  const [editMentions, setEditMentions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentMentions, setCommentMentions] = useState<string[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEdit = note.createdById === currentUserId || currentUserRole === "ADMIN";
  const color = getColor(note.color);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(note.id, {
      title: editTitle || null,
      content: editContent,
      color: editColor,
      visibility: editVisibility,
      mentions: editMentions as any,
    });
    setSaving(false);
    setEditing(false);
  };

  const handleTogglePin = async () => {
    await onUpdate(note.id, { isPinned: !note.isPinned });
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    await onAddComment(note.id, commentText, commentMentions);
    setCommentText("");
    setCommentMentions([]);
    setSubmittingComment(false);
  };

  if (editing) {
    return (
      <div className={`rounded-lg border-2 p-4 ${getColor(editColor).bg} ${getColor(editColor).border}`}>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Note title (optional)"
          className="w-full font-semibold text-sm bg-transparent border-b border-slate-300 pb-1 mb-2 focus:outline-none focus:border-indigo-400 placeholder:text-slate-400"
        />
        <MentionInput
          value={editContent}
          onChange={(text, ids) => { setEditContent(text); setEditMentions(ids); }}
          placeholder="Write your note... Use @ to mention team members"
          users={users}
          multiline
          className="bg-transparent border-0 px-0 focus:ring-0"
        />

        {/* Color picker */}
        <div className="flex items-center gap-1.5 mt-3">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c.key}
              onClick={() => setEditColor(c.key)}
              className={`w-5 h-5 rounded-full ${c.dot} ${editColor === c.key ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
              title={c.label}
            />
          ))}
          <div className="ml-3 border-l pl-3 flex items-center gap-2">
            <button
              onClick={() => setEditVisibility(editVisibility === "team" ? "private" : "team")}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
            >
              {editVisibility === "private" ? <Lock className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
              {editVisibility === "private" ? "Private" : "Team"}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editContent.trim()}
            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${color.bg} ${color.border} p-3 group transition-all`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h4 className="font-semibold text-sm text-slate-800 truncate">{note.title}</h4>
          )}
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span>{note.createdByName}</span>
            <span>{timeAgo(note.createdAt)}</span>
            {note.visibility === "private" && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Lock className="w-3 h-3" /> Private
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Pin toggle */}
          <button
            onClick={handleTogglePin}
            className={`p-1 rounded hover:bg-black/5 ${note.isPinned ? "text-indigo-600" : "text-slate-400"}`}
            title={note.isPinned ? "Unpin" : "Pin to top"}
          >
            {note.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
          </button>

          {/* More menu */}
          {canEdit && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-black/5 text-slate-400">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-200 z-50 py-1">
                  <button
                    onClick={() => { setEditing(true); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => { onDelete(note.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
        {note.content.length > 200 && !expanded
          ? <>
              {note.content.slice(0, 200)}...
              <button onClick={() => setExpanded(true)} className="text-indigo-500 text-xs ml-1">Show more</button>
            </>
          : note.content}
        {expanded && note.content.length > 200 && (
          <button onClick={() => setExpanded(false)} className="text-indigo-500 text-xs ml-1">Show less</button>
        )}
      </div>

      {/* Pinned indicator */}
      {note.isPinned && (
        <div className="mt-2 flex items-center gap-1 text-xs text-indigo-500">
          <Pin className="w-3 h-3" /> Pinned
        </div>
      )}

      {/* Comments section */}
      <div className="mt-3 border-t border-black/5 pt-2">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600"
        >
          <MessageSquare className="w-3 h-3" />
          {note.comments.length} comment{note.comments.length !== 1 ? "s" : ""}
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showComments && (
          <div className="mt-2 space-y-2">
            {note.comments.map((c) => (
              <div key={c.id} className="flex gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-medium text-slate-600 shrink-0 mt-0.5">
                  {c.createdByName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-slate-700">{c.createdByName}</span>
                    <span className="text-slate-400">{timeAgo(c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                </div>
              </div>
            ))}

            {/* Add comment */}
            <div className="flex gap-2 mt-2">
              <MentionInput
                value={commentText}
                onChange={(text, ids) => { setCommentText(text); setCommentMentions(ids); }}
                placeholder="Add a comment... @ to mention"
                users={users}
                className="text-xs py-1.5"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submittingComment}
                className="px-2 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 shrink-0"
              >
                {submittingComment ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main NotesTab Component ────────────────────────────────────────

export default function NotesTab({
  entityType,
  entityId,
}: {
  entityType?: string;
  entityId?: string;
}) {
  const { data: session } = useSession();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [users, setUsers] = useState<TeamUser[]>([]);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("default");
  const [newVisibility, setNewVisibility] = useState("team");
  const [newMentions, setNewMentions] = useState<string[]>([]);
  const [newPinned, setNewPinned] = useState(false);
  const [creating, setCreating] = useState(false);

  const userId = (session?.user as any)?.id || "";
  const userRole = (session?.user as any)?.role || "";

  const isGlobal = !entityType || !entityId;

  // Fetch notes
  const fetchNotes = async () => {
    try {
      const params = isGlobal
        ? "global=true"
        : `entityType=${entityType}&entityId=${entityId}`;
      const res = await fetch(`/api/notes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
      }
    } catch (e) {
      console.error("Failed to fetch notes:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch team users for @mentions
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.map((u: any) => ({ id: u.id, name: u.name, email: u.email })));
      }
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchUsers();
  }, [entityType, entityId]);

  // Create
  const handleCreate = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle || null,
          content: newContent,
          color: newColor,
          isPinned: newPinned,
          visibility: newVisibility,
          entityType: isGlobal ? null : entityType,
          entityId: isGlobal ? null : entityId,
          mentions: newMentions,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setNewColor("default");
        setNewVisibility("team");
        setNewMentions([]);
        setNewPinned(false);
        setShowCreate(false);
        fetchNotes();
      }
    } catch (e) {
      console.error("Failed to create note:", e);
    } finally {
      setCreating(false);
    }
  };

  // Update
  const handleUpdate = async (id: string, data: Partial<Note>) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) fetchNotes();
    } catch (e) {
      console.error("Failed to update note:", e);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (res.ok) fetchNotes();
    } catch (e) {
      console.error("Failed to delete note:", e);
    }
  };

  // Add comment
  const handleAddComment = async (noteId: string, content: string, mentions: string[]) => {
    try {
      const res = await fetch(`/api/notes/${noteId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mentions }),
      });
      if (res.ok) fetchNotes();
    } catch (e) {
      console.error("Failed to add comment:", e);
    }
  };

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const unpinnedNotes = notes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <StickyNote className="w-4 h-4" />
          Notes ({notes.length})
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showCreate ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showCreate ? "Cancel" : "New Note"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-4">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Note title (optional)"
            className="w-full font-semibold text-sm bg-transparent border-b border-indigo-200 pb-1 mb-2 focus:outline-none focus:border-indigo-400 placeholder:text-slate-400"
          />
          <MentionInput
            value={newContent}
            onChange={(text, ids) => { setNewContent(text); setNewMentions(ids); }}
            placeholder="Write your note... Use @ to mention team members"
            users={users}
            multiline
            className="bg-white/80"
          />

          {/* Options row */}
          <div className="flex items-center gap-1.5 mt-3">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.key}
                onClick={() => setNewColor(c.key)}
                className={`w-5 h-5 rounded-full ${c.dot} ${newColor === c.key ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                title={c.label}
              />
            ))}
            <div className="ml-3 border-l pl-3 flex items-center gap-3">
              <button
                onClick={() => setNewVisibility(newVisibility === "team" ? "private" : "team")}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                {newVisibility === "private" ? <Lock className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                {newVisibility === "private" ? "Private" : "Team"}
              </button>
              <button
                onClick={() => setNewPinned(!newPinned)}
                className={`flex items-center gap-1 text-xs ${newPinned ? "text-indigo-600" : "text-slate-500"} hover:text-slate-700`}
              >
                <Pin className="w-3.5 h-3.5" />
                {newPinned ? "Pinned" : "Pin"}
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <button
              onClick={handleCreate}
              disabled={creating || !newContent.trim()}
              className="px-4 py-2 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
            >
              {creating && <Loader2 className="w-3 h-3 animate-spin" />}
              Create Note
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading notes...
        </div>
      )}

      {/* Empty state */}
      {!loading && notes.length === 0 && !showCreate && (
        <div className="text-center py-8 text-slate-400">
          <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No notes yet</p>
          <p className="text-xs mt-1">Click &ldquo;New Note&rdquo; to add one</p>
        </div>
      )}

      {/* Pinned notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-1 text-xs text-indigo-500 font-medium mb-2">
            <Pin className="w-3 h-3" /> Pinned
          </div>
          <div className="space-y-2">
            {pinnedNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                currentUserId={userId}
                currentUserRole={userRole}
                users={users}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                onAddComment={handleAddComment}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unpinned notes */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <div className="text-xs text-slate-400 font-medium mt-3">Other Notes</div>
          )}
          {unpinnedNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              currentUserId={userId}
              currentUserRole={userRole}
              users={users}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onAddComment={handleAddComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
