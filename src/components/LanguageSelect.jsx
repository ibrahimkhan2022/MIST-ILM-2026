import { languages } from '../data/transcript.js';

export default function LanguageSelect({ value, onChange, label = 'Language' }) {
  return (
    <label className="lang-select">
      <span style={{ fontSize: '0.85rem', color: '#7a8178' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
