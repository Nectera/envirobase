"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Reply, Forward, Copy, Star, Trash2, X, Pencil, Pin, Download, Plus, Languages } from "lucide-react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥"];

const FULL_EMOJI_SET = [
  "👍","👎","❤️","🔥","😂","😮","😢","🙏",
  "🎉","✅","👀","💯","😎","🤔","💪","😤",
  "🤣","👏","🙌","😊","🥳","🤝","😍","🥺",
  "😱","🫡","🫶","💀","🤡","🫠","🤯","😈",
  "👻","💩","🦄","🍕","☕","🏆","⭐","🚀",
];

interface ChatMessageContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
  isOwn: boolean;
  isStarred: boolean;
  isPinned: boolean;
  hasAttachment: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  onReply: () => void;
  onForward: () => void;
  onCopy: () => void;
  onStar: () => void;
  onPin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReaction: (emoji: string) => void;
  onSaveAttachment: () => void;
  onTranslate: () => void;
}

export default function ChatMessageContextMenu({
  isOpen,
  onClose,
  messageContent,
  isOwn,
  isStarred,
  isPinned,
  hasAttachment,
  onReply,
  onForward,
  onCopy,
  onStar,
  onPin,
  onEdit,
  onDelete,
  onReaction,
  onSaveAttachment,
  onTranslate,
}: ChatMessageContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showAllEmojis, setShowAllEmojis] = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showAllEmojis) setShowAllEmojis(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose, showAllEmojis]);

  // Prevent body scroll while menu is open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Reset expanded emoji when menu closes
  useEffect(() => {
    if (!isOpen) setShowAllEmojis(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div
        ref={menuRef}
        className="w-[280px] bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Emoji reaction bar */}
        {!showAllEmojis ? (
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAction(() => onReaction(emoji))}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-110 transition-all text-lg"
              >
                {emoji}
              </button>
            ))}
            <button
              onClick={() => setShowAllEmojis(true)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-110 transition-all text-slate-400"
            >
              <Plus size={16} />
            </button>
          </div>
        ) : (
          <div className="border-b border-slate-100">
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Emoji</span>
              <button
                onClick={() => setShowAllEmojis(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-0.5 px-2 pb-2 max-h-[160px] overflow-y-auto">
              {FULL_EMOJI_SET.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleAction(() => onReaction(emoji))}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 active:scale-110 transition-all text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="py-1">
          <button
            onClick={() => handleAction(onReply)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Reply size={18} className="text-slate-400" />
            Reply
          </button>

          {/* Edit — only for own messages */}
          {isOwn && (
            <button
              onClick={() => handleAction(onEdit)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Pencil size={18} className="text-slate-400" />
              Edit
            </button>
          )}

          <button
            onClick={() => handleAction(onForward)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Forward size={18} className="text-slate-400" />
            Forward
          </button>
          <button
            onClick={() => handleAction(onCopy)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
          >
            <Copy size={18} className="text-slate-400" />
            Copy
          </button>

          {/* Translate — EN↔ES */}
          {messageContent && (
            <button
              onClick={() => handleAction(onTranslate)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Languages size={18} className="text-slate-400" />
              Translate / Traducir
            </button>
          )}

          {/* Pin / Unpin */}
          <button
            onClick={() => handleAction(onPin)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors ${
              isPinned ? "text-blue-600" : "text-slate-700"
            }`}
          >
            <Pin
              size={18}
              className={isPinned ? "text-blue-500 fill-blue-500" : "text-slate-400"}
            />
            {isPinned ? "Unpin" : "Pin"}
          </button>

          <button
            onClick={() => handleAction(onStar)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors ${
              isStarred ? "text-yellow-600" : "text-slate-700"
            }`}
          >
            <Star
              size={18}
              className={isStarred ? "text-yellow-500 fill-yellow-500" : "text-slate-400"}
            />
            {isStarred ? "Unstar" : "Star"}
          </button>

          {/* Save Attachment — only if message has a file */}
          {hasAttachment && (
            <button
              onClick={() => handleAction(onSaveAttachment)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              <Download size={18} className="text-slate-400" />
              Save Attachment
            </button>
          )}

          {/* Delete — only for own messages */}
          {isOwn && (
            <>
              <div className="mx-3 my-1 border-t border-slate-100" />
              <button
                onClick={() => handleAction(onDelete)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <Trash2 size={18} className="text-red-400" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to detect long-press (touch hold) on an element.
 * Returns a ref to attach to the element + handlers.
 */
export function useLongPress(callback: () => void, delay = 500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const touchMoved = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      touchMoved.current = false;
      isLongPress.current = false;
      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        // Vibrate on supported devices
        if (navigator.vibrate) navigator.vibrate(30);
        callback();
      }, delay);
    },
    [callback, delay]
  );

  const move = useCallback(() => {
    if (timerRef.current) {
      touchMoved.current = true;
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Prevent click if it was a long press
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    onTouchStart: start,
    onTouchMove: move,
    onTouchEnd: end,
    onMouseDown: start,
    onMouseMove: move,
    onMouseUp: end,
  };
}
