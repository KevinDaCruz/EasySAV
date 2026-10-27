// TODO 1 : importer le SDK Groq.
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️ La variable GROQ_API_KEY est absente.");
}

// TODO 2 : créer le client Groq avec process.env.GROQ_API_KEY.
export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, fetch });
