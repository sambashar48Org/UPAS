/**
 * UPAS — About Screen (Full Page)
 * Phase 5D: Professional about page accessible from sidebar
 */

import { getVersionInfo } from '../../../services/version';

const modules = [
  { labelAr: 'تحليل الانفجارات', labelEn: 'Blast Analysis', color: '#ef4444', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  )},
  { labelAr: 'صدمة الأرض', labelEn: 'Ground Shock', color: '#3b82f6', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
    </svg>
  )},
  { labelAr: 'الاستجابة الإنشائية', labelEn: 'Structural Response', color: '#8b5cf6', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 6v12" />
      <path d="M2 12h20" />
    </svg>
  )},
  { labelAr: 'التصميم الإنشائي', labelEn: 'Structural Design', color: '#f59e0b', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )},
  { labelAr: 'التحقق', labelEn: 'Verification', color: '#10b981', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )},
  { labelAr: 'التقرير الهندسي', labelEn: 'Engineering Report', color: '#06b6d4', icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )},
];

export default function AboutScreen() {
  const versionInfo = getVersionInfo();

  const techStack = [
    { name: 'React', desc: 'واجهة المستخدم' },
    { name: 'TypeScript', desc: 'لغة البرمجة' },
    { name: 'Vite', desc: 'أداة البناء' },
    { name: 'Zustand', desc: 'إدارة الحالة' },
    { name: 'Three.js', desc: 'المحرك ثلاثي الأبعاد' },
    { name: 'Tailwind CSS', desc: 'التنسيق' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-8">
      {/* App Identity Card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{ backgroundColor: 'var(--upas-bg-card)', borderColor: 'var(--upas-border)' }}
      >
        {/* Hero Section */}
        <div
          className="px-8 py-10 text-center"
          style={{ background: 'linear-gradient(135deg, var(--upas-primary) 0%, var(--upas-primary-light) 100%)' }}
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20h20" />
              <path d="M5 20V8l7-5 7 5v12" />
              <path d="M9 20v-6h6v6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">UPAS</h1>
          <p className="text-slate-300 text-sm mt-1">Underground Protective Analysis System</p>
          <p className="text-slate-300 text-sm">نظام تحليل المنشآت المحصنة تحت الأرض</p>
        </div>

        {/* Version Badge */}
        <div className="px-8 py-4 text-center border-b" style={{ borderColor: 'var(--upas-border)' }}>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-2 text-sm font-bold px-4 py-1.5 rounded-full"
              style={{ backgroundColor: 'var(--upas-bg-secondary)', color: 'var(--upas-text-primary)' }}
            >
              v{versionInfo.version}
              <span className="text-xs font-normal" style={{ color: 'var(--upas-text-secondary)' }}>
                — Build {versionInfo.buildDate}
              </span>
            </span>
            {versionInfo.releaseCandidate && (
              <span
                className="inline-flex items-center text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
              >
                Release Candidate
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {/* Developer */}
          <div className="text-center">
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--upas-text-secondary)' }}>
              المطور
            </p>
            <p className="text-base font-bold" style={{ color: 'var(--upas-text-primary)' }}>
              المهندس الاستشاري بشار السليمان
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
              Consulting Engineer Bashar Al-Sulaiman
            </p>
          </div>

          {/* Description */}
          <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--upas-text-secondary)' }}>
            يتخصص البرنامج في تحليل وتصميم المنشآت الخرسانية المحصنة ضد الانفجارات، ويعتمد على معايير
            UFC، TM 5-1300، ACI 318، Biggs SDOF وغيرها من المراجع الهندسية المعتمدة دولياً.
            يوفر البرنامج محرك حسابات دقيق ومتكامل يشمل تحليل الانفجارات وصدمة الأرض
            والاستجابة الديناميكية والتصميم الإنشائي والتحقق من المعايير.
          </p>

          {/* Engineering Modules Grid */}
          <div>
            <p className="text-xs font-bold mb-3 text-center" style={{ color: 'var(--upas-text-primary)' }}>
              الوحدات الهندسية
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
              {modules.map((mod) => (
                <div
                  key={mod.labelEn}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${mod.color}15`, color: mod.color }}
                  >
                    {mod.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--upas-text-primary)' }}>
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

          {/* Technology */}
          <div>
            <p className="text-xs font-bold mb-3 text-center" style={{ color: 'var(--upas-text-primary)' }}>
              التقنيات المستخدمة
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {techStack.map((tech) => (
                <div
                  key={tech.name}
                  className="flex flex-col items-center rounded-xl border px-4 py-2.5 min-w-[90px]"
                  style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--upas-text-primary)' }}>
                    {tech.name}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--upas-text-secondary)' }}>
                    {tech.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Standards */}
          <div>
            <p className="text-xs font-bold mb-3 text-center" style={{ color: 'var(--upas-text-primary)' }}>
              المراجع الهندسية
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['UFC 3-340-02', 'TM 5-1300', 'TM 5-855-1', 'ACI 318-19', 'Biggs SDOF', 'NDRC'].map((std) => (
                <span
                  key={std}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-medium"
                  style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}
                >
                  {std}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright Footer */}
        <div
          className="px-8 py-4 text-center border-t"
          style={{ borderColor: 'var(--upas-border)', backgroundColor: 'var(--upas-bg-primary)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--upas-text-secondary)' }}>
            &copy; Bashar Al-Sulaiman — All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}