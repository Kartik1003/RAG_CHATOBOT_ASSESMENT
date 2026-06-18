import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { conversationsToMessages, parseCsvRows } from "./csv.js";
import { buildPersona } from "./persona.js";
import { attachVectors, createHundredMessageCheckpoints, createMessageChunks, createTopicCheckpoints } from "./rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataPath = process.argv[2] || path.join(root, "data", "conversations.csv");
const outputDir = path.join(root, "data", "processed");

fs.mkdirSync(outputDir, { recursive: true });

const rows = parseCsvRows(dataPath);
const messages = conversationsToMessages(rows);
const topics = createTopicCheckpoints(messages);
const hundredCheckpoints = createHundredMessageCheckpoints(messages);
const chunks = createMessageChunks(messages);
const persona = buildPersona(messages);

const index = {
  generatedAt: new Date().toISOString(),
  source: path.relative(root, dataPath),
  stats: {
    rows: rows.length,
    messages: messages.length,
    topics: topics.length,
    hundredMessageCheckpoints: hundredCheckpoints.length,
    chunks: chunks.length
  },
  messages,
  topics,
  hundredCheckpoints,
  chunks,
  persona,
  topicVectors: attachVectors(topics, (topic) => `${topic.label} ${topic.summary} ${topic.keywords.join(" ")}`),
  hundredVectors: attachVectors(hundredCheckpoints, (checkpoint) => `${checkpoint.summary} ${checkpoint.keywords.join(" ")}`),
  chunkVectors: attachVectors(chunks, (chunk) => `${chunk.text} ${chunk.keywords.join(" ")}`)
};

fs.writeFileSync(path.join(outputDir, "messages.json"), JSON.stringify(messages, null, 2));
fs.writeFileSync(path.join(outputDir, "topic_checkpoints.json"), JSON.stringify(topics, null, 2));
fs.writeFileSync(path.join(outputDir, "hundred_message_checkpoints.json"), JSON.stringify(hundredCheckpoints, null, 2));
fs.writeFileSync(path.join(outputDir, "persona.json"), JSON.stringify(persona, null, 2));
fs.writeFileSync(path.join(outputDir, "index.json"), JSON.stringify(index, null, 2));

console.log(`Processed ${messages.length} messages from ${rows.length} daily rows.`);
console.log(`Created ${topics.length} topic checkpoints, ${hundredCheckpoints.length} 100-message checkpoints, and ${chunks.length} retrieval chunks.`);
console.log(`Wrote processed files to ${outputDir}`);
