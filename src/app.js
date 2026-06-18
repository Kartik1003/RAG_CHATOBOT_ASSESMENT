import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answerQuestion, retrieve } from "./rag.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const indexPath = path.join(root, "data", "processed", "index.json");

if (!fs.existsSync(indexPath)) {
  console.error("Processed index not found. Run: npm run build:index");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(root, "public")));

app.get("/api/stats", (_req, res) => {
  res.json({ stats: index.stats, persona: index.persona, sampleTopics: index.topics.slice(0, 8) });
});

app.get("/api/persona", (_req, res) => res.json(index.persona));

app.post("/api/query", (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (!query) return res.status(400).json({ error: "query is required" });
  res.json(answerQuestion(index, index.persona, query));
});

app.post("/api/retrieve", (req, res) => {
  const query = String(req.body?.query || "").trim();
  if (!query) return res.status(400).json({ error: "query is required" });
  res.json(retrieve(index, query, Number(req.body?.limit || 6)));
});

export default app;
