import { MAX_HISTORY_EXCHANGES } from "../config/ai.js";
import { generateStructuredAnswer } from "./aiService.js";
import {
  getForgetNotice,
  listMemories,
  prepareProposal,
  selectRelevantMemories,
} from "./memoryService.js";
import { searchKnowledge, verifySources } from "./ragService.js";

const history = [];

function addExchange(prompt, answer, sources) {
  history.push(
    { role: "user", content: prompt },
    {
      role: "assistant",
      content: JSON.stringify({
        answer,
        memoryCandidate: [],
        sources: sources.map(({ id }) => id),
      }),
    },
  );
  history.splice(0, history.length - MAX_HISTORY_EXCHANGES * 2);
}

function buildSearchContext(memories) {
  const lastUserMessage =
    history.findLast(({ role }) => role === "user")?.content ?? "";
  const knownIssue = memories
    .filter(
      ({ category }) => category === "appareil" || category === "problèmes",
    )
    .map(({ value }) => value);

  return [lastUserMessage, ...knownIssue].join(" ");
}

export async function generateResponse(prompt) {
  const memories = await listMemories();
  const relevantMemories = selectRelevantMemories(prompt, history, memories);
  const passages = await searchKnowledge(prompt, buildSearchContext(memories));
  const { answer, memoryCandidate, sources, tokens } =
    await generateStructuredAnswer(
      [...history, { role: "user", content: prompt }],
      relevantMemories,
      passages,
    );

  if (!answer) {
    return { answer };
  }

  const verifiedSources = await verifySources(sources, passages, answer);
  addExchange(prompt, answer, verifiedSources);

  const proposal = prepareProposal(memoryCandidate, memories);
  const notice = getForgetNotice(memoryCandidate, proposal);

  return {
    answer: notice ? `${notice}\n\n${answer}` : answer,
    proposal,
    sources: verifiedSources,
    tokens,
  };
}
