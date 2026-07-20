/**
 * UPAS — Settings Screen
 * Phase 5D: Full application settings page with About & License modals
 * UI ONLY — zero connection to calculation engine
 */

import { useState } from 'react';
import { useSettingsStore, type ThemeMode, type AppLanguage, type LogLevel } from '../../../stores/settingsStore';
import { getVersionInfo } from '../../../services/version';

// ─── Icons ─────────────────────────────────────────────────────────────

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const PaletteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="10.5" r="2.5" />
    <circle cx="8.5" cy="7.5" r="2.5" />
    <circle cx="6.5" cy="12.5" r="2.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);

const RocketIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const TerminalIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ResetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

// ─── Shared UI Components ──────────────────────────────────────────────

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: 'var(--upas-bg-card)',
        borderColor: 'var(--upas-border)',
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span style={{ color: 'var(--upas-primary)' }}>{icon}</span>
        <h3 className="text-sm font-bold" style={{ color: 'var(--upas-text-primary)' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--upas-text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 mr-4">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        transition-colors duration-200 ease-in-out
        ${checked ? 'bg-amber-500' : 'bg-slate-300'}
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white shadow-md
          transition-transform duration-200 ease-in-out
          ${checked ? '-translate-x-5' : '-translate-x-0.5'}
          mt-0.5
        `}
      />
    </button>
  );
}

function SelectField<T extends string>({
  value,
  options,
  onChange,
  getLabel,
}: {
  value: T;
  options: readonly T[];
  onChange: (val: T) => void;
  getLabel: (val: T) => string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="text-sm rounded-lg border px-3 py-1.5 outline-none transition-colors
        focus:ring-2 focus:ring-amber-400/50"
      style={{
        backgroundColor: 'var(--upas-bg-primary)',
        borderColor: 'var(--upas-border)',
        color: 'var(--upas-text-primary)',
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {getLabel(opt)}
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  unit,
}: {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  unit?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
        className="w-20 text-sm rounded-lg border px-3 py-1.5 text-center outline-none
          transition-colors focus:ring-2 focus:ring-amber-400/50"
        style={{
          backgroundColor: 'var(--upas-bg-primary)',
          borderColor: 'var(--upas-border)',
          color: 'var(--upas-text-primary)',
        }}
      />
      {unit && (
        <span className="text-xs" style={{ color: 'var(--upas-text-secondary)' }}>
          {unit}
        </span>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-56 text-sm rounded-lg border px-3 py-1.5 outline-none
        transition-colors focus:ring-2 focus:ring-amber-400/50 text-right"
      style={{
        backgroundColor: 'var(--upas-bg-primary)',
        borderColor: 'var(--upas-border)',
        color: 'var(--upas-text-primary)',
      }}
    />
  );
}

// ─── About Modal ───────────────────────────────────────────────────────

function AboutModal({ onClose }: { onClose: () => void }) {
  const versionInfo = getVersionInfo();

  const techStack = [
    { name: 'React', version: '19' },
    { name: 'TypeScript', version: '6' },
    { name: 'Vite', version: '8' },
    { name: 'Zustand', version: '5' },
    { name: 'Three.js', version: '0.185' },
  ];

  const modules = [
    { labelAr: 'تحليل الانفجارات', labelEn: 'Blast Analysis', icon: '💥' },
    { labelAr: 'صدمة الأرض', labelEn: 'Ground Shock', icon: '🌊' },
    { labelAr: 'الاستجابة الإنشائية', labelEn: 'Structural Response', icon: '🏗️' },
    { labelAr: 'التصميم الإنشائي', labelEn: 'Structural Design', icon: '📐' },
    { labelAr: 'التحقق', labelEn: 'Verification', icon: '✅' },
    { labelAr: 'التقرير الهندسي', labelEn: 'Engineering Report', icon: '📄' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--upas-bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--upas-border)' }}
        >
          <h2 className="text-base font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            حول البرنامج
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            style={{ color: 'var(--upas-text-secondary)' }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* App Identity */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-3">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20" />
                <path d="M5 20V8l7-5 7 5v12" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--upas-text-primary)' }}>
              UPAS
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
              Underground Protective Analysis System
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
              نظام تحليل المنشآت المحصنة تحت الأرض
            </p>
          </div>

          {/* Version Info */}
          <div
            className="rounded-lg border p-3 text-center"
            style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
          >
            <p className="text-xs" style={{ color: 'var(--upas-text-secondary)' }}>الإصدار</p>
            <p className="text-base font-bold mt-0.5" style={{ color: 'var(--upas-text-primary)' }}>
              v{versionInfo.version}
            </p>
            <p className="text-[11px] mt-1" style={{ color: 'var(--upas-text-secondary)' }}>
              تاريخ البناء: {versionInfo.buildDate}
              {versionInfo.gitCommit && ` — Commit: ${versionInfo.gitCommit}`}
            </p>
          </div>

          {/* Developer */}
          <div
            className="rounded-lg border p-3 text-center"
            style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
          >
            <p className="text-xs" style={{ color: 'var(--upas-text-secondary)' }}>المطور</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--upas-text-primary)' }}>
              المهندس الاستشاري بشار السليمان
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
              Consulting Engineer Bashar Al-Sulaiman
            </p>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs leading-relaxed text-center" style={{ color: 'var(--upas-text-secondary)' }}>
              يتخصص البرنامج في تحليل وتصميم المنشآت الخرسانية المحصنة ضد الانفجارات، ويعتمد على معايير
              UFC، TM 5-1300، ACI 318، Biggs SDOF وغيرها من المراجع الهندسية المعتمدة دولياً.
            </p>
          </div>

          {/* Technology */}
          <div>
            <p className="text-xs font-bold mb-2 text-center" style={{ color: 'var(--upas-text-primary)' }}>
              التقنيات المستخدمة
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {techStack.map((tech) => (
                <span
                  key={tech.name}
                  className="text-[11px] px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: 'var(--upas-bg-secondary)', color: 'var(--upas-text-primary)' }}
                >
                  {tech.name} {tech.version}
                </span>
              ))}
            </div>
          </div>

          {/* Engineering Modules */}
          <div>
            <p className="text-xs font-bold mb-2 text-center" style={{ color: 'var(--upas-text-primary)' }}>
              الوحدات الهندسية
            </p>
            <div className="grid grid-cols-2 gap-2">
              {modules.map((mod) => (
                <div
                  key={mod.labelEn}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2"
                  style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
                >
                  <span className="text-sm">{mod.icon}</span>
                  <div>
                    <p className="text-xs font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                      {mod.labelAr}
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--upas-text-secondary)' }}>
                      {mod.labelEn}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center pt-2 border-t" style={{ borderColor: 'var(--upas-border)' }}>
            <p className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
              &copy; Bashar Al-Sulaiman
            </p>
            <p className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
              All Rights Reserved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── License Modal ─────────────────────────────────────────────────────

function LicenseModal({ onClose }: { onClose: () => void }) {
  const licenses = [
    {
      library: 'React',
      license: 'MIT',
      copyright: 'Meta Platforms, Inc.',
    },
    {
      library: 'TypeScript',
      license: 'Apache-2.0',
      copyright: 'Microsoft Corporation',
    },
    {
      library: 'Vite',
      license: 'MIT',
      copyright: 'Evan You & Vite Contributors',
    },
    {
      library: 'Zustand',
      license: 'MIT',
      copyright: 'pmndrs',
    },
    {
      library: 'Three.js',
      license: 'MIT',
      copyright: 'mrdoob & Three.js Contributors',
    },
    {
      library: 'React Three Fiber',
      license: 'MIT',
      copyright: 'pmndrs',
    },
    {
      library: 'React Three Drei',
      license: 'MIT',
      copyright: 'pmndrs',
    },
    {
      library: 'UUID',
      license: 'MIT',
      copyright: 'Robert Kieffer',
    },
    {
      library: 'Vitest',
      license: 'MIT',
      copyright: 'Anthony Fu & Vitest Contributors',
    },
  ];

  const mitLicenses = licenses.filter((l) => l.license === 'MIT');
  const otherLicenses = licenses.filter((l) => l.license !== 'MIT');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        style={{ backgroundColor: 'var(--upas-bg-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--upas-border)' }}
        >
          <h2 className="text-base font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            التراخيص والشهادات
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            style={{ color: 'var(--upas-text-secondary)' }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
          {/* MIT Licenses */}
          <div>
            <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--upas-text-primary)' }}>
              <InfoIcon />
              مكتبات مفتوحة المصدر — ترخيص MIT
            </h3>
            <div
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: 'var(--upas-border)' }}
            >
              <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
                {mitLicenses.map((lib) => (
                  <div key={lib.library} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                        {lib.library}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
                        {lib.copyright}
                      </p>
                    </div>
                    <span
                      className="text-[11px] font-mono px-2 py-0.5 rounded"
                      style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                    >
                      MIT
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Other Licenses */}
          {otherLicenses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--upas-text-primary)' }}>
                <InfoIcon />
                تراخيص أخرى
              </h3>
              <div
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: 'var(--upas-border)' }}
              >
                <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
                  {otherLicenses.map((lib) => (
                    <div key={lib.library} className="px-4 py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                          {lib.library}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
                          {lib.copyright}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-mono px-2 py-0.5 rounded"
                        style={{ backgroundColor: '#dbeafe', color: '#1e40af' }}
                      >
                        {lib.license}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Third-party notice */}
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
          >
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--upas-text-secondary)' }}>
              هذا البرنامج يستخدم مكتبات برمجية مفتوحة المصدر. جميع حقوق الملكية الفكرية لهذه المكتبات تعود
              لأصحابها. يتم توزيع هذا البرنامج وفقاً لشروط التراخيص المذكورة أعلاه.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Sections ─────────────────────────────────────────────────

function GeneralSection() {
  const language = useSettingsStore((s) => s.language);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const languageLabels: Record<AppLanguage, string> = {
    ar: 'العربية',
    en: 'English',
  };

  return (
    <SectionCard icon={<GlobeIcon />} title="عام">
      <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
        <SettingRow label="لغة البرنامج" description="تغيير لغة واجهة المستخدم فقط">
          <SelectField
            value={language}
            options={(['ar', 'en'] as const)}
            onChange={setLanguage}
            getLabel={(v) => languageLabels[v]}
          />
        </SettingRow>
      </div>
    </SectionCard>
  );
}

function AppearanceSection() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);

  const themeLabels: Record<ThemeMode, string> = {
    light: 'فاتح — Light',
    dark: 'داكن — Dark',
    system: 'النظام — System',
  };

  const themeDescriptions: Record<ThemeMode, string> = {
    light: 'مظهر فاتح ثابت',
    dark: 'مظهر داكن ثابت',
    system: 'يتبع إعدادات النظام',
  };

  return (
    <SectionCard icon={<PaletteIcon />} title="المظهر">
      <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
        {(['light', 'dark', 'system'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setTheme(mode)}
            className="w-full flex items-center justify-between py-3 cursor-pointer group"
          >
            <div className="text-right">
              <p className="text-sm font-medium group-hover:underline" style={{ color: 'var(--upas-text-primary)' }}>
                {themeLabels[mode]}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                {themeDescriptions[mode]}
              </p>
            </div>
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mr-4 transition-colors ${
                theme === mode ? 'border-amber-500 bg-amber-500' : 'border-slate-300'
              }`}
            >
              {theme === mode && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </SectionCard>
  );
}

