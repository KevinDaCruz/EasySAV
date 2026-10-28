import { groq } from "../config/groq.js";
import {
  MAX_COMPLETION_TOKENS,
  MAX_HISTORY_EXCHANGES,
  TEMPERATURE,
} from "../config/ai.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";

const history = [];

function addExchange(prompt, answer) {
  history.push(
    { role: "user", content: prompt },
    { role: "assistant", content: answer },
  );
  history.splice(0, history.length - MAX_HISTORY_EXCHANGES * 2);
}

export async function generateAnswer(prompt) {
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

  const answer = completion.choices[0]?.message?.content?.trim();

  if (answer) {
    addExchange(prompt, answer);
  }

  return answer;
}
