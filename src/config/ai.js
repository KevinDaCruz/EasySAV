export const MAX_PROMPT_LENGTH = 1000;
export const MAX_COMPLETION_TOKENS = 700;
export const MAX_HISTORY_EXCHANGES = 5;
export const MEMORY_FILE = "src/data/memory.json";
export const MEMORY_KEYWORDS = [
  "je m'appelle",
  "je préfère",
  "mon appareil",
  "mon téléphone est",
  "mon ordinateur est",
  "ma télé est",
  "souviens-toi de",
  "souviens-toi que",
  "mon problème est",
  "mon souci est",
];
export const FORGET_KEYWORD = "oublie";

// Point de départ conseillé.
// Testez ensuite au moins deux autres valeurs : 0.2 et 0.8.
export const TEMPERATURE = 0.4;