function StartupSection() {
  const rememberLastProject = useSettingsStore((s) => s.rememberLastProject);
  const openLastProjectOnStartup = useSettingsStore((s) => s.openLastProjectOnStartup);
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const autosaveIntervalSeconds = useSettingsStore((s) => s.autosaveIntervalSeconds);
  const setRememberLastProject = useSettingsStore((s) => s.setRememberLastProject);
  const setOpenLastProjectOnStartup = useSettingsStore((s) => s.setOpenLastProjectOnStartup);
  const setAutosaveEnabled = useSettingsStore((s) => s.setAutosaveEnabled);
  const setAutosaveInterval = useSettingsStore((s) => s.setAutosaveInterval);

  return (
    <SectionCard icon={<RocketIcon />} title="بدء التشغيل">
      <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
        <SettingRow label="تذكر آخر مشروع" description="حفظ المشروع النشط عند الخروج">
          <Toggle checked={rememberLastProject} onChange={setRememberLastProject} />
        </SettingRow>
        <SettingRow label="فتح آخر مشروع عند التشغيل" description="فتح المشروع المحفوظ تلقائياً">
          <Toggle checked={openLastProjectOnStartup} onChange={setOpenLastProjectOnStartup} />
        </SettingRow>
        <SettingRow label="حفظ تلقائي" description="حفظ التغييرات تلقائياً أثناء العمل">
          <Toggle checked={autosaveEnabled} onChange={setAutosaveEnabled} />
        </SettingRow>
        <SettingRow label="مدة الحفظ التلقائي" description="الفترة الزمنية بين عمليات الحفظ">
          <NumberInput
            value={autosaveIntervalSeconds}
            onChange={setAutosaveInterval}
            min={10}
            max={600}
            unit="ثانية"
          />
        </SettingRow>
      </div>
    </SectionCard>
  );
}

