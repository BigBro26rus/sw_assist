import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

const STORAGE_KEY = 'sw-assist-settings';

export type Theme = 'dark' | 'light';

interface Settings {
  theme: Theme;
}

const defaults: Settings = {
  theme: 'dark',
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        theme: parsed.theme === 'light' ? 'light' : 'dark',
      };
    }
  } catch {
    // ignore
  }
  return { ...defaults };
}

function saveSettings(settings: Settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export const useSettingsStore = defineStore('settings', () => {
  const stored = loadSettings();
  const theme = ref<Theme>(stored.theme);

  applyTheme(theme.value);

  watch(theme, (value) => {
    applyTheme(value);
    saveSettings({ theme: value });
  });

  function setTheme(value: Theme) {
    theme.value = value;
  }

  return {
    theme,
    setTheme,
  };
});
