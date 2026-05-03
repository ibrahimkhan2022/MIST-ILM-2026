import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { khutbahs as seedKhutbahs } from '../data/khutbahs.js';

const AppContext = createContext(null);

const LS_KHUTBAHS = 'ilm:khutbahs';
const LS_ACTIVE_ID = 'ilm:activeKhutbahId';
const LS_PREF_LANG = 'ilm:preferredLanguage';
const LS_CHATS = 'ilm:chatsByKhutbahId';
const LS_DATA_VERSION = 'ilm:dataVersion';
const CURRENT_DATA_VERSION = '2';

function safeRead(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeWrite(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function safeRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

(function migrateIfNeeded() {
  if (typeof window === 'undefined') return;
  if (safeRead(LS_DATA_VERSION) !== CURRENT_DATA_VERSION) {
    safeRemove(LS_KHUTBAHS);
    safeRemove(LS_ACTIVE_ID);
    safeRemove(LS_CHATS);
    safeWrite(LS_DATA_VERSION, CURRENT_DATA_VERSION);
  }
})();

function loadKhutbahs() {
  const raw = safeRead(LS_KHUTBAHS);
  if (!raw) return seedKhutbahs;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedKhutbahs;
  } catch {
    return seedKhutbahs;
  }
}

function loadChats() {
  const raw = safeRead(LS_CHATS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function AppProvider({ children }) {
  const [khutbahs, setKhutbahs] = useState(loadKhutbahs);
  const [activeKhutbahId, setActiveKhutbahId] = useState(() => {
    const saved = safeRead(LS_ACTIVE_ID);
    const initial = loadKhutbahs();
    if (saved && initial.some((k) => k.id === saved)) return saved;
    return initial[0]?.id ?? null;
  });
  const [preferredLanguage, setPreferredLanguage] = useState(
    () => safeRead(LS_PREF_LANG) || 'en'
  );
  const [chatsByKhutbahId, setChatsByKhutbahId] = useState(loadChats);

  useEffect(() => { safeWrite(LS_KHUTBAHS, JSON.stringify(khutbahs)); }, [khutbahs]);
  useEffect(() => {
    if (activeKhutbahId) safeWrite(LS_ACTIVE_ID, activeKhutbahId);
    else safeRemove(LS_ACTIVE_ID);
  }, [activeKhutbahId]);
  useEffect(() => { safeWrite(LS_PREF_LANG, preferredLanguage); }, [preferredLanguage]);
  useEffect(() => { safeWrite(LS_CHATS, JSON.stringify(chatsByKhutbahId)); }, [chatsByKhutbahId]);

  const addKhutbah = useCallback((khutbah) => {
    setKhutbahs((prev) => [khutbah, ...prev]);
  }, []);

  const deleteKhutbah = useCallback((id) => {
    setKhutbahs((prev) => prev.filter((k) => k.id !== id));
    setChatsByKhutbahId((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setActiveKhutbahId((cur) => (cur === id ? null : cur));
  }, []);

  const getKhutbah = useCallback(
    (id) => khutbahs.find((k) => k.id === id) ?? null,
    [khutbahs]
  );

  const getChat = useCallback(
    (khutbahId) => chatsByKhutbahId[khutbahId] || [],
    [chatsByKhutbahId]
  );

  const setChat = useCallback((khutbahId, messages) => {
    setChatsByKhutbahId((prev) => ({ ...prev, [khutbahId]: messages }));
  }, []);

  const resetChat = useCallback((khutbahId) => {
    setChatsByKhutbahId((prev) => {
      const next = { ...prev };
      delete next[khutbahId];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      khutbahs,
      addKhutbah,
      deleteKhutbah,
      getKhutbah,
      activeKhutbahId,
      setActiveKhutbahId,
      preferredLanguage,
      setPreferredLanguage,
      getChat,
      setChat,
      resetChat,
    }),
    [
      khutbahs,
      addKhutbah,
      deleteKhutbah,
      getKhutbah,
      activeKhutbahId,
      preferredLanguage,
      getChat,
      setChat,
      resetChat,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