function ReportsSection() {
  const report = useSettingsStore((s) => s.report);
  const setReportPreferences = useSettingsStore((s) => s.setReportPreferences);

  return (
    <SectionCard icon={<FileTextIcon />} title="التقارير">
      <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
        <SettingRow label="اسم الجهة" description="يظهر في ترويسة التقرير">
          <TextInput
            value={report.organizationName}
            onChange={(v) => setReportPreferences({ organizationName: v })}
            placeholder="اسم المؤسسة أو الجهة"
          />
        </SettingRow>
        <SettingRow label="اسم المهندس" description="يظهر في توقيع التقرير">
          <TextInput
            value={report.engineerName}
            onChange={(v) => setReportPreferences({ engineerName: v })}
            placeholder="الاسم الثلاثي"
          />
        </SettingRow>
        <SettingRow label="تذييل التقرير" description="نص مخصص في أسفل الصفحات">
          <TextInput
            value={report.footerText}
            onChange={(v) => setReportPreferences({ footerText: v })}
            placeholder="نص التذييل"
          />
        </SettingRow>
        <SettingRow label="إظهار رقم الصفحة" description="ترقيم صفحات التقرير">
          <Toggle
            checked={report.showPageNumbers}
            onChange={(v) => setReportPreferences({ showPageNumbers: v })}
          />
        </SettingRow>
        <SettingRow label="إظهار التاريخ" description="إدراج التاريخ في التقرير">
          <Toggle
            checked={report.showDate}
            onChange={(v) => setReportPreferences({ showDate: v })}
          />
        </SettingRow>
      </div>
    </SectionCard>
  );
}

