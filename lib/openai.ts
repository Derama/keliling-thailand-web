import OpenAI from "openai";

let client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client. Throws if OPENAI_API_KEY is unset so the
 * caller can return a graceful "AI unavailable" response. Server-only — never
 * import this from a client component.
 */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}
