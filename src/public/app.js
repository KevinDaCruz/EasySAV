const form = document.querySelector("#prompt-form");
const promptInput = document.querySelector("#prompt");
const statusElement = document.querySelector("#status");
const answerElement = document.querySelector("#answer");
const button = form.querySelector("button");
const MAX_HISTORY_EXCHANGES = 5;
const history = [];

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) {
    statusElement.textContent = "Veuillez saisir une question.";
    return;
  }
  button.disabled = true;
  statusElement.textContent = "Génération en cours…";
  answerElement.textContent = "";
  answerElement.classList.remove("error");
  try {
    const response = await fetch("/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, history })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue.");
    history.push({ role: "user", content: prompt }, { role: "assistant", content: data.answer });
    history.splice(0, history.length - MAX_HISTORY_EXCHANGES * 2);
    statusElement.textContent = "Réponse générée :";
    answerElement.textContent = data.answer;
  } catch (error) {
    statusElement.textContent = "Échec de la requête.";
    answerElement.textContent = error.message;
    answerElement.classList.add("error");
  } finally {
    button.disabled = false;
  }
});
