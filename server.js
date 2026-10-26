import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// TODO 1 : importer le SDK Groq.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// TODO 2 : créer le client Groq avec process.env.GROQ_API_KEY.

app.post("/api/ai/test", async (req, res) => {
  const { prompt } = req.body;

  if (typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({ error: "Le champ prompt est obligatoire." });
  }

  try {
    // TODO 3 : appeler groq.chat.completions.create().
    // - messages contient au minimum un message de rôle "user"
    // - utiliser le modèle indiqué dans .env.example
    // - récupérer completion.choices[0].message.content

    const answer = `Réponse simulée : ${prompt.trim()}`;
    return res.json({ answer });
  } catch (error) {
    console.error("Erreur Groq :", error);
    return res.status(500).json({ error: "Impossible de générer une réponse pour le moment." });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
