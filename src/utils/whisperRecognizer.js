const ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions';
const MODEL = 'whisper-large-v3';

const SILENCE_HANG_MS = 600;
const MIN_CHUNK_MS = 800;
const MAX_CHUNK_MS = 5000;
const SOFT_CHUNK_MS = 3500;
const RMS_SILENCE = 0.018;
const POLL_MS = 60;
const MIN_SPEECH_RATIO = 0.18;
const MIN_SPEECH_SAMPLES = 6;

const PROMPT_BIAS =
  'Islamic Friday khutbah in English with Arabic Quran phrases: ' +
  'Bismillah, Alhamdulillah, SubhanAllah, InshaAllah, Allahu Akbar, ' +
  'Quran, Surah, Hadith, Sunnah, Salah, Iman, Taqwa, Tawhid, Ummah, ' +
  "Jumu'ah, Khutbah, Imam, Masjid, Prophet Muhammad.";

const MAX_PROMPT_CHARS = 500;
const ROLLING_CONTEXT_CHARS = 150;

const HALLUCINATION_PATTERNS = [
  /amara\.?org/i,
  /subtitle[sd]?\s+by/i,
  /subtitle[sd]?\s+(?:provided|created)/i,
  /caption[sd]?\s+by/i,
  /transcrib(?:ed|ing)\s+by/i,
  /translat(?:ed|ion)\s+by/i,
  /thank(?:s|\s+you)\s+for\s+watching/i,
  /thank(?:s|\s+you)\s+for\s+listening/i,
  /(?:please\s+)?(?:like|subscribe|share)\s+(?:and|to|this)/i,
  /subscribe\s+to\s+(?:my|our|the)\s+channel/i,
  /^\s*(?:music|applause|silence|laughter)\s*$/i,
  /^\s*\[?\s*(?:music|applause|silence|laughter|inaudible)\s*\]?\s*\.?\s*$/i,
  /\bMBC\s*مصر\b/i,
  /\b(?:www\.|https?:\/\/)\S+/i,
  /^\s*you\s*\.?\s*$/i,
  /^\s*\.{2,}\s*$/i,
];

function isHallucination(text) {
  return HALLUCINATION_PATTERNS.some((re) => re.test(text));
}

function looksRepetitive(text) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  const counts = new Map();
  for (const w of words) counts.set(w, (counts.get(w) || 0) + 1);
  const top = Math.max(...counts.values());
  if (top / words.length >= 0.6) return true;
  let runs = 1, maxRun = 1;
  for (let i = 1; i < words.length; i += 1) {
    if (words[i] === words[i - 1]) { runs += 1; maxRun = Math.max(maxRun, runs); }
    else { runs = 1; }
  }
  return maxRun >= 4;
}

function tooSparseForChunk(text, chunkMs) {
  if (chunkMs < 2500) return false;
  const words = text.split(/\s+/).filter(Boolean);
  return words.length <= 1 && text.length < 8;
}

export function isWhisperConfigured() {
  return Boolean(import.meta.env.VITE_GROQ_API_KEY);
}

