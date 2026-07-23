// src/lib/gemini.ts
// Server‑only Gemini helper – never exposed to the client bundle.
// Reads GEMINI_API_KEY from server‑side environment (no NEXT_PUBLIC_ prefix).

/**
 * Calls the Google Gemini API with a prompt.
 * This function runs only on the server (Node.js runtime) and therefore the
 * secret never becomes part of the client bundle.
 */
export async function callGemini(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }
  return await response.json();
}
