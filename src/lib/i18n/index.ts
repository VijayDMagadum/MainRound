import en from "@/messages/en.json";
import hi from "@/messages/hi.json";
import mr from "@/messages/mr.json";

export type Locale = "en" | "hi" | "mr";

export const dictionaries = {
  en,
  hi,
  mr,
};

export function getDictionary(locale: string = "en") {
  const normalized = (locale === "hi" || locale === "mr") ? locale : "en";
  return dictionaries[normalized];
}

/**
 * Basic translation helper resolving path strings like 'nav.dashboard'
 */
export function t(key: string, locale: string = "en"): string {
  const dict = getDictionary(locale);
  const parts = key.split(".");
  let current: any = dict;
  
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return key;
    }
  }
  
  return typeof current === "string" ? current : key;
}
export const locales: Locale[] = ["en", "hi", "mr"];
