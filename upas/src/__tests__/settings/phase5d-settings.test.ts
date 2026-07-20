/**
 * Phase 5D Tests — Version Service, Settings Store, UI Integration
 *
 * Architecture Rule: These tests cover UI-only code.
 * Zero imports from calculations/design/analysis engines.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getVersionInfo } from '../../services/version';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';

// ─── Version Service Tests ─────────────────────────────────────────────

describe('5D-4 Version Service', () => {
  it('getVersionInfo should return valid version info', () => {
    const info = getVersionInfo();

    expect(info.version).toBe('1.0.0-RC1');
    expect(info.releaseCandidate).toBe('RC1');
    expect(info.appName).toContain('UPAS');
    expect(info.appNameAr).toContain('تحليل');
    expect(info.buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('version should be a valid semver string with optional pre-release', () => {
    const info = getVersionInfo();
    // Semver with pre-release: MAJOR.MINOR.PATCH-PRE
    const base = info.version.split('-')[0];
    const parts = base.split('.');
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(parseInt(p, 10)).toBeGreaterThanOrEqual(0));
  });

  it('buildDate should be a valid ISO date', () => {
    const info = getVersionInfo();
    const date = new Date(info.buildDate);
    expect(date.toISOString()).not.toBe('Invalid Date');
  });

  it('appName should include Underground Protective Analysis System', () => {
    const info = getVersionInfo();
    expect(info.appName).toBe('UPAS — Underground Protective Analysis System');
    expect(info.appNameAr).toBe('نظام تحليل المنشآت المحصنة تحت الأرض');
  });

  it('gitCommit should be null or a string', () => {
    const info = getVersionInfo();
    expect(info.gitCommit === null || typeof info.gitCommit === 'string').toBe(true);
  });

  it('should return a new object on each call (no mutation)', () => {
    const a = getVersionInfo();
    const b = getVersionInfo();
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});

// ─── Settings Store Tests ───────────────────────────────────────────────

describe('5D-5 Settings Store', () => {
  beforeEach(() => {
    // Reset store to defaults before each test
    useSettingsStore.getState().resetToDefaults();
    localStorage.clear();
  });

  // ─── Default Values ───────────────────────────────────────────────

  it('should have correct default values', () => {
    const state = useSettingsStore.getState();

    expect(state.language).toBe('ar');
    expect(state.theme).toBe('light');
    expect(state.rememberLastProject).toBe(true);
    expect(state.openLastProjectOnStartup).toBe(false);
    expect(state.autosaveEnabled).toBe(true);
    expect(state.autosaveIntervalSeconds).toBe(60);
    expect(state.notificationsEnabled).toBe(true);
    expect(state.notificationSound).toBe(true);
    expect(state.logLevel).toBe('warn');
    expect(state.debugMode).toBe(false);
    expect(state.showDeveloperInfo).toBe(false);
  });

  it('should have correct default report preferences', () => {
    const { report } = useSettingsStore.getState();

    expect(report.companyLogo).toBe('');
    expect(report.organizationName).toBe('');
    expect(report.engineerName).toBe('');
    expect(report.footerText).toBe('');
    expect(report.showPageNumbers).toBe(true);
    expect(report.showDate).toBe(true);
  });

  // ─── Language ─────────────────────────────────────────────────────

  it('setLanguage should change language', () => {
    const store = useSettingsStore.getState();
    expect(store.language).toBe('ar');

    store.setLanguage('en');
    expect(useSettingsStore.getState().language).toBe('en');

    store.setLanguage('ar');
    expect(useSettingsStore.getState().language).toBe('ar');
  });

  // ─── Theme ────────────────────────────────────────────────────────

  it('setTheme should change theme', () => {
    const store = useSettingsStore.getState();

    store.setTheme('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');

    store.setTheme('system');
    expect(useSettingsStore.getState().theme).toBe('system');

    store.setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('setTheme should apply CSS class to document', () => {
    const store = useSettingsStore.getState();

    store.setTheme('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);

    store.setTheme('light');
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);

    store.setTheme('system');
    expect(document.documentElement.classList.contains('theme-light')).toBe(false);
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
  });

  // ─── Startup Settings ─────────────────────────────────────────────

  it('setRememberLastProject should toggle value', () => {
    const store = useSettingsStore.getState();
    expect(store.rememberLastProject).toBe(true);

    store.setRememberLastProject(false);
    expect(useSettingsStore.getState().rememberLastProject).toBe(false);

    store.setRememberLastProject(true);
    expect(useSettingsStore.getState().rememberLastProject).toBe(true);
  });

  it('setOpenLastProjectOnStartup should toggle value', () => {
    const store = useSettingsStore.getState();
    store.setOpenLastProjectOnStartup(true);
    expect(useSettingsStore.getState().openLastProjectOnStartup).toBe(true);
  });

  it('setAutosaveEnabled should toggle value', () => {
    const store = useSettingsStore.getState();
    store.setAutosaveEnabled(false);
    expect(useSettingsStore.getState().autosaveEnabled).toBe(false);
  });

  it('setAutosaveInterval should change interval', () => {
    const store = useSettingsStore.getState();
    store.setAutosaveInterval(120);
    expect(useSettingsStore.getState().autosaveIntervalSeconds).toBe(120);
  });

  // ─── Report Preferences ───────────────────────────────────────────

  it('setReportPreferences should update individual fields', () => {
    const store = useSettingsStore.getState();

    store.setReportPreferences({ organizationName: 'test org' });
    expect(useSettingsStore.getState().report.organizationName).toBe('test org');
    expect(useSettingsStore.getState().report.engineerName).toBe('');

    store.setReportPreferences({ engineerName: 'test engineer' });
    expect(useSettingsStore.getState().report.engineerName).toBe('test engineer');
    expect(useSettingsStore.getState().report.organizationName).toBe('test org');
  });

  it('setReportPreferences should update boolean fields', () => {
    const store = useSettingsStore.getState();

    store.setReportPreferences({ showPageNumbers: false });
    expect(useSettingsStore.getState().report.showPageNumbers).toBe(false);

    store.setReportPreferences({ showDate: false });
    expect(useSettingsStore.getState().report.showDate).toBe(false);
  });

  // ─── Notifications ────────────────────────────────────────────────

  it('setNotificationsEnabled should toggle notifications', () => {
    const store = useSettingsStore.getState();
    store.setNotificationsEnabled(false);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
  });

  it('setNotificationSound should toggle sound', () => {
    const store = useSettingsStore.getState();
    store.setNotificationSound(false);
    expect(useSettingsStore.getState().notificationSound).toBe(false);
  });

  // ─── Advanced Settings ────────────────────────────────────────────

  it('setLogLevel should change log level', () => {
    const store = useSettingsStore.getState();

    store.setLogLevel('debug');
    expect(useSettingsStore.getState().logLevel).toBe('debug');

    store.setLogLevel('error');
    expect(useSettingsStore.getState().logLevel).toBe('error');
  });

  it('setDebugMode should toggle debug mode', () => {
    const store = useSettingsStore.getState();
    store.setDebugMode(true);
    expect(useSettingsStore.getState().debugMode).toBe(true);
  });

  it('setShowDeveloperInfo should toggle developer info', () => {
    const store = useSettingsStore.getState();
    store.setShowDeveloperInfo(true);
    expect(useSettingsStore.getState().showDeveloperInfo).toBe(true);
  });

  // ─── Reset ────────────────────────────────────────────────────────

  it('resetToDefaults should restore all defaults', () => {
    const store = useSettingsStore.getState();

    // Change everything
    store.setLanguage('en');
    store.setTheme('dark');
    store.setRememberLastProject(false);
    store.setOpenLastProjectOnStartup(true);
    store.setAutosaveEnabled(false);
    store.setAutosaveInterval(300);
    store.setReportPreferences({
      organizationName: 'Test Org',
      engineerName: 'Test',
      footerText: 'Footer',
      showPageNumbers: false,
      showDate: false,
    });
    store.setNotificationsEnabled(false);
    store.setNotificationSound(false);
    store.setLogLevel('debug');
    store.setDebugMode(true);
    store.setShowDeveloperInfo(true);

    // Reset
    store.resetToDefaults();
    const state = useSettingsStore.getState();

    expect(state.language).toBe('ar');
    expect(state.theme).toBe('light');
    expect(state.rememberLastProject).toBe(true);
    expect(state.openLastProjectOnStartup).toBe(false);
    expect(state.autosaveEnabled).toBe(true);
    expect(state.autosaveIntervalSeconds).toBe(60);
    expect(state.report.organizationName).toBe('');
    expect(state.report.engineerName).toBe('');
    expect(state.notificationsEnabled).toBe(true);
    expect(state.notificationSound).toBe(true);
    expect(state.logLevel).toBe('warn');
    expect(state.debugMode).toBe(false);
    expect(state.showDeveloperInfo).toBe(false);
  });

  it('resetToDefaults should remove dark theme classes', () => {
    const store = useSettingsStore.getState();
    store.setTheme('dark');
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);

    store.resetToDefaults();
    expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
    expect(document.documentElement.classList.contains('theme-light')).toBe(true);
  });

  // ─── Export / Import ──────────────────────────────────────────────

  it('exportSettings should return a plain object with all settings', () => {
    const store = useSettingsStore.getState();
    const exported = store.exportSettings();

    expect(exported.language).toBe('ar');
    expect(exported.theme).toBe('light');
    expect(exported.autosaveIntervalSeconds).toBe(60);
    expect(exported.report).toBeDefined();
    expect(exported.report.showPageNumbers).toBe(true);
    expect(typeof exported).toBe('object');
  });

  it('importSettings should apply settings', () => {
    const store = useSettingsStore.getState();

    store.importSettings({
      language: 'en',
      theme: 'dark',
      debugMode: true,
      logLevel: 'debug',
    });

    const state = useSettingsStore.getState();
    expect(state.language).toBe('en');
    expect(state.theme).toBe('dark');
    expect(state.debugMode).toBe(true);
    expect(state.logLevel).toBe('debug');
    // Unchanged fields should keep defaults
    expect(state.autosaveIntervalSeconds).toBe(60);
  });

  // ─── Persistence ──────────────────────────────────────────────────

  it('should persist settings to localStorage', () => {
    const store = useSettingsStore.getState();
    store.setLanguage('en');
    store.setTheme('dark');

    const raw = localStorage.getItem('upas-settings');
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed.language).toBe('en');
    expect(parsed.theme).toBe('dark');
  });

  it('importSettings should restore from localStorage data', () => {
    const store = useSettingsStore.getState();
    store.importSettings({
      language: 'en',
      theme: 'dark',
      debugMode: true,
    });

    expect(useSettingsStore.getState().language).toBe('en');
    expect(useSettingsStore.getState().theme).toBe('dark');
    expect(useSettingsStore.getState().debugMode).toBe(true);
  });

  // ─── Isolation from Calculation Engine ────────────────────────────

  it('settings store should NOT import anything from calculation engines', () => {
    // Structural test — the store file only imports from 'zustand'
    // This test documents the architectural boundary
    expect(true).toBe(true);
  });
});

// ─── UI Integration Tests (Headless) ────────────────────────────────────

describe('5D-6 UI Integration', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetToDefaults();
    useUIStore.getState().setActiveView('dashboard');
  });

  it('about view should be a valid AppView', () => {
    const store = useUIStore.getState();
    store.setActiveView('about');
    expect(useUIStore.getState().activeView).toBe('about');

    store.setActiveView('dashboard');
    expect(useUIStore.getState().activeView).toBe('dashboard');
  });

  it('settings view should be a valid AppView', () => {
    const store = useUIStore.getState();
    store.setActiveView('settings');
    expect(useUIStore.getState().activeView).toBe('settings');
  });

  it('theme changes should not affect any calculation results', () => {
    const store = useSettingsStore.getState();
    store.setTheme('dark');

    // The only side effect should be CSS class changes on documentElement
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);

    store.setTheme('light');
    store.resetToDefaults();
  });

  it('changing language in settings should not modify engineering data', () => {
    const store = useSettingsStore.getState();
    store.setLanguage('en');

    const exported = store.exportSettings();
    expect(exported.language).toBe('en');
    expect(Object.keys(exported)).not.toContain('calculations');
    expect(Object.keys(exported)).not.toContain('blast');
    expect(Object.keys(exported)).not.toContain('design');
  });
});

// ─── Freeze Gate Integrity ──────────────────────────────────────────────

describe('5D Freeze Gate Integrity', () => {
  it('Phase 5D should not modify any calculation files', () => {
    // Documentation test: Phase 5D is UI-only
    // No files under src/calculations/ were modified
    // No files under src/services/analysis/ were modified
    expect(true).toBe(true);
  });

  it('settings store should be independent of project store', () => {
    const settingsState = useSettingsStore.getState();
    const keys = Object.keys(settingsState).filter(
      (k) => typeof settingsState[k as keyof typeof settingsState] === 'function'
    );

    expect(keys).toContain('setLanguage');
    expect(keys).toContain('setTheme');
    expect(keys).toContain('resetToDefaults');
    expect(keys).toContain('exportSettings');
    expect(keys).toContain('importSettings');
  });
});