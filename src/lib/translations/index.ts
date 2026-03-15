import { en } from "./en";
import { es } from "./es";
import { pt } from "./pt";

export type Language = "en" | "es" | "pt";
export type TranslationKey = string;

const dictionaries: Record<Language, Record<string, string>> = { en, es, pt };

export function getTranslation(
  language: Language,
  key: TranslationKey,
  fallback?: string
): string {
  return dictionaries[language]?.[key] || dictionaries.en[key] || fallback || key;
}
