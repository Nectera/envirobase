"use client";

import { useState } from "react";
import { BookOpen, FileText } from "lucide-react";
import XactimateLibraryPage from "../xactimate-library/page";

export default function EstimatingTabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<"estimates" | "library">("estimates");

  const tabs = [
    { key: "estimates" as const, label: "Estimates", icon: FileText },
    { key: "library" as const, label: "Xact Library", icon: BookOpen },
  ];

  return (
    <div>
      {/* Tab toggle */}
      <div className="flex items-center gap-1 mb-5 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md transition ${
                isActive
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "estimates" ? children : <XactimateLibraryPage />}
    </div>
  );
}
