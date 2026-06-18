const stats = document.querySelector("#stats");
const persona = document.querySelector("#persona");
const messages = document.querySelector("#messages");
const form = document.querySelector("#form");
const queryInput = document.querySelector("#query");

function addBubble(text, type, retrieved) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;
  bubble.textContent = text;

  if (retrieved) {
    const evidence = document.createElement("div");
    evidence.className = "evidence";
    for (const topic of retrieved.topics || []) {
      const item = document.createElement("details");
      item.innerHTML = `<summary>Topic ${topic.topicNumber}: messages ${topic.startMessage}-${topic.endMessage}</summary><p>${topic.summary}</p>`;
      evidence.appendChild(item);
    }
    for (const chunk of (retrieved.chunks || []).slice(0, 3)) {
      const item = document.createElement("details");
      item.innerHTML = `<summary>Chunk: messages ${chunk.startMessage}-${chunk.endMessage}</summary><p>${chunk.text.replaceAll("\n", "<br>")}</p>`;
      evidence.appendChild(item);
    }
    bubble.appendChild(evidence);
  }

  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}

async function loadStats() {
  const res = await fetch("/api/stats");
  const data = await res.json();
  stats.innerHTML = Object.entries(data.stats)
    .map(([key, value]) => `<div class="stat"><span>${key}</span><strong>${value}</strong></div>`)
    .join("");
  persona.textContent = JSON.stringify(data.persona, null, 2);
  addBubble("Ask me about the user's habits, personality, communication style, or any detail from the conversations.", "bot");
}

async function ask(query) {
  addBubble(query, "user");
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  });
  const data = await res.json();
  addBubble(data.answer || data.error, "bot", data.retrieved);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();
  if (!query) return;
  queryInput.value = "";
  ask(query);
});

document.querySelectorAll("[data-query]").forEach((button) => {
  button.addEventListener("click", () => ask(button.dataset.query));
});

loadStats();
