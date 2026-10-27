import dotenv from "dotenv";

dotenv.config();

export const PORT = process.env.PORT || 3000;
export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
