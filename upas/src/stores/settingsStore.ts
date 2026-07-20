/**
 * UPAS — Settings Store (Zustand)
 * Phase 5D: Application settings — UI only, zero connection to calculation engine
 *
 * Architecture Rule: This store manages ONLY presentation preferences.
 * NO engineering parameters, NO unit conversions, NO calculation settings.
 */

import { create } from 'zustand';

// ─── Types ────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';
export type AppLanguage = 'ar' | 'en';
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface ReportPreferences {
  /** Company/Organization logo URL or path */
  companyLogo: string;
  /** Organization name for report header */
  organizationName: string;
  /** Engineer name for report signature */
  engineerName: string;
  /** Custom footer text */
  footerText: string;
  /** Show page numbers in reports */
  showPageNumbers: boolean;
  /** Show date in reports */
  showDate: boolean;
}

export interface AppSettings {
  // ─── General ──────────────────────────────────────────────────────
  language: AppLanguage;

  // ─── Appearance ───────────────────────────────────────────────────
  theme: ThemeMode;

  // ─── Startup ──────────────────────────────────────────────────────
  rememberLastProject: boolean;
  openLastProjectOnStartup: boolean;
  autosaveEnabled: boolean;
  autosaveIntervalSeconds: number;

  // ─── Reports ──────────────────────────────────────────────────────
  report: ReportPreferences;

  // ─── Notifications ────────────────────────────────────────────────
  notificationsEnabled: boolean;
  notificationSound: boolean;

  // ─── Advanced ─────────────────────────────────────────────────────
  logLevel: LogLevel;
  debugMode: boolean;
  showDeveloperInfo: boolean;
}

export interface SettingsActions {
  setLanguage: (lang: AppLanguage) => void;
  setTheme: (theme: ThemeMode) => void;
  setRememberLastProject: (val: boolean) => void;
  setOpenLastProjectOnStartup: (val: boolean) => void;
  setAutosaveEnabled: (val: boolean) => void;
  setAutosaveInterval: (seconds: number) => void;
  setReportPreferences: (prefs: Partial<ReportPreferences>) => void;
  setNotificationsEnabled: (val: boolean) => void;
  setNotificationSound: (val: boolean) => void;
  setLogLevel: (level: LogLevel) => void;
  setDebugMode: (val: boolean) => void;
  setShowDeveloperInfo: (val: boolean) => void;
  resetToDefaults: () => void;
  /** Export all settings as a plain object (for persistence) */
  exportSettings: () => AppSettings;
  /** Import settings from a plain object */
  importSettings: (settings: Partial<AppSettings>) => void;
}

export type SettingsStore = AppSettings & SettingsActions;

// ─── Defaults ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  language: 'ar',
  theme: 'light',
  rememberLastProject: true,
  openLastProjectOnStartup: false,
  autosaveEnabled: true,
  autosaveIntervalSeconds: 60,
  report: {
    companyLogo: '',
    organizationName: '',
    engineerName: '',
    footerText: '',
    showPageNumbers: true,
    showDate: true,
  },
  notificationsEnabled: true,
  notificationSound: true,
  logLevel: 'warn',
  debugMode: false,
  showDeveloperInfo: false,
};

// ─── LocalStorage Persistence ─────────────────────────────────────────

const STORAGE_KEY = 'upas-settings';

function loadPersistedSettings(): Partial<AppSettings> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    return {};
  }
}

function persistSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage full or unavailable — fail silently
  }
}

// ─── Store ────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsStore>()((set, get) => ({
  ...DEFAULT_SETTINGS,
  ...loadPersistedSettings(),

  // ─── Actions ──────────────────────────────────────────────────────
  setLanguage: (language) => {
    set({ language });
    persistSettings(get());
  },

  setTheme: (theme) => {
    set({ theme });
    persistSettings(get());
    applyTheme(theme);
  },

  setRememberLastProject: (rememberLastProject) => {
    set({ rememberLastProject });
    persistSettings(get());
  },

  setOpenLastProjectOnStartup: (openLastProjectOnStartup) => {
    set({ openLastProjectOnStartup });
    persistSettings(get());
  },

  setAutosaveEnabled: (autosaveEnabled) => {
    set({ autosaveEnabled });
    persistSettings(get());
  },

  setAutosaveInterval: (autosaveIntervalSeconds) => {
    set({ autosaveIntervalSeconds });
    persistSettings(get());
  },

  setReportPreferences: (prefs) => {
    set((s) => ({ report: { ...s.report, ...prefs } }));
    persistSettings(get());
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    persistSettings(get());
  },

  setNotificationSound: (notificationSound) => {
    set({ notificationSound });
    persistSettings(get());
  },

  setLogLevel: (logLevel) => {
    set({ logLevel });
    persistSettings(get());
  },

  setDebugMode: (debugMode) => {
    set({ debugMode });
    persistSettings(get());
  },

  setShowDeveloperInfo: (showDeveloperInfo) => {
    set({ showDeveloperInfo });
    persistSettings(get());
  },

  resetToDefaults: () => {
    set(DEFAULT_SETTINGS);
    persistSettings(DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS.theme);
  },

  exportSettings: () => {
    const state = get();
    return {
      language: state.language,
      theme: state.theme,
      rememberLastProject: state.rememberLastProject,
      openLastProjectOnStartup: state.openLastProjectOnStartup,
      autosaveEnabled: state.autosaveEnabled,
      autosaveIntervalSeconds: state.autosaveIntervalSeconds,
      report: { ...state.report },
      notificationsEnabled: state.notificationsEnabled,
      notificationSound: state.notificationSound,
      logLevel: state.logLevel,
      debugMode: state.debugMode,
      showDeveloperInfo: state.showDeveloperInfo,
    };
  },

  importSettings: (settings) => {
    set({ ...DEFAULT_SETTINGS, ...settings });
    persistSettings(get());
    applyTheme(get().theme);
  },
}));

// ─── Theme Application ────────────────────────────────────────────────

/** Apply theme class to <html> element */
function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;

  if (mode === 'system') {
    root.classList.remove('theme-light', 'theme-dark');
    // Let the OS preference media query handle it
    return;
  }

  root.classList.remove('theme-light', 'theme-dark');
  root.classList.add(`theme-${mode}`);
}

// Apply theme on store initialization
if (typeof document !== 'undefined') {
  applyTheme(useSettingsStore.getState().theme);
}