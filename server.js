import express from "express";
import cors from "cors";
import { PORT } from "./src/config/env.js";
import aiRoutes from "./src/routes/aiRoutes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.static("src/public"));

app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Ressource introuvable." });
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
