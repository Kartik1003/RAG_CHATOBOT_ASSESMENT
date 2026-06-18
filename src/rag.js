import { compactSummary, cosineFromCounts, jaccard, termFrequency, topKeywords } from "./text.js";

export function createMessageChunks(messages, size = 18, overlap = 4) {
  const chunks = [];
  for (let start = 0; start < messages.length; start += size - overlap) {
    const segment = messages.slice(start, Math.min(start + size, messages.length));
    if (!segment.length) break;
    const text = segment.map((m) => `${m.speaker}: ${m.text}`).join("\n");
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      startMessage: segment[0].id,
      endMessage: segment.at(-1).id,
      dayStart: segment[0].day,
      dayEnd: segment.at(-1).day,
      text,
      keywords: topKeywords(text, 10)
    });
    if (segment.at(-1).id === messages.at(-1).id) break;
  }
  return chunks;
}

export function createTopicCheckpoints(messages) {
  const checkpoints = [];
  let start = 0;
  let currentWindow = [];
  const minTopicSize = 8;
  const windowSize = 12;

  for (let i = 0; i < messages.length; i += 1) {
    const message = messages[i];
    const windowText = currentWindow.map((m) => m.text).join(" ");
    const similarity = currentWindow.length >= 4 ? cosineFromCounts(termFrequency(windowText), termFrequency(message.text)) : 1;
    const lexicalOverlap = currentWindow.length >= 4 ? jaccard(windowText, message.text) : 1;
    const enoughMessages = i - start >= minTopicSize;
    const dayBoundary = i > 0 && message.day !== messages[i - 1].day;
    const topicShift = enoughMessages && similarity < 0.05 && lexicalOverlap < 0.04;
    const longSegment = i - start >= 55 && similarity < 0.12;

    if (topicShift || longSegment || (dayBoundary && i - start >= 25 && similarity < 0.08)) {
      checkpoints.push(makeTopicCheckpoint(checkpoints.length + 1, messages.slice(start, i)));
      start = i;
      currentWindow = [];
    }

    currentWindow.push(message);
    if (currentWindow.length > windowSize) currentWindow.shift();
  }

  if (start < messages.length) checkpoints.push(makeTopicCheckpoint(checkpoints.length + 1, messages.slice(start)));
  return checkpoints;
}

function makeTopicCheckpoint(number, segment) {
  const text = segment.map((m) => `${m.speaker}: ${m.text}`).join("\n");
  return {
    id: `topic-${number}`,
    topicNumber: number,
    startMessage: segment[0].id,
    endMessage: segment.at(-1).id,
    dayStart: segment[0].day,
    dayEnd: segment.at(-1).day,
    label: topKeywords(text, 5).join(", ") || `Topic ${number}`,
    summary: compactSummary(segment, 5),
    keywords: topKeywords(text, 12)
  };
}

export function createHundredMessageCheckpoints(messages) {
  const checkpoints = [];
  for (let start = 0; start < messages.length; start += 100) {
    const segment = messages.slice(start, start + 100);
    const text = segment.map((m) => `${m.speaker}: ${m.text}`).join("\n");
    checkpoints.push({
      id: `hundred-${checkpoints.length + 1}`,
      checkpointNumber: checkpoints.length + 1,
      startMessage: segment[0].id,
      endMessage: segment.at(-1).id,
      summary: compactSummary(segment, 6),
      keywords: topKeywords(text, 12)
    });
  }
  return checkpoints;
}

export function attachVectors(items, textSelector) {
  return items.map((item) => ({ ...item, vector: termFrequency(textSelector(item)) }));
}

export function retrieve(index, query, limit = 6) {
  const queryVector = termFrequency(query);
  const scoreItem = (item, text) => ({
    ...item,
    score: cosineFromCounts(queryVector, item.vector) + jaccard(query, text) * 0.35
  });

  const topics = index.topicVectors
    .map((topic) => scoreItem(topic, `${topic.label} ${topic.summary} ${topic.keywords.join(" ")}`))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(3, Math.ceil(limit / 2)));

  const chunks = index.chunkVectors
    .map((chunk) => scoreItem(chunk, `${chunk.text} ${chunk.keywords.join(" ")}`))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const hundredCheckpoints = index.hundredVectors
    .map((checkpoint) => scoreItem(checkpoint, `${checkpoint.summary} ${checkpoint.keywords.join(" ")}`))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return { topics, chunks, hundredCheckpoints };
}

export function answerQuestion(index, persona, query) {
  const retrieved = retrieve(index, query);
  const lower = query.toLowerCase();
  const personaIntent = /person|habit|talk|communicat|style|trait|persona|user/.test(lower);
  const lines = [];

  if (personaIntent) {
    lines.push(personaAnswer(persona, lower));
  }

  const bestEvidence = [
    ...retrieved.topics.slice(0, 3).map((topic) => `Topic ${topic.topicNumber} (${topic.startMessage}-${topic.endMessage}): ${topic.summary}`),
    ...retrieved.chunks.slice(0, 3).map((chunk) => `Messages ${chunk.startMessage}-${chunk.endMessage}: ${chunk.text.split("\n").slice(0, 4).join(" ")}`)
  ];

  if (!personaIntent) {
    lines.push(`Based on the most relevant conversation evidence, ${bestEvidence.slice(0, 2).join(" ")}`);
  }

  lines.push(`Evidence used: ${bestEvidence.slice(0, 5).join(" | ")}`);
  return { answer: lines.join("\n\n"), retrieved };
}

function personaAnswer(persona, lower) {
  if (/habit/.test(lower)) return `Habits: ${persona.habits.map((x) => `${x.claim} (${x.evidence})`).join("; ") || "No strong habits were found."}`;
  if (/talk|communicat|style/.test(lower)) return `Communication style: ${persona.communication_style.map((x) => `${x.claim} (${x.evidence})`).join("; ") || "No strong communication style signals were found."}`;
  return `This user appears to be: ${persona.personality_traits.map((x) => `${x.claim} (${x.evidence})`).join("; ") || "not enough evidence for strong personality traits."} Personal facts: ${persona.personal_facts.map((x) => `${x.claim} (${x.evidence})`).join("; ") || "none extracted with confidence."}`;
}
