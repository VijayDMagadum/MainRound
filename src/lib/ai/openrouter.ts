export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterConfig {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export async function callOpenRouter(
  messages: ChatMessage[],
  config: OpenRouterConfig = {}
): Promise<string> {
  const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY;
  const model = config.model || OPENROUTER_MODEL;
  const timeoutMs = config.timeoutMs || 12000; // 12-second default timeout

  if (!apiKey) {
    throw new Error("Missing OpenRouter API key. Please check your environment variables.");
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": "Monsoon Saathi",
  };

  const payload = {
    model,
    messages,
    temperature: 0.1, // keep it deterministic
    response_format: { type: "json_object" } // try to force JSON output from model
  };

  const executeRequest = async (attempt: number): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 429) {
        throw new Error("OpenRouter rate limit exceeded.");
      }

      if (response.status >= 500) {
        throw new Error(`OpenRouter provider unavailable (status code ${response.status}).`);
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new Error(`OpenRouter API call failed with status ${response.status}: ${bodyText}`);
      }

      const responseData = await response.json();
      
      if (!responseData.choices || responseData.choices.length === 0) {
        throw new Error("Invalid response format received from OpenRouter API.");
      }

      const textResult = responseData.choices[0].message?.content || "";
      return textResult;
    } catch (error: any) {
      clearTimeout(timer);
      
      if (error.name === "AbortError") {
        throw new Error("OpenRouter API request timed out.");
      }

      // Retry once for network errors, 5xx server issues, or rate limits
      if (attempt === 1) {
        console.warn(`OpenRouter request failed. Retrying... Error: ${error.message}`);
        // Small delay before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return executeRequest(2);
      }

      throw error;
    }
  };

  return executeRequest(1);
}
