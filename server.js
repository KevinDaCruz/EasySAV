import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// TODO 1 : importer le SDK Groq.
import Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "./systemPrompt.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_PROMPT_LENGTH = 1000;

app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.static("public"));

if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️ La variable GROQ_API_KEY est absente.");
}

// TODO 2 : créer le client Groq avec process.env.GROQ_API_KEY.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, fetch });

// Point de départ conseillé.
// Testez ensuite au moins deux autres valeurs : 0.2 et 0.8.
const TEMPERATURE = 0.4;

app.post("/api/ai/test", async (req, res) => {
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
    // TODO 3 : appeler groq.chat.completions.create().
    // - messages contient au minimum un message de rôle "user"
    // - utiliser le modèle indiqué dans .env.example
    // - récupérer completion.choices[0].message.content
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: cleanPrompt },
      ],
      temperature: TEMPERATURE,
      max_completion_tokens: 700,
    });

    const answer = completion.choices[0]?.message?.content?.trim();

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
});

app.use((req, res) => {
  res.status(404).json({ error: "Ressource introuvable." });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
