function evidence(message) {
  return `message ${message.id}: "${message.text.slice(0, 140)}"`;
}

function addFinding(bucket, claim, message) {
  if (!bucket.some((item) => item.claim === claim)) {
    bucket.push({ claim, evidence: evidence(message) });
  }
}

export function buildPersona(messages) {
  const persona = {
    habits: [],
    personal_facts: [],
    personality_traits: [],
    communication_style: []
  };

  const user1 = messages.filter((message) => /user\s*1/i.test(message.speaker));
  const target = user1.length ? user1 : messages;
  const emojiCount = target.filter((message) => /[\u{1F300}-\u{1FAFF}]/u.test(message.text)).length;
  const avgLength = target.reduce((sum, message) => sum + message.text.split(/\s+/).length, 0) / Math.max(1, target.length);
  const exclamationCount = target.filter((message) => message.text.includes("!")).length;
  const questionCount = target.filter((message) => message.text.includes("?")).length;

  for (const message of target) {
    const text = message.text.toLowerCase();
    if (/moving to|move to|new city|relocat/.test(text)) addFinding(persona.personal_facts, "Has discussed moving or relocating", message);
    if (/portland|oregon/.test(text)) addFinding(persona.personal_facts, "Has mentioned Portland, Oregon", message);
    if (/culinary|cook|cooking|chef|baking|restaurant|food/.test(text)) addFinding(persona.habits, "Shows interest in food, cooking, or culinary life", message);
    if (/gym|workout|run|running|exercise|yoga/.test(text)) addFinding(persona.habits, "Mentions exercise or physical activity", message);
    if (/late|midnight|sleep|slept|awake|tired/.test(text)) addFinding(persona.habits, "Mentions sleep schedule or tiredness", message);
    if (/coffee|tea|breakfast|lunch|dinner|snack/.test(text)) addFinding(persona.habits, "Mentions food or drink routines", message);
    if (/excited|awesome|love|happy|glad/.test(text)) addFinding(persona.personality_traits, "Often expresses positive emotion or enthusiasm", message);
    if (/worried|anxious|sad|upset|stress|stressed|nervous/.test(text)) addFinding(persona.personality_traits, "Openly shares stress or vulnerable emotions", message);
    if (/haha|lol|funny|joke/.test(text)) addFinding(persona.personality_traits, "Uses humor or playful reactions", message);
    if (/sorry|thanks|thank you|appreciate/.test(text)) addFinding(persona.personality_traits, "Polite and appreciative in conversation", message);
    if (/friend|mom|mother|dad|father|sister|brother|partner|boyfriend|girlfriend|wife|husband/.test(text)) {
      addFinding(persona.personal_facts, "Mentions close relationships or family context", message);
    }
    if (/work|job|college|school|class|study|intern/.test(text)) addFinding(persona.personal_facts, "Mentions work or education context", message);
  }

  if (avgLength < 8) {
    persona.communication_style.push({ claim: "Usually sends short messages", evidence: `Average User 1 message length is ${avgLength.toFixed(1)} words.` });
  } else if (avgLength > 18) {
    persona.communication_style.push({ claim: "Often writes detailed messages", evidence: `Average User 1 message length is ${avgLength.toFixed(1)} words.` });
  } else {
    persona.communication_style.push({ claim: "Uses medium-length conversational messages", evidence: `Average User 1 message length is ${avgLength.toFixed(1)} words.` });
  }
  if (emojiCount) persona.communication_style.push({ claim: "Uses emojis sometimes", evidence: `${emojiCount} User 1 messages contain emoji.` });
  if (exclamationCount / Math.max(1, target.length) > 0.12) persona.communication_style.push({ claim: "Uses enthusiastic punctuation", evidence: `${exclamationCount} User 1 messages include exclamation marks.` });
  if (questionCount / Math.max(1, target.length) > 0.18) persona.communication_style.push({ claim: "Asks questions frequently", evidence: `${questionCount} User 1 messages include question marks.` });

  for (const key of Object.keys(persona)) persona[key] = persona[key].slice(0, 12);
  return persona;
}
