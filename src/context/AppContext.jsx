import { createContext, useContext, useMemo, useState } from 'react';
import { khutbahs as seed } from '../data/khutbahs.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [khutbahs, setKhutbahs] = useState(seed);
  const [activeKhutbahId, setActiveKhutbahId] = useState(null);
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  const value = useMemo(
    () => ({
      khutbahs,
      addKhutbah: (k) => setKhutbahs((cur) => [k, ...cur]),
      activeKhutbahId,
      setActiveKhutbahId,
      preferredLanguage,
      setPreferredLanguage,
    }),
    [khutbahs, activeKhutbahId, preferredLanguage],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
