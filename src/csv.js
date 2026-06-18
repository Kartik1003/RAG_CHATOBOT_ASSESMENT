import fs from "node:fs";

export function parseCsvRows(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    const next = raw[i + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function conversationsToMessages(rows) {
  const hasHeader = rows[0]?.some((cell) => /conversation|message|text|chat/i.test(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const messages = [];

  dataRows.forEach((row, dayIndex) => {
    const conversation = row.join(" ").trim();
    const matches = [...conversation.matchAll(/(?:^|\n|\r)\s*(User\s*\d+|[^:\n]{1,40}):\s*([\s\S]*?)(?=(?:\n|\r)\s*(?:User\s*\d+|[^:\n]{1,40}):|$)/g)];

    if (matches.length) {
      for (const match of matches) {
        const text = match[2].replace(/\s+/g, " ").trim();
        if (text) {
          messages.push({
            id: messages.length + 1,
            day: dayIndex + 1,
            speaker: match[1].trim(),
            text
          });
        }
      }
    } else if (conversation) {
      messages.push({
        id: messages.length + 1,
        day: dayIndex + 1,
        speaker: "Unknown",
        text: conversation.replace(/\s+/g, " ").trim()
      });
    }
  });

  return messages;
}
