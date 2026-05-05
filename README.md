# Ilm

> Capture, understand, and revisit Friday khutbahs.

Ilm is a web app that listens to the Friday khutbah live, transcribes English and Arabic, automatically matches recited Quran verses to canonical Uthmani text + translation, and produces an AI-generated study summary you can revisit or chat with.

Built for the MIST Muslim Software Competition.

## Features

- **Live transcription** with voice-activity-detection chunking (Groq Whisper Large v3)
- **Bilingual support** — handles English/Arabic code-switching, with the gold-bordered Arabic box only triggering when Arabic is actually the dominant script
- **Automatic Quran matching** — Arabic recitations are looked up in the Al-Quran Cloud database and replaced with canonical text + Asad translation
- **AI summarization** — Llama 3.3 70B turns the raw transcript into a structured khutbah (title, theme, key points, takeaways, references)
- **AI study companion** — a chatbot grounded in the saved khutbah's structured contents, with persistent per-khutbah threads
- **Live translation** to Urdu, French, and Arabic via MyMemory
- **Local-first** — everything is saved to `localStorage`, no backend, no accounts

## Tech stack

Vite + React 18 · React Router · Groq (Whisper Large v3 + Llama 3.3 70B) · Web Audio API for VAD · Al-Quran Cloud · MyMemory

## Running it

```bash
npm install
```

Create a `.env` file in the project root:

```
VITE_GROQ_API_KEY=gsk_your_groq_key_here
```

Free key at [console.groq.com](https://console.groq.com).

```bash
npm run dev
```

Then open `http://localhost:5173`.

## How it works

The microphone feed runs through a Web Audio analyser doing RMS-based VAD. Chunks end on natural pauses (~600 ms silence after speech) or a 5-second hard cap, then get POSTed to Groq Whisper. Output passes through filters for known hallucinations ("Subtitles by Amara.org", repetitive loops, sparse-output junk) before reaching the transcript. Arabic chunks trigger a Quran search; matches replace the transcription with canonical text. When the user clicks Save as Khutbah, the full transcript goes to Llama 3.3 with a strict-JSON schema that returns title/summary/key points/takeaways/references. Everything is persisted to `localStorage` with a version-key migration for clean upgrades.

## MIST ID's
Mist ID: 0DUEE 
Mist ID: V90KN 
Mist ID: V89CV
Mist ID: 5LJ21  
Mist ID: 03YR1
Mist ID: CKZAV

## License

MIT.
