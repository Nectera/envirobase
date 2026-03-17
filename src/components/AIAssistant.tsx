"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import type DOMPurifyType from "dompurify";

// Lazy-load DOMPurify to avoid SSR issues (browser-only library)
let DOMPurify: typeof DOMPurifyType;
if (typeof window !== "undefined") {
  DOMPurify = require("dompurify") as typeof DOMPurifyType;
}
import { useTranslation } from "./LanguageProvider";
import { logger } from "@/lib/logger";
import { MessageSquare, X, Send, Loader2, Sparkles, RotateCcw, Mic, MicOff, Settings2, History, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Extend Window for SpeechRecognition types
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export default function AIAssistant() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const userRole = (session?.user as any)?.role || "TECHNICIAN";
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Conversation history state
  const [showHistory, setShowHistory] = useState(false);
  const [conversationList, setConversationList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceAutoSend, setVoiceAutoSend] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const autoSendPendingRef = useRef(false);

  // Check browser support for speech recognition
  const speechSupported = typeof window !== "undefined" && (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );

  // Load auto-send preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("voice-autosend");
      if (saved === "true") setVoiceAutoSend(true);
    }
  }, []);

  // Save auto-send preference
  const toggleAutoSend = () => {
    const newVal = !voiceAutoSend;
    setVoiceAutoSend(newVal);
    localStorage.setItem("voice-autosend", String(newVal));
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Load conversation history
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/assistant/conversations");
      const data = await res.json();
      if (data.conversations) setConversationList(data.conversations);
    } catch (err) {
      logger.error("Failed to load history", { error: String(err) });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load a specific conversation
  const loadConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/assistant/conversations/${id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setConversationId(id);
        setShowHistory(false);
      }
    } catch (err) {
      logger.error("Failed to load conversation", { error: String(err) });
    }
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/assistant/conversations?id=${id}`, { method: "DELETE" });
      setConversationList((prev) => prev.filter((c) => c.id !== id));
      if (conversationId === id) {
        setMessages([]);
        setConversationId(null);
      }
    } catch (err) {
      logger.error("Failed to delete conversation", { error: String(err) });
    }
  }, [conversationId]);

  // Toggle history panel
  const toggleHistory = useCallback(() => {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadHistory();
  }, [showHistory, loadHistory]);

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setInterimTranscript("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [userMsg],
          conversationId,
          role: userRole,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.response },
        ]);
        if (data.conversationId) setConversationId(data.conversationId);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, conversationId, userRole]);

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Voice recognition
  const startListening = useCallback(() => {
    if (!speechSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;

    // Set language based on current app language
    const lang = localStorage.getItem("language") || "en";
    recognition.lang = lang === "es" ? "es-US" : "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setInput((prev) => {
          const newText = prev ? prev + " " + final : final;
          // If auto-send is on, mark that we should send after recognition ends
          if (voiceAutoSend) {
            autoSendPendingRef.current = true;
            // Stop recognition to trigger onend which will fire auto-send
            recognition.stop();
          }
          return newText;
        });
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      logger.error("Speech recognition error", { error: event.error });
      setIsListening(false);
      setInterimTranscript("");

      if (event.error === "not-allowed") {
        alert(t("ai.voicePermissionDenied"));
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");

      // Auto-send if toggle is on and we have final text
      if (autoSendPendingRef.current) {
        autoSendPendingRef.current = false;
        // Small delay to ensure state is updated
        setTimeout(() => {
          const textarea = document.querySelector<HTMLTextAreaElement>("[data-voice-input]");
          if (textarea && textarea.value.trim()) {
            sendMessage(textarea.value.trim());
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [speechSupported, voiceAutoSend, t, sendMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      autoSendPendingRef.current = false;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Simple markdown-like formatting with HTML sanitization
  const formatMessage = (text: string) => {
    // Escape HTML entities first to prevent XSS
    const escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    // Then apply markdown formatting on the safe string
    return escaped
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, "<br/>");
  };

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div className="fixed inset-3 md:inset-auto md:bottom-20 md:right-6 md:w-[420px] md:h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <span className="font-semibold text-sm">{t("ai.title")}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleHistory}
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? "bg-white/25" : "hover:bg-white/20"}`}
                title={t("ai.history")}
              >
                <History size={14} />
              </button>
              <button
                onClick={handleNewConversation}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title={t("ai.newConversation")}
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Conversation History Panel */}
          {showHistory && (
            <div className="border-b border-slate-200 bg-slate-50 max-h-[280px] overflow-y-auto">
              <div className="p-3">
                <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-2">{t("ai.recentConversations")}</p>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={16} className="animate-spin text-slate-400" />
                  </div>
                ) : conversationList.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">{t("ai.noHistory")}</p>
                ) : (
                  <div className="space-y-1">
                    {conversationList.map((conv) => (
                      <div
                        key={conv.id}
                        className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          conv.id === conversationId
                            ? "bg-indigo-100 border border-indigo-200"
                            : "hover:bg-white border border-transparent"
                        }`}
                      >
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => loadConversation(conv.id)}
                        >
                          <p className="text-xs font-medium text-slate-700 truncate">{conv.preview}</p>
                          <p className="text-[10px] text-slate-400">
                            {conv.messageCount} messages
                            {conv.updatedAt && ` · ${new Date(conv.updatedAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-slate-400 hover:text-red-500 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles size={32} className="mx-auto text-indigo-300 mb-3" />
                <p className="text-sm font-medium text-slate-700 mb-1">
                  {t("ai.greeting")}
                </p>
                <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
                  {t("ai.greetingDescription")}
                </p>
                <div className="mt-4 space-y-2">
                  {[
                    t("ai.suggestion1"),
                    t("ai.suggestion2"),
                    t("ai.suggestion3"),
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="block w-full text-left px-3 py-2 text-xs text-slate-600 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-800 rounded-bl-md"
                  }`}
                  dangerouslySetInnerHTML={{ __html: DOMPurify ? DOMPurify.sanitize(formatMessage(msg.content)) : formatMessage(msg.content) }}
                />
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                    <span className="text-xs text-slate-500">{t("ai.thinking")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="px-3 py-1.5 bg-red-50 border-t border-red-100 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-xs text-red-600 font-medium">{t("ai.voiceListening")}</span>
              {interimTranscript && (
                <span className="text-xs text-red-400 italic truncate flex-1">{interimTranscript}</span>
              )}
            </div>
          )}

          {/* Voice settings popover */}
          {showVoiceSettings && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={toggleAutoSend}
                  className={`relative w-8 h-4.5 rounded-full transition-colors ${
                    voiceAutoSend ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                  style={{ width: "32px", height: "18px" }}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-transform ${
                      voiceAutoSend ? "translate-x-3.5" : ""
                    }`}
                    style={{ width: "14px", height: "14px" }}
                  />
                </div>
                <span className="text-xs text-slate-600">{t("ai.voiceAutoSend")}</span>
              </label>
              <button
                onClick={() => setShowVoiceSettings(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-200 p-3 flex-shrink-0">
            <div className="flex items-end gap-2">
              {/* Voice settings button */}
              {speechSupported && (
                <button
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-2 rounded-xl transition-colors flex-shrink-0 ${
                    showVoiceSettings
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  }`}
                  title={t("ai.voiceAutoSend")}
                >
                  <Settings2 size={14} />
                </button>
              )}

              <textarea
                ref={inputRef}
                data-voice-input="true"
                value={input + (interimTranscript ? (input ? " " : "") + interimTranscript : "")}
                onChange={(e) => {
                  if (!isListening) {
                    setInput(e.target.value);
                  }
                }}
                onKeyDown={handleKeyDown}
                placeholder={t("ai.placeholder")}
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-24"
                style={{ minHeight: "38px" }}
              />

              {/* Voice button */}
              {speechSupported && (
                <button
                  onClick={toggleListening}
                  disabled={loading}
                  className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                    isListening
                      ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed"
                  }`}
                  title={isListening ? "Stop" : "Voice input"}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bubble Button — hidden on chat page to avoid overlap */}
      {pathname !== "/chat" && (
        <button
          onClick={() => setOpen(!open)}
          className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 w-12 h-12 md:w-14 md:h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-50 ${
            open
              ? "bg-slate-700 hover:bg-slate-800"
              : "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
          }`}
        >
          {open ? (
            <X size={22} className="text-white" />
          ) : (
            <MessageSquare size={22} className="text-white" />
          )}
        </button>
      )}
    </>
  );
}
