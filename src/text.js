export const STOP_WORDS = new Set(`
a an and are as at be because been being but by can could did do does doing for from had has have having he her here hers
him his how i if in into is it its just me my of on or our ours she so than that the their them then there they this to
too up us was we were what when where which who why will with you your yours im i'm ive i've dont don't didnt didn't
cant can't wont won't not no yes yeah okay ok really very about after all also am any around back get got like one out
over said say see some still take tell thanks thank thats that's think time want way well would
`.trim().split(/\s+/));

export function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

export function termFrequency(text) {
  const counts = {};
  for (const token of tokenize(text)) counts[token] = (counts[token] || 0) + 1;
  return counts;
}

export function cosineFromCounts(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const entriesA = Object.entries(a || {});
  const entriesB = Object.entries(b || {});
  for (const [, value] of entriesA) magA += value * value;
  for (const [, value] of entriesB) magB += value * value;
  const [small, large] = entriesA.length < entriesB.length ? [entriesA, b] : [entriesB, a];
  for (const [key, value] of small) dot += value * (large[key] || 0);
  if (!magA || !magB) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function topKeywords(text, limit = 8) {
  return Object.entries(termFrequency(text))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function compactSummary(messages, maxSentences = 5) {
  const text = messages.map((m) => m.text).join(" ");
  const keywords = topKeywords(text, 12);
  const keywordSet = new Set(keywords);
  const scored = messages
    .map((message, index) => {
      const tokens = tokenize(message.text);
      const score = tokens.reduce((sum, token) => sum + (keywordSet.has(token) ? 2 : 0), 0) + Math.min(tokens.length / 12, 2);
      return { message, index, score };
    })
    .filter((item) => item.message.text.length > 12)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => `${item.message.speaker}: ${item.message.text.trim()}`);
  return scored.join(" ");
}

export function jaccard(a, b) {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) if (right.has(token)) overlap += 1;
  return overlap / (left.size + right.size - overlap);
}