function NotificationsSection() {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const notificationSound = useSettingsStore((s) => s.notificationSound);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const setNotificationSound = useSettingsStore((s) => s.setNotificationSound);

  return (
    <SectionCard icon={<BellIcon />} title="التنبيهات">
      <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
        <SettingRow label="تفعيل التنبيهات" description="عرض إشعارات النظام">
          <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />
        </SettingRow>
        <SettingRow label="أصوات التنبيه" description="تشغيل صوت مع الإشعارات">
          <Toggle checked={notificationSound} onChange={setNotificationSound} />
        </SettingRow>
      </div>
    </SectionCard>
  );
}

function AdvancedSection() {
  const logLevel = useSettingsStore((s) => s.logLevel);
  const debugMode = useSettingsStore((s) => s.debugMode);
  const showDeveloperInfo = useSettingsStore((s) => s.showDeveloperInfo);
  const setLogLevel = useSettingsStore((s) => s.setLogLevel);
  const setDebugMode = useSettingsStore((s) => s.setDebugMode);
  const setShowDeveloperInfo = useSettingsStore((s) => s.setShowDeveloperInfo);

  const logLevelLabels: Record<LogLevel, string> = {
    error: 'أخطاء فقط — Error',
    warn: 'تحذيرات — Warn',
    info: 'معلومات — Info',
    debug: 'تصحيح — Debug',
  };

  return (
    <SectionCard icon={<TerminalIcon />} title="متقدم">
      <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
        <SettingRow label="مستوى السجلات" description="الحد الأدنى لتسجيل الأحداث">
          <SelectField
            value={logLevel}
            options={(['error', 'warn', 'info', 'debug'] as const)}
            onChange={setLogLevel}
            getLabel={(v) => logLevelLabels[v]}
          />
        </SettingRow>
        <SettingRow label="وضع التطوير" description="عرض معلومات إضافية للمطورين">
          <Toggle checked={debugMode} onChange={setDebugMode} />
        </SettingRow>
        <SettingRow label="معلومات المطور" description="عرض بيانات تقنية إضافية في الواجهة">
          <Toggle checked={showDeveloperInfo} onChange={setShowDeveloperInfo} />
        </SettingRow>
      </div>
    </SectionCard>
  );
}

// ─── Main Settings Screen ──────────────────────────────────────────────

export default function SettingsScreen() {
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);
  const versionInfo = getVersionInfo();

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            الإعدادات
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
            تخصيص إعدادات التطبيق والعرض
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLicenses(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
              border transition-colors cursor-pointer hover:bg-slate-50"
            style={{
              borderColor: 'var(--upas-border)',
              color: 'var(--upas-text-secondary)',
            }}
          >
            التراخيص
          </button>
          <button
            onClick={() => setShowAbout(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
              transition-colors cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: 'var(--upas-primary)',
              color: 'white',
            }}
          >
            حول البرنامج
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GeneralSection />
        <AppearanceSection />
        <StartupSection />
        <NotificationsSection />
        <ReportsSection />
        <AdvancedSection />
      </div>

      {/* Footer Actions */}
      <div
        className="flex items-center justify-between rounded-xl border px-5 py-4"
        style={{
          backgroundColor: 'var(--upas-bg-card)',
          borderColor: 'var(--upas-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
            UPAS v{versionInfo.version}
          </span>
        </div>
        <button
          onClick={resetToDefaults}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
            border transition-colors cursor-pointer hover:bg-red-50 hover:border-red-300
            hover:text-red-600"
          style={{
            borderColor: 'var(--upas-border)',
            color: 'var(--upas-text-secondary)',
          }}
        >
          <ResetIcon />
          استعادة الافتراضي
        </button>
      </div>

      {/* Modals */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showLicenses && <LicenseModal onClose={() => setShowLicenses(false)} />}
    </div>
  );
}