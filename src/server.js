import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Conversation RAG chatbot running at http://localhost:${port}`);
});
