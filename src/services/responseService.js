import { MAX_HISTORY_EXCHANGES } from "../config/ai.js";
import { generateStructuredAnswer } from "./aiService.js";
import {
  getForgetNotice,
  listMemories,
  prepareProposal,
  selectRelevantMemories,
} from "./memoryService.js";

const history = [];

function addExchange(prompt, answer) {
  history.push(
    { role: "user", content: prompt },
    { role: "assistant", content: answer },
  );
  history.splice(0, history.length - MAX_HISTORY_EXCHANGES * 2);
}

export async function generateResponse(prompt) {
  const memories = await listMemories();
  const relevantMemories = selectRelevantMemories(prompt, history, memories);
  const { answer, memoryCandidate, tokens } = await generateStructuredAnswer(
    [...history, { role: "user", content: prompt }],
    relevantMemories,
  );

  if (!answer) {
    return { answer };
  }

  addExchange(prompt, answer);

  const proposal = prepareProposal(memoryCandidate, memories);
  const notice = getForgetNotice(memoryCandidate, proposal);

  return {
    answer: notice ? `${notice}\n\n${answer}` : answer,
    proposal,
    tokens,
  };
}
