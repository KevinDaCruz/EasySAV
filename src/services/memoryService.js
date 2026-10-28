import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { groq } from "../config/groq.js";
import {
  MAX_COMPLETION_TOKENS,
  MEMORY_CATEGORIES,
  MEMORY_FILE,
} from "../config/ai.js";
import { MEMORY_PROMPT } from "../config/memoryPrompt.js";

const ACTION_MESSAGES = {
  saved: "C'est noté, j'ai enregistré cette information.",
  updated: "J'ai mis à jour cette information.",
  unchanged: "Cette information était déjà enregistrée, rien n'a changé.",
  deleted: "J'ai supprimé cette information.",
  missing:
    "Je n'avais aucune information enregistrée à ce sujet, rien n'a été supprimé.",
};

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

async function extractOperations(prompt, memory) {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const completion = await groq.chat.completions.create({
    model,
    ...(model.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
    messages: [
      { role: "system", content: MEMORY_PROMPT },
      {
        role: "user",
        content: JSON.stringify({ mémoire: memory, message: prompt }),
      },
    ],
    temperature: 0,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    response_format: { type: "json_object" },
  });

  try {
    const { operations } = JSON.parse(completion.choices[0]?.message?.content);
    return Array.isArray(operations) ? operations : [];
  } catch {
    return [];
  }
}

function applyOperation(memory, operation) {
  const { action, category, field, value } = operation ?? {};

  if (!MEMORY_CATEGORIES.includes(category) || typeof field !== "string") {
    return null;
  }

  const section = memory[category] ?? {};

  if (action === "delete") {
    if (!Object.hasOwn(section, field)) {
      return "missing";
    }
    delete section[field];
    return "deleted";
  }

  if (action !== "set" || typeof value !== "string" || !value.trim()) {
    return null;
  }

  const cleanValue = value.trim();

  if (section[field] === cleanValue) {
    return "unchanged";
  }

  const result = Object.hasOwn(section, field) ? "updated" : "saved";
  memory[category] = { ...section, [field]: cleanValue };
  return result;
}

function buildMemoryContext(memory, confirmation) {
  const memoryLines = Object.entries(memory).flatMap(([category, fields]) =>
    Object.entries(fields).map(
      ([field, value]) => `- ${category} > ${field} : ${value}`,
    ),
  );

  return [
    "MÉMOIRE DU CLIENT",
    "Informations enregistrées durablement par le serveur. Utilise-les pour personnaliser tes réponses, même si elles ne figurent plus dans la conversation. Les questions du client sur ces informations (par exemple son prénom ou son appareil) ne sont pas hors sujet : réponds-y à partir de cette mémoire.",
    ...(memoryLines.length ? memoryLines : ["Aucune information enregistrée."]),
    "N'annonce jamais toi-même qu'une information a été enregistrée, modifiée ou supprimée : le serveur l'indique déjà au client. Ne dis jamais non plus que tu ne peux pas mémoriser ou supprimer une information.",
    ...(confirmation
      ? [
          `Pour ce message, le serveur a déjà répondu au client : « ${confirmation} ». C'est vrai et c'est fait. Ne parle pas de mémoire : réponds uniquement à la partie du message qui ne concerne pas ces informations. S'il n'y en a pas, réponds seulement par une courte phrase proposant ton aide pour son appareil.`,
        ]
      : []),
  ].join("\n");
}

export async function processMemory(prompt) {
  const memory = await readMemory();
  const actions = (await extractOperations(prompt, memory))
    .map((operation) => applyOperation(memory, operation))
    .filter(Boolean);

  const hasChanges = actions.some(
    (action) => action !== "unchanged" && action !== "missing",
  );

  if (hasChanges) {
    await writeMemory(memory);
  }

  const confirmation = [...new Set(actions)]
    .map((action) => ACTION_MESSAGES[action])
    .join(" ");

  return {
    memoryContext: buildMemoryContext(memory, confirmation),
    confirmation,
  };
}
