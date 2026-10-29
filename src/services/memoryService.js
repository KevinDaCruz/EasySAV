import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { MEMORY_CATEGORIES, MEMORY_FILE } from "../config/ai.js";

const ALWAYS_RELEVANT_CATEGORIES = ["identité", "préférences"];
const RELATED_CATEGORIES = { appareil: ["problèmes"], problèmes: ["appareil"] };
const PLACEHOLDER_VALUES = [
  "inconnu",
  "inconnue",
  "non précisé",
  "non précisée",
  "non renseigné",
  "non renseignée",
  "aucun",
  "aucune",
  "n/a",
  "unknown",
  "null",
];

const ACTION_MESSAGES = {
  saved: "C'est noté, j'ai enregistré cette information.",
  updated: "J'ai mis à jour cette information.",
  deleted: "J'ai supprimé cette information.",
  unchanged: "Cette information était déjà à jour, rien n'a changé.",
  missing: "Cette information n'est pas enregistrée, il n'y a rien à supprimer.",
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

function toMemoryList(memory) {
  return Object.entries(memory).flatMap(([category, fields]) =>
    Object.entries(fields).map(([field, value]) => ({ category, field, value })),
  );
}

function extractWords(text) {
  const words = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .match(/[a-z0-9]{4,}/g);

  return new Set(words?.map((word) => word.slice(0, 4)));
}

function findMemory(memories, category, field) {
  return memories.find(
    (memory) => memory.category === category && memory.field === field,
  );
}

function cleanOperation(operation) {
  const { action, category, field, value } = operation ?? {};

  if (
    !MEMORY_CATEGORIES.includes(category) ||
    typeof field !== "string" ||
    !field.trim()
  ) {
    return null;
  }

  if (action === "delete") {
    return { action, category, field: field.trim() };
  }

  if (
    action === "set" &&
    typeof value === "string" &&
    value.trim() &&
    !PLACEHOLDER_VALUES.includes(value.trim().toLowerCase())
  ) {
    return { action, category, field: field.trim(), value: value.trim() };
  }

  return null;
}

function changesMemory(operation, memories) {
  const current = findMemory(memories, operation.category, operation.field);
  return operation.action === "delete"
    ? Boolean(current)
    : current?.value !== operation.value;
}

export async function listMemories() {
  return toMemoryList(await readMemory());
}

export function selectRelevantMemories(question, history, memories) {
  const conversationWords = extractWords(
    [...history.map(({ content }) => content), question].join(" "),
  );

  const matchedCategories = memories
    .filter(({ category, field, value }) =>
      [...extractWords(`${category} ${field} ${value}`)].some((word) =>
        conversationWords.has(word),
      ),
    )
    .map(({ category }) => category);

  const relevantCategories = new Set([
    ...ALWAYS_RELEVANT_CATEGORIES,
    ...matchedCategories,
    ...matchedCategories.flatMap((category) => RELATED_CATEGORIES[category] ?? []),
  ]);

  return memories.filter(({ category }) => relevantCategories.has(category));
}

function isDeletion(operation) {
  return operation?.action === "delete" || operation?.action === "delete_all";
}

function toOperations(memoryCandidate, memories) {
  if (!Array.isArray(memoryCandidate)) {
    return [];
  }

  if (memoryCandidate.some((operation) => operation?.action === "delete_all")) {
    return memories.map(({ category, field }) => ({
      action: "delete",
      category,
      field,
    }));
  }

  return memoryCandidate.map(cleanOperation).filter(Boolean);
}

export function prepareProposal(memoryCandidate, memories) {
  const proposal = toOperations(memoryCandidate, memories).filter((operation) =>
    changesMemory(operation, memories),
  );

  return proposal.length ? proposal : null;
}

export function getForgetNotice(memoryCandidate, proposal) {
  const asksToForget =
    Array.isArray(memoryCandidate) && memoryCandidate.some(isDeletion);
  const proposesDeletion = proposal?.some(isDeletion);

  return asksToForget && !proposesDeletion ? ACTION_MESSAGES.missing : "";
}

export async function applyProposal(proposal) {
  const memory = await readMemory();
  const operations = prepareProposal(proposal, toMemoryList(memory)) ?? [];

  const actions = operations.map(({ action, category, field, value }) => {
    const section = memory[category] ?? {};

    if (action === "delete") {
      delete section[field];
      return "deleted";
    }

    const result = Object.hasOwn(section, field) ? "updated" : "saved";
    memory[category] = { ...section, [field]: value };
    return result;
  });

  if (!actions.length) {
    return ACTION_MESSAGES.unchanged;
  }

  await writeMemory(memory);

  return [...new Set(actions)].map((action) => ACTION_MESSAGES[action]).join(" ");
}
