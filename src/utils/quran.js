const API = 'https://api.alquran.cloud/v1';
const DIACRITICS_RE = /[\u064B-\u065F\u0670\u0671\u06D6-\u06ED]/g;
const PUNCT_RE = /[\u060C\u061B\u061F\u06D4،؛؟.\-_]/g;

function normalize(text) {
  if (!text) return '';
  return text.replace(DIACRITICS_RE, '').replace(PUNCT_RE, ' ').replace(/\s+/g, ' ').trim();
}

function wordOverlap(a, b) {
  const aw = new Set(a.split(' ').filter((w) => w.length >= 2));
  const bw = new Set(b.split(' ').filter((w) => w.length >= 2));
  if (aw.size === 0) return 0;
  let hit = 0;
  for (const w of aw) if (bw.has(w)) hit += 1;
  return hit / aw.size;
}

export async function searchQuran(arabicText) {
  const normalized = normalize(arabicText);
  if (!normalized) return null;
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 3) return null;

  const query = words.slice(0, 6).join(' ');
  const searchUrl = `${API}/search/${encodeURIComponent(query)}/all/quran-simple`;

  let searchData;
  try {
    const res = await fetch(searchUrl);
    if (!res.ok) return null;
    searchData = await res.json();
  } catch {
    return null;
  }

  if (searchData?.code !== 200) return null;
  const matches = searchData?.data?.matches;
  if (!Array.isArray(matches) || matches.length === 0) return null;

  let best = null;
  let bestScore = 0;
  for (const m of matches.slice(0, 10)) {
    const ayahNorm = normalize(m.text);
    const overlap = wordOverlap(normalized, ayahNorm);
    const score = ayahNorm.includes(normalized) ? 1 : overlap;
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }

  if (!best || bestScore < 0.6) return null;

  const ref = `${best.surah.number}:${best.numberInSurah}`;
  let canonicalArabic = best.text;
  let translation = '';
  try {
    const [uthmaniRes, transRes] = await Promise.all([
      fetch(`${API}/ayah/${ref}/quran-uthmani`),
      fetch(`${API}/ayah/${ref}/en.asad`),
    ]);
    if (uthmaniRes.ok) {
      const d = await uthmaniRes.json();
      canonicalArabic = d?.data?.text || canonicalArabic;
    }
    if (transRes.ok) {
      const d = await transRes.json();
      translation = d?.data?.text || '';
    }
  } catch {}

  return {
    surah: best.surah.number,
    ayah: best.numberInSurah,
    surahName: best.surah.englishName,
    surahNameArabic: best.surah.name,
    reference: `${best.surah.englishName} ${best.surah.number}:${best.numberInSurah}`,
    arabic: canonicalArabic,
    translation,
    confidence: bestScore,
  };
}
