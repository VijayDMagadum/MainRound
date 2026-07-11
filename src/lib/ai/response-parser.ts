import { z } from "zod";

/**
 * Extracts and parses a JSON object from text, handling potential Markdown fences.
 */
export function extractJSON(text: string): any {
  let cleaned = text.trim();
  
  // Strip Markdown JSON code blocks if present
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = cleaned.match(markdownRegex);
  
  if (match && match[1]) {
    cleaned = match[1].trim();
  }

  // Find the first '{' and last '}' to strip any surrounding conversational texts
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(cleaned);
  } catch (error: any) {
    throw new Error(`Failed to parse text as JSON: ${error.message}. Raw text size: ${text.length}`);
  }
}

/**
 * Parses and validates text using a Zod schema. Throws error on validation failures.
 */
export function parseAndValidate<T>(text: string, schema: z.ZodSchema<T>): T {
  const jsonObject = extractJSON(text);
  return schema.parse(jsonObject);
}
