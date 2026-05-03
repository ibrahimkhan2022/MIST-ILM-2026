const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const DEFAULT_SUGGESTIONS = [
  'Give me a summary',
  'Explain it simply',
  'How do I apply this?',
  'Explain the ayah',
];

function buildSystemPrompt(khutbah) {
  const refs = (khutbah.references || [])
    .map((r) => {
      const head = r.label || r.citation || r.type || 'Reference';
      const ar = r.arabic ? ` — ${r.arabic}` : '';
      const tr = r.translation || r.note;
      const trBit = tr ? ` (${tr})` : '';
      return `- ${head}${ar}${trBit}`;
    })
    .join('\n');

  return `You are an Islamic study companion helping the user understand a Friday khutbah. Ground every answer in the khutbah below. Be warm, respectful, and concise (usually 1–3 short paragraphs). When relevant, quote the verse or hadith already cited. Do NOT invent ayahs, hadith, or claims that aren't in the khutbah. If the user asks something unrelated, gently steer back to the khutbah.

Khutbah on file:
Title: ${khutbah.title}
Topic: ${khutbah.topic || 'General'}
Date: ${khutbah.date}
Summary: ${khutbah.summary}
Main theme: ${khutbah.mainTheme || ''}

Key points:
${(khutbah.keyPoints || []).map((p) => `- ${p}`).join('\n') || '(none)'}

Practical takeaways:
${(khutbah.takeaways || []).map((t) => `- ${t}`).join('\n') || '(none)'}

References cited:
${refs || '(none)'}

Tags: ${(khutbah.tags || []).join(', ') || '(none)'}`;
}

export async function getBotReply(history, khutbah) {
  if (!khutbah) {
    return {
      content: 'Pick a khutbah first so I have something to ground my answers in — you can open one from the Library.',
      suggestions: [],
    };
  }

  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return {
      content: 'Chat is not configured. Add VITE_GROQ_API_KEY to .env and restart the dev server.',
      suggestions: [],
    };
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt(khutbah) },
    ...history.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: MODEL, temperature: 0.5, messages }),
    });

    if (!res.ok) {
      return {
        content: `Chat backend error (HTTP ${res.status}). Try again in a moment.`,
        suggestions: DEFAULT_SUGGESTIONS,
      };
    }

    const content = (await res.json())?.choices?.[0]?.message?.content?.trim() || '';
    return {
      content: content || "I didn't get a reply. Try rephrasing?",
      suggestions: DEFAULT_SUGGESTIONS,
    };
  } catch {
    return {
      content: 'Network error reaching the chat backend. Check your connection and try again.',
      suggestions: DEFAULT_SUGGESTIONS,
    };
  }
}

export { DEFAULT_SUGGESTIONS };
