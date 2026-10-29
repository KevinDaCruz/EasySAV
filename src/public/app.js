const form = document.querySelector("#prompt-form");
const promptInput = document.querySelector("#prompt");
const button = form.querySelector("button");
const chat = document.querySelector("#chat");
const welcome = document.querySelector("#welcome");
const messageList = document.querySelector("#messages");

const ASSISTANT_ICON = '<svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>';

function scrollToBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function createAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-cyan-400 shadow-sm";
  avatar.innerHTML = ASSISTANT_ICON;
  return avatar;
}

function appendMessage(role, content) {
  welcome.hidden = true;
  messageList.hidden = false;
  const row = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.textContent = content;
  if (role === "user") {
    row.className = "flex justify-end";
    bubble.className = "max-w-[85%] rounded-2xl rounded-br-md bg-blue-600 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-white shadow-sm";
    row.append(bubble);
  } else {
    row.className = "flex items-start gap-3";
    bubble.className = role === "error"
      ? "max-w-[85%] rounded-2xl rounded-tl-md border border-red-300 bg-red-50 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-red-800"
      : "max-w-[85%] rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-slate-800 shadow-sm";
    row.append(createAvatar(), bubble);
  }
  messageList.append(row);
  scrollToBottom();
}

function showLoading() {
  const row = document.createElement("div");
  row.className = "flex items-start gap-3";
  row.setAttribute("aria-label", "Génération en cours…");
  const bubble = document.createElement("div");
  bubble.className = "flex items-center gap-1.5 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-4 shadow-sm";
  bubble.innerHTML = '<span class="size-2 animate-bounce rounded-full bg-blue-600"></span><span class="size-2 animate-bounce rounded-full bg-blue-600 [animation-delay:150ms]"></span><span class="size-2 animate-bounce rounded-full bg-blue-600 [animation-delay:300ms]"></span>';
  row.append(createAvatar(), bubble);
  messageList.append(row);
  scrollToBottom();
  return row;
}

function appendTokens(tokens) {
  const info = document.createElement("p");
  info.className = "-mt-4 pl-12 text-xs text-slate-500";
  info.textContent = `${tokens.toLocaleString("fr-FR")} tokens consommés`;
  messageList.append(info);
  scrollToBottom();
}

function describeOperation({ action, category, field, value }) {
  return action === "delete"
    ? `Oublier : ${category} > ${field}`
    : `Retenir : ${category} > ${field} : ${value}`;
}

function appendProposal(proposal) {
  const row = document.createElement("div");
  row.className = "pl-12";
  const card = document.createElement("div");
  card.className = "max-w-[85%] rounded-2xl border border-cyan-300 bg-cyan-50 px-4 py-3 text-[15px] leading-relaxed text-slate-800";
  const title = document.createElement("p");
  title.className = "font-semibold text-slate-900";
  title.textContent = "Voulez-vous mettre à jour votre fiche client ?";
  const list = document.createElement("ul");
  list.className = "mt-2 space-y-1";
  for (const operation of proposal) {
    const item = document.createElement("li");
    item.textContent = describeOperation(operation);
    list.append(item);
  }
  const actions = document.createElement("div");
  actions.className = "mt-3 flex gap-2";
  const accept = document.createElement("button");
  accept.type = "button";
  accept.textContent = "Oui";
  accept.className = "rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600";
  const refuse = document.createElement("button");
  refuse.type = "button";
  refuse.textContent = "Non";
  refuse.className = "rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400";
  accept.addEventListener("click", async () => {
    accept.disabled = true;
    refuse.disabled = true;
    try {
      const response = await fetch("/api/ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
      row.remove();
      appendMessage("assistant", data.message);
    } catch (error) {
      accept.disabled = false;
      refuse.disabled = false;
      appendMessage("error", error.message);
    }
  });
  refuse.addEventListener("click", () => {
    row.remove();
    appendMessage("assistant", "D'accord, je n'ai rien modifié dans votre fiche.");
  });
  actions.append(accept, refuse);
  card.append(title, list, actions);
  row.append(card);
  messageList.append(row);
  scrollToBottom();
}

promptInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  if (!button.disabled) form.requestSubmit();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;
  button.disabled = true;
  promptInput.value = "";
  appendMessage("user", prompt);
  const loading = showLoading();
  try {
    const response = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    loading.remove();
    appendMessage("assistant", data.answer);
    if (data.tokens) appendTokens(data.tokens);
    if (data.proposal) appendProposal(data.proposal);
  } catch (error) {
    loading.remove();
    appendMessage("error", error.message);
  } finally {
    button.disabled = false;
    promptInput.focus();
  }
});
