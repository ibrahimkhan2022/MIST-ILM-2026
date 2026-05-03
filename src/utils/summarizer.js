const ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are an assistant that summarizes Islamic Friday sermons (khutbahs) into structured notes for a personal study library.

You will receive the raw spoken transcript of a khutbah, possibly with Arabic Quran verses inline (these are CANONICAL Quran text, not transcription mistakes — preserve them).

Return STRICT JSON only — no markdown, no commentary, no code fences. The JSON must match this shape exactly:

{
  "title": string,
  "topic": string,
  "summary": string,
  "mainTheme": string,
  "keyPoints": string[],
  "takeaways": string[],
  "tags": string[],
  "references": [
    { "type": "quran" | "hadith", "citation": string, "note": string }
  ]
}

Guidelines:
- Title should sound like a khutbah title, not a description. e.g. "The Weight of Sincerity" not "About Being Sincere".
- Topic is 1–3 words.
- summary is 2–4 sentences.
- mainTheme is 1 sentence.
- keyPoints: 3–6 short bullets, each ≤ 20 words.
- takeaways: 2–4 actionable lessons.
- tags: 3–6 lowercase one-word tags, no #.
- references[] should only include verses/hadith actually quoted. citation format: "Quran 2:255" or "Sahih Bukhari 6502". note is a 1-line gloss.
- Be faithful to what was said. Do not invent claims, references, or themes that aren't in the transcript.
- Output JSON ONLY. No preamble, no markdown.`;

export function isSummarizerConfigured() {
  return Boolean(import.meta.env.VITE_GROQ_API_KEY);
}

function buildTranscriptText(segments) {
  return segments
    .map((s) => {
      if (s.quranMatch) {
        return `[QURAN ${s.quranMatch.reference}] ${s.originalText}\n[Translation] ${s.translatedText || ''}`;
      }
      if (s.isArabic) {
        return `[Arabic] ${s.originalText}\n` + (s.translatedText ? `[Translation] ${s.translatedText}\n` : '');
      }
      return s.originalText;
    })
    .join('\n');
}

function parseJsonLoose(raw) {
  let txt = String(raw || '').trim();
  txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
  const firstBrace = txt.indexOf('{');
  const lastBrace = txt.lastIndexOf('}');
  if (firstBrace > 0 || lastBrace < txt.length - 1) {
    txt = txt.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(txt);
}

export async function summarizeTranscript(segments) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) throw new Error('missing VITE_GROQ_API_KEY');

  const body = {
    model: MODEL,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          'Here is the transcript of a khutbah. Summarize it as JSON matching the schema in the system prompt.\n\n' +
          '------ TRANSCRIPT ------\n' + buildTranscriptText(segments) + '\n------ END ------',
      },
    ],
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`summarize HTTP ${res.status}: ${errText}`);
  }

  const content = (await res.json())?.choices?.[0]?.message?.content;
  if (!content) throw new Error('summarize empty response');

  let parsed;
  try {
    parsed = parseJsonLoose(content);
  } catch {
    throw new Error('summarize: model returned non-JSON');
  }

  return {
    title: parsed.title || 'Untitled khutbah',
    topic: parsed.topic || 'General',
    summary: parsed.summary || '',
    mainTheme: parsed.mainTheme || parsed.summary || '',
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).replace(/^#/, '').toLowerCase())
      : [],
    references: Array.isArray(parsed.references) ? parsed.references : [],
  };
}
