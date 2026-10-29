import { MAX_PROMPT_LENGTH } from "../config/ai.js";
import { applyProposal } from "../services/memoryService.js";
import { generateResponse } from "../services/responseService.js";

export async function testAi(req, res) {
  const { prompt } = req.body;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  }

  const cleanPrompt = prompt.trim();

  if (cleanPrompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({
      error: `Le prompt ne doit pas dépasser ${MAX_PROMPT_LENGTH} caractères.`,
    });
  }

  try {
    const { answer, proposal, sources, tokens } =
      await generateResponse(cleanPrompt);

    if (!answer) {
      return res
        .status(502)
        .json({ error: "Le fournisseur d’IA n’a retourné aucune réponse." });
    }

    return res.json({ answer, proposal, sources, tokens });
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

export async function saveMemory(req, res) {
  const { proposal } = req.body;

  if (!Array.isArray(proposal)) {
    return res.status(400).json({ error: "Le champ proposal est obligatoire." });
  }

  try {
    const message = await applyProposal(proposal);
    return res.json({ message });
  } catch (error) {
    console.error("Erreur mémoire :", error);
    return res
      .status(500)
      .json({ error: "Impossible d'enregistrer ces informations pour le moment." });
  }
}