export function createWhisperRecognizer(opts = {}) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) return null;

  let mediaStream = null;
  let activeRecorder = null;
  let pollInterval = null;
  let stopRequested = false;
  let firedStartOnce = false;
  let mimeType = 'audio/webm';
  let audioCtx = null;
  let analyser = null;
  let analyserBuf = null;
  let chunkStartedAt = 0;
  let lastSpeechAt = 0;
  let sawSpeechThisChunk = false;
  let speechSamples = 0;
  let totalSamples = 0;
  let chunkDurationMs = 0;
  let rollingContext = '';

  const cleanup = () => {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
    try { if (activeRecorder?.state === 'recording') activeRecorder.stop(); } catch {}
    activeRecorder = null;
    try { audioCtx?.close(); } catch {}
    audioCtx = null;
    analyser = null;
    analyserBuf = null;
    mediaStream?.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  };

  const sampleRms = () => {
    if (!analyser || !analyserBuf) return 0;
    analyser.getByteTimeDomainData(analyserBuf);
    let sumSq = 0;
    for (let i = 0; i < analyserBuf.length; i += 1) {
      const v = (analyserBuf[i] - 128) / 128;
      sumSq += v * v;
    }
    return Math.sqrt(sumSq / analyserBuf.length);
  };

  const buildPrompt = () => {
    let prompt = PROMPT_BIAS;
    if (rollingContext) {
      const room = MAX_PROMPT_CHARS - prompt.length - 1;
      if (room > 0) prompt = `${prompt} ${rollingContext.slice(-room)}`;
    }
    return prompt.length > MAX_PROMPT_CHARS ? prompt.slice(0, MAX_PROMPT_CHARS) : prompt;
  };

  const postWhisper = (blob, prompt) => {
    const formData = new FormData();
    formData.append('file', blob, 'audio.webm');
    formData.append('model', MODEL);
    formData.append('response_format', 'json');
    if (prompt) formData.append('prompt', prompt);
    formData.append('temperature', '0');

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
  };

  const transcribeBlob = async (blob, chunkMs) => {
    if (blob.size < 2000) return;

    try {
      let res = await postWhisper(blob, buildPrompt());

      if (res.status === 400) {
        rollingContext = '';
        res = await postWhisper(blob, '');
      }

      if (!res.ok) {
        const fatal = res.status === 401 || res.status === 403;
        opts.onError?.(`whisper-http-${res.status}`, { fatal });
        return;
      }

      const text = ((await res.json()).text || '').trim();
      if (!text) return;
      if (isHallucination(text)) return;
      if (looksRepetitive(text)) return;
      if (tooSparseForChunk(text, chunkMs)) return;

      rollingContext = (rollingContext + ' ' + text).trim();
      if (rollingContext.length > ROLLING_CONTEXT_CHARS) {
        rollingContext = rollingContext.slice(-ROLLING_CONTEXT_CHARS);
      }

      opts.onResult?.({ final: text });
    } catch {
      opts.onError?.('whisper-network', { fatal: false });
    }
  };

  const startNextCycle = () => {
    if (stopRequested || !mediaStream) {
      cleanup();
      opts.onEnd?.();
      return;
    }

    const chunks = [];
    let rec;
    try {
      rec = new MediaRecorder(mediaStream, { mimeType });
    } catch {
      opts.onError?.('recorder-init-failed', { fatal: true });
      cleanup();
      return;
    }
    activeRecorder = rec;
    chunkStartedAt = Date.now();
    lastSpeechAt = 0;
    sawSpeechThisChunk = false;
    speechSamples = 0;
    totalSamples = 0;
    chunkDurationMs = 0;

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    rec.onstop = () => {
      const ratio = totalSamples > 0 ? speechSamples / totalSamples : 0;
      const enoughSpeech =
        sawSpeechThisChunk &&
        speechSamples >= MIN_SPEECH_SAMPLES &&
        ratio >= MIN_SPEECH_RATIO;
      if (enoughSpeech && chunks.length > 0) {
        transcribeBlob(new Blob(chunks, { type: mimeType }), chunkDurationMs);
      }
      startNextCycle();
    };

    rec.start();

    if (!firedStartOnce) {
      firedStartOnce = true;
      opts.onStart?.();
    }
  };

  const endChunkIfDue = () => {
    if (!activeRecorder || activeRecorder.state !== 'recording') return;
    const now = Date.now();
    const chunkAge = now - chunkStartedAt;
    totalSamples += 1;
    if (sampleRms() > RMS_SILENCE) {
      lastSpeechAt = now;
      sawSpeechThisChunk = true;
      speechSamples += 1;
    }
    const silentFor = lastSpeechAt ? now - lastSpeechAt : 0;
    const pauseEndsChunk = sawSpeechThisChunk && chunkAge >= MIN_CHUNK_MS && silentFor >= SILENCE_HANG_MS;
    const softCut = sawSpeechThisChunk && chunkAge >= SOFT_CHUNK_MS && silentFor >= 200;
    if (pauseEndsChunk || softCut || chunkAge >= MAX_CHUNK_MS) {
      chunkDurationMs = chunkAge;
      try { activeRecorder.stop(); } catch {}
    }
  };

  return {
    get running() {
      return Boolean(activeRecorder) && activeRecorder.state === 'recording';
    },
    start: async () => {
      stopRequested = false;
      firedStartOnce = false;
      rollingContext = '';

      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
      } catch (err) {
        const code = err?.name === 'NotAllowedError' ? 'not-allowed' : 'mic-error';
        opts.onError?.(code, { fatal: true });
        return;
      }

      mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(mediaStream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);
        analyserBuf = new Uint8Array(analyser.fftSize);
      } catch {}

      startNextCycle();
      pollInterval = setInterval(endChunkIfDue, POLL_MS);
    },
    stop: () => {
      stopRequested = true;
      try { if (activeRecorder?.state === 'recording') activeRecorder.stop(); } catch {}
      if (!activeRecorder || activeRecorder.state !== 'recording') {
        cleanup();
        opts.onEnd?.();
      }
    },
    abort: () => {
      stopRequested = true;
      cleanup();
      opts.onEnd?.();
    },
  };
}
