import { groq } from "../config/groq.js";
import { MAX_COMPLETION_TOKENS, TEMPERATURE } from "../config/ai.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";

export async function generateAnswer(prompt, history = []) {
  // TODO 3 : appeler groq.chat.completions.create().
  // - messages contient au minimum un message de rôle "user"
  // - utiliser le modèle indiqué dans .env.example
  // - récupérer completion.choices[0].message.content
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: prompt },
    ],
    temperature: TEMPERATURE,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
  });

  return completion.choices[0]?.message?.content?.trim();
}
