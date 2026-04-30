import { useApp } from '../context/AppContext.jsx';

const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'ur', label: 'اردو' },
  { code: 'tr', label: 'Türkçe' },
];

export default function LanguageSelect() {
  const { preferredLanguage, setPreferredLanguage } = useApp();
  return (
    <select
      className="lang-select"
      value={preferredLanguage}
      onChange={(e) => setPreferredLanguage(e.target.value)}
      aria-label="Preferred language"
    >
      {LANGS.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
