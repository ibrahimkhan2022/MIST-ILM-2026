const ARABIC_RANGE = /[؀-ۿ]/;
const ARABIC_LETTER_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
const LATIN_LETTER_RE = /[A-Za-z]/g;

export function hasArabic(text) {
  if (!text) return false;
  return ARABIC_RANGE.test(text);
}

export function isPredominantlyArabic(text) {
  if (!text) return false;
  const arabicCount = (text.match(ARABIC_LETTER_RE) || []).length;
  if (arabicCount === 0) return false;
  const latinCount = (text.match(LATIN_LETTER_RE) || []).length;
  return arabicCount >= latinCount;
}

const ARABIC_TRANSLITERATIONS = [
  'bismillah', 'bismi', 'rahman', 'raheem', 'rahim', 'rahiym',
  'allah', 'allahu', 'allahumma', 'akbar',
  'alhamdulillah', 'hamdulillah', 'hamd',
  'subhanallah', 'subhan', 'subhana', 'subhaan',
  'illallah', 'ilaha',
  'inshallah', 'insha', 'inshaa',
  'mashallah', 'masha', 'mashaa',
  'astaghfirullah', 'astaghfir', 'bismillahi',
  'salam', 'salaam', 'salamu', 'assalamu', 'assalam',
  'alaykum', 'alaikum', 'aleykum', 'waalaykum', 'walaikum',
  'sallallahu', 'wasallam', 'sallalaahu', 'sallalahu',
  'jazakallah', 'jazak', 'jazakum',
  'barakallah', 'barakat',
  'wallahi', 'wallah',
  'quran', 'hadith', 'sunnah', 'ummah',
  'ramadan', 'iftar', 'suhoor',
  'dhikr', 'salah', 'salat', 'sawm',
  'jumuah', 'jummah', 'khutbah', 'khateeb', 'imam',
  'masjid', 'muslim', 'muslima', 'mumin',
  'taqwa', 'iman', 'ikhlas', 'tawhid', 'shirk',
  'inna', 'lillahi', 'rajioon', 'rajiun',
  'dunya', 'akhirah', 'jannah', 'jahannam',
  'nabi', 'rasul', 'sahabah',
];

export function looksLikeArabicTransliteration(text) {
  if (!text) return false;
  const words = text.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const matches = words.filter((w) =>
    ARABIC_TRANSLITERATIONS.some((p) => w.includes(p) || p.includes(w))
  );
  if (matches.length >= 2) return true;
  if (words.length <= 3 && matches.length >= 1) return true;
  return matches.length / words.length >= 0.35;
}

const ARABIC_CHARS_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+/g;
const ARABIC_PHRASE_RE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿\s،؛؟]+/g;

export function stripArabic(text) {
  if (!text) return '';
  return text.replace(ARABIC_CHARS_RE, ' ').replace(/\s+/g, ' ').trim();
}

export function extractArabic(text) {
  if (!text) return '';
  const matches = text.match(ARABIC_PHRASE_RE);
  return matches ? matches.join(' ').trim() : '';
}

async function callMyMemory(text, from, to) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(from)}|${encodeURIComponent(to)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const data = await res.json();

  const status = Number(data?.responseStatus);
  if (status && status !== 200) {
    throw new Error(data?.responseDetails || `translate status ${status}`);
  }

  const out = data?.responseData?.translatedText;
  if (!out || typeof out !== 'string') throw new Error('translate empty');

  const upper = out.toUpperCase();
  if (
    upper.startsWith('MYMEMORY WARNING') ||
    upper.includes('INVALID LANGUAGE PAIR') ||
    upper.includes('INVALID SOURCE LANGUAGE') ||
    upper.includes('INVALID TARGET LANGUAGE') ||
    upper.includes('IS AN INVALID') ||
    upper.includes('PLEASE SPECIFY')
  ) {
    throw new Error(out);
  }

  return out;
}

export async function translate(text, { from = 'auto', to = 'en' } = {}) {
  const clean = (text || '').trim();
  if (!clean) return '';
  if (from === to) return clean;
  try {
    return await callMyMemory(clean, from, to);
  } catch {
    return clean;
  }
}
