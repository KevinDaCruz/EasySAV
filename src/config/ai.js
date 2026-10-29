export const MAX_PROMPT_LENGTH = 1000;
export const MAX_COMPLETION_TOKENS = 700;
export const MAX_HISTORY_EXCHANGES = 5;
export const MEMORY_FILE = "src/data/memory.json";
export const MEMORY_CATEGORIES = ["identité", "appareil", "problèmes", "préférences"];
export const KNOWLEDGE_FILE = "src/data/knowledge.json";
export const RAG_TOP_K = 2;
export const RAG_MIN_SCORE = 0.35;
export const RAG_MAX_CHARS = 1000;

// Point de départ conseillé.
// Testez ensuite au moins deux autres valeurs : 0.2 et 0.8.
export const TEMPERATURE = 0.4;
