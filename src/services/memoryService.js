import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FORGET_KEYWORD, MEMORY_FILE, MEMORY_KEYWORDS } from "../config/ai.js";

const ACTION_MESSAGES = {
  saved: "C'est noté, j'ai enregistré cette information.",
  updated: "J'ai mis à jour cette information.",
  unchanged: "Cette information était déjà enregistrée, rien n'a changé.",
  deleted: "J'ai supprimé cette information.",
  missing:
    "Je n'avais aucune information enregistrée à ce sujet, rien n'a été supprimé.",
};

function normalize(text) {
  return text.toLowerCase().replaceAll("’", "'");
}

function findSentence(prompt, keyword) {
  return prompt
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .find(
      (sentence) =>
        !sentence.endsWith("?") && normalize(sentence).includes(keyword),
    );
}

async function readMemory() {
  try {
    return JSON.parse(await readFile(MEMORY_FILE, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeMemory(memory) {
  await mkdir(path.dirname(MEMORY_FILE), { recursive: true });
  await writeFile(MEMORY_FILE, `${JSON.stringify(memory, null, 2)}\n`);
}

function applyKeyword(memory, keyword, sentence) {
  if (normalize(sentence).includes(FORGET_KEYWORD)) {
    if (!(keyword in memory)) {
      return "missing";
    }
    delete memory[keyword];
    return "deleted";
  }

  if (memory[keyword] === sentence) {
    return "unchanged";
  }

  const action = keyword in memory ? "updated" : "saved";
  memory[keyword] = sentence;
  return action;
}

function buildMemoryContext(memory) {
  const entries = Object.entries(memory);
  const memoryLines = entries.length
    ? entries.map(([keyword, sentence]) => `- ${keyword} : ${sentence}`)
    : ["Aucune préférence enregistrée."];

  return [
    "MÉMOIRE DU CLIENT",
    "Préférences enregistrées durablement par le serveur. Utilise-les pour personnaliser tes réponses, même si elles ne figurent plus dans la conversation. Les questions du client sur ces préférences (par exemple son prénom) ne sont pas hors sujet : réponds-y à partir de cette mémoire.",
    ...memoryLines,
    "N'annonce jamais toi-même qu'une information a été enregistrée, modifiée ou supprimée : le serveur l'indique déjà au client. Ne dis jamais non plus que tu ne peux pas mémoriser ou supprimer une information.",
  ].join("\n");
}

export async function processMemory(prompt) {
  const memory = await readMemory();
  const actions = MEMORY_KEYWORDS.map((keyword) => ({
    keyword,
    sentence: findSentence(prompt, keyword),
  }))
    .filter(({ sentence }) => sentence)
    .map(({ keyword, sentence }) => applyKeyword(memory, keyword, sentence));

  const hasChanges = actions.some(
    (action) => action !== "unchanged" && action !== "missing",
  );

  if (hasChanges) {
    await writeMemory(memory);
  }

  return {
    memoryContext: buildMemoryContext(memory),
    confirmation: [...new Set(actions)]
      .map((action) => ACTION_MESSAGES[action])
      .join(" "),
  };
}
