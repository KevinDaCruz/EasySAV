import { MAX_HISTORY_EXCHANGES, MAX_PROMPT_LENGTH } from "../config/ai.js";
import { generateAnswer } from "../services/aiService.js";

const HISTORY_ROLES = ["user", "assistant"];

export async function testAi(req, res) {
  const { prompt, history = [] } = req.body;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  }

  const cleanPrompt = prompt.trim();

  if (cleanPrompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      error: `Le prompt ne doit pas dépasser ${MAX_PROMPT_LENGTH} caractères.`,
    });
  }

  if (!Array.isArray(history)) {
    return res
      .status(400)
      .json({ error: "Le champ history doit être un tableau." });
  }

  const cleanHistory = history
    .filter(
      (message) =>
        HISTORY_ROLES.includes(message?.role) &&
        typeof message.content === "string" &&
        message.content.trim() !== "",
    )
    .slice(-MAX_HISTORY_EXCHANGES * 2)
    .map(({ role, content }) => ({ role, content: content.trim() }));

  try {
    const answer = await generateAnswer(cleanPrompt, cleanHistory);

    if (!answer) {
      return res
        .status(502)
        .json({ error: "Le fournisseur d’IA n’a retourné aucune réponse." });
    }

    return res.json({ answer });
  } catch (error) {
    console.error("Erreur Groq :", error);

    const status = error?.status === 401 ? 401 : 500;
    const message =
      status === 401
        ? "Clé API Groq absente ou invalide."
        : "Impossible de générer une réponse pour le moment.";

    return res.status(status).json({ error: message });
  }
}
