"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getTranslation, Language, TranslationKey } from "@/lib/translations";
import { logger } from "@/lib/logger";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  const [isLoading, setIsLoading] = useState(true);

  // On mount, read from localStorage first (instant), then sync with API
  useEffect(() => {
    // Read from localStorage for instant load
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "es")) {
      setLanguageState(savedLanguage);
    }
    setIsLoading(false);

    // Sync with API in background
    fetch("/api/settings/language")
      .then((res) => res.json())
      .then((data) => {
        if (data.language && (data.language === "en" || data.language === "es")) {
          setLanguageState(data.language);
        }
      })
      .catch(() => {
        // Silently fail - we already have localStorage value
      });
  }, []);

  const setLanguage = async (lang: Language) => {
    // Update state immediately
    setLanguageState(lang);
    // Update localStorage
    localStorage.setItem("language", lang);
    // Sync with API
    try {
      await fetch("/api/settings/language", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language: lang }),
      });
    } catch (err) {
      logger.error("Failed to save language preference", { error: String(err) });
    }
  };

  const t = (key: TranslationKey, fallback?: string): string => {
    return getTranslation(language, key, fallback);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
