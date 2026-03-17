import { en } from "./en";
import { es } from "./es";

export type Language = "en" | "es";
export type TranslationKey = string;

const dictionaries: Record<Language, Record<string, string>> = { en, es };

export function getTranslation(
  language: Language,
  key: TranslationKey,
  fallback?: string
): string {
  return dictionaries[language]?.[key] || dictionaries.en[key] || fallback || key;
}
