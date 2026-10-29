import { readFile } from "node:fs/promises";
import {
  KNOWLEDGE_FILE,
  RAG_MAX_CHARS,
  RAG_MIN_SCORE,
  RAG_TOP_K,
} from "../config/ai.js";

const CANDIDATE_COUNT = 6;
const RRF_K = 60;
const BM25_K1 = 1.2;
const BM25_B = 0.75;
const MIN_SHARED_WORDS = 3;
const MAX_COMMON_RATIO = 0.25;

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "mais",
  "donc", "car", "ni", "que", "qui", "quoi", "dont", "ce", "cet", "cette",
  "ces", "mon", "ma", "mes", "ton", "ta", "tes", "sa", "ses", "notre",
  "nos", "votre", "vos", "leur", "leurs", "je", "tu", "il", "elle", "on",
  "nous", "vous", "ils", "elles", "me", "te", "se", "en", "au", "aux",
  "avec", "sans", "pour", "par", "sur", "sous", "dans", "est", "sont",
  "suis", "es", "ai", "as", "avons", "avez", "ont", "plus", "pas", "ne",
  "tres", "bien", "fait", "faire", "tout", "tous", "toute", "toutes",
  "comme", "quand", "depuis", "alors", "aussi", "encore", "ca", "cela",
  "qu", "lui", "moi", "toi", "si", "bonjour", "bonsoir", "salut", "coucou",
  "merci", "beaucoup", "ok", "oui", "non", "accord", "svp", "stp",
]);

function toStems(text) {
  const words =
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .match(/[a-z0-9]+/g) ?? [];

  return words
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map((word) => word.slice(0, 5));
}

async function readKnowledge() {
  return JSON.parse(await readFile(KNOWLEDGE_FILE, "utf-8"));
}

function rankByWords(documents, queryStems) {
  const indexed = documents.map((document) => ({
    document,
    stems: toStems(
      [
        document.title,
        document.title,
        ...document.keywords,
        ...document.keywords,
        document.content,
      ].join(" "),
    ),
  }));
  const averageLength =
    indexed.reduce((total, { stems }) => total + stems.length, 0) /
    indexed.length;

  return indexed.map(({ document, stems }) => {
    const score = [...queryStems].reduce((total, stem) => {
      const frequency = stems.filter((word) => word === stem).length;

      if (!frequency) {
        return total;
      }

      const documentCount = indexed.filter((entry) =>
        entry.stems.includes(stem),
      ).length;
      const idf = Math.log(
        1 + (indexed.length - documentCount + 0.5) / (documentCount + 0.5),
      );
      const lengthRatio = stems.length / averageLength;

      return (
        total +
        (idf * frequency * (BM25_K1 + 1)) /
          (frequency + BM25_K1 * (1 - BM25_B + BM25_B * lengthRatio))
      );
    }, 0);

    return { document, score };
  });
}

function findMatchedSynonyms(document, queryStems) {
  return document.synonyms.filter((synonym) => {
    const stems = toStems(synonym);
    return stems.length && stems.every((stem) => queryStems.has(stem));
  });
}

function rankBySynonyms(documents, queryStems) {
  return documents.map((document) => ({
    document,
    score: findMatchedSynonyms(document, queryStems).reduce(
      (total, synonym) => total + toStems(synonym).length,
      0,
    ),
  }));
}

function toRanking(results) {
  return results
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ document }) => document);
}

function fuseRankings(rankings) {
  const scores = new Map();

  for (const ranking of rankings) {
    ranking.forEach((document, index) => {
      scores.set(document, (scores.get(document) ?? 0) + 1 / (RRF_K + index + 1));
    });
  }

  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([document]) => document);
}

function rerank(document, queryStems) {
  const titleStems = new Set(toStems(document.title));
  const titleMatch =
    [...titleStems].filter((stem) => queryStems.has(stem)).length /
    titleStems.size;
  const keywordHits = new Set(
    toStems(document.keywords.join(" ")).filter((stem) => queryStems.has(stem)),
  ).size;
  const deviceMatch = toStems(document.devices.join(" ")).some((stem) =>
    queryStems.has(stem),
  );
  const synonymMatch = findMatchedSynonyms(document, queryStems).length > 0;

  return (
    0.35 * titleMatch +
    0.25 * Math.min(1, keywordHits / 2) +
    0.2 * Number(deviceMatch) +
    0.2 * Number(synonymMatch)
  );
}

function fitToBudget(documents) {
  let remaining = RAG_MAX_CHARS;

  return documents.flatMap(({ id, title, content }) => {
    if (remaining <= 0) {
      return [];
    }

    const excerpt =
      content.length > remaining
        ? `${content.slice(0, remaining).trimEnd()}…`
        : content;
    remaining -= excerpt.length;

    return [{ id, title, content: excerpt }];
  });
}

export async function searchKnowledge(question, context) {
  if (!toStems(question).length) {
    return [];
  }

  const queryStems = new Set(toStems(`${question} ${context}`));

  const documents = await readKnowledge();
  const candidates = fuseRankings([
    toRanking(rankByWords(documents, queryStems)),
    toRanking(rankBySynonyms(documents, queryStems)),
  ]).slice(0, CANDIDATE_COUNT);

  const selected = candidates
    .map((document) => ({ document, score: rerank(document, queryStems) }))
    .filter(({ score }) => score >= RAG_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, RAG_TOP_K)
    .map(({ document }) => document);

  return fitToBudget(selected);
}

export async function verifySources(sourceIds, passages, answer) {
  if (!Array.isArray(sourceIds)) {
    return [];
  }

  const documents = await readKnowledge();
  const documentFrequency = new Map();

  for (const document of documents) {
    for (const stem of new Set(toStems(document.content))) {
      documentFrequency.set(stem, (documentFrequency.get(stem) ?? 0) + 1);
    }
  }

  const answerStems = new Set(
    toStems(answer).filter(
      (stem) =>
        (documentFrequency.get(stem) ?? 0) <=
        documents.length * MAX_COMMON_RATIO,
    ),
  );

  return passages
    .filter(
      ({ id, content }) =>
        sourceIds.includes(id) &&
        new Set(toStems(content).filter((stem) => answerStems.has(stem)))
          .size >= MIN_SHARED_WORDS,
    )
    .map(({ id, title }) => ({ id, title }));
}
