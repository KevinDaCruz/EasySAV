import { groq } from "../config/groq.js";
import {
  MAX_COMPLETION_TOKENS,
  MEMORY_CATEGORIES,
  TEMPERATURE,
} from "../config/ai.js";
import { MEMORY_PROMPT } from "../config/memoryPrompt.js";
import { SYSTEM_PROMPT } from "../config/systemPrompt.js";

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    memoryCandidate: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["set", "delete", "delete_all"] },
          category: { type: "string", enum: MEMORY_CATEGORIES },
          field: { type: "string" },
          value: { type: "string" },
        },
        required: ["action", "category", "field", "value"],
        additionalProperties: false,
      },
    },
    sources: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "memoryCandidate", "sources"],
  additionalProperties: false,
};

function buildMemoryContext(memories) {
  const memoryLines = memories.length
    ? memories.map(
        ({ category, field, value }) => `- ${category} > ${field} : ${value}`,
      )
    : ["Aucun."];

  return [
    "SOUVENIRS DU CLIENT (validés par lui). Utilise-les pour personnaliser ta réponse et réponds à ses questions sur ces souvenirs, qui ne sont pas hors sujet :",
    ...memoryLines,
  ].join("\n");
}

function buildKnowledgeContext(passages) {
  if (!passages.length) {
    return "EXTRAITS DE LA BASE EASYSAV : aucun. Laisse sources vide.";
  }

  return [
    "EXTRAITS DE LA BASE EASYSAV. Si un extrait correspond à l'appareil et à la panne du client, tes causes probables et tes vérifications viennent uniquement de cet extrait, sans en inventer d'autres, et son id va dans sources. Si aucun ne correspond, réponds avec tes consignes habituelles et laisse sources vide. N'écris jamais les id dans answer.",
    ...passages.map(({ id, title, content }) => `[${id}] ${title} : ${content}`),
  ].join("\n");
}

function parseStructuredAnswer(content) {
  try {
    const parsed = JSON.parse(content);
    const { answer, memoryCandidate, sources } = parsed.arguments ?? parsed;
    return {
      answer: typeof answer === "string" ? answer.trim() : "",
      memoryCandidate,
      sources,
    };
  } catch {
    return { answer: "", memoryCandidate: null, sources: [] };
  }
}

export async function generateStructuredAnswer(
  conversation,
  memories,
  passages,
) {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  let content;
  let tokens = null;

  try {
    // TODO 3 : appeler groq.chat.completions.create().
    // - messages contient au minimum un message de rôle "user"
    // - utiliser le modèle indiqué dans .env.example
    // - récupérer completion.choices[0].message.content
    const completion = await groq.chat.completions.create({
      model,
      ...(model.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: MEMORY_PROMPT },
        { role: "system", content: buildMemoryContext(memories) },
        { role: "system", content: buildKnowledgeContext(passages) },
        ...conversation,
      ],
      temperature: TEMPERATURE,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "easysav_answer",
          strict: true,
          schema: ANSWER_SCHEMA,
        },
      },
    });
    content = completion.choices[0]?.message?.content;
    tokens = completion.usage?.total_tokens ?? null;
  } catch (error) {
    content = error?.error?.error?.failed_generation;

    if (error?.status !== 400 || !content) {
      throw error;
    }
  }

  return { ...parseStructuredAnswer(content), tokens };
}
