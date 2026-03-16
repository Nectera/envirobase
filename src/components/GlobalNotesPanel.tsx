"use client";

import { useState } from "react";
import { StickyNote, X, ChevronRight } from "lucide-react";
import NotesTab from "./NotesTab";

export default function GlobalNotesPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Toggle button — fixed on right edge */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center gap-1 px-2 py-3 rounded-l-lg shadow-lg transition-all ${
          open
            ? "bg-indigo-600 text-white"
            : "bg-white text-slate-600 border border-r-0 border-slate-200 hover:bg-slate-50"
        }`}
        title="Global Notes"
      >
        <StickyNote className="w-4 h-4" />
        {!open && <ChevronRight className="w-3 h-3 rotate-180" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l border-slate-200 z-50 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-indigo-600" />
            Global Notes
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-slate-200 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notes content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-52px)]">
          {open && <NotesTab />}
        </div>
      </div>
    </>
  );
}
