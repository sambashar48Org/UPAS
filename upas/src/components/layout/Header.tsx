import { useUIStore, type AppView } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';

const viewLabels: Record<AppView, string> = {
  dashboard: 'لوحة التحكم',
  'new-project': 'مشروع جديد',
  'project-setup': 'إعداد المشروع',
  analysis: 'التحليل',
  results: 'النتائج',
  settings: 'الإعدادات',
  about: 'حول البرنامج',
  database: 'قاعدة البيانات',
};

const GearIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export default function Header() {
  const activeView = useUIStore((s) => s.activeView);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const currentProject = useProjectStore((s) => s.currentProject);

  return (
    <header
      className="flex items-center justify-between border-b shrink-0 px-6"
      style={{
        height: 'var(--upas-header-height)',
        backgroundColor: 'var(--upas-bg-card)',
        borderColor: 'var(--upas-border)',
      }}
    >
      {/* Right side: Project name + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {currentProject && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium truncate max-w-48"
            style={{
              backgroundColor: 'var(--upas-accent)',
              color: '#fff',
            }}
          >
            {currentProject.name}
          </span>
        )}
        <nav className="flex items-center gap-2 text-sm" aria-label="مسار التنقل">
          <span style={{ color: 'var(--upas-text-secondary)' }}>UPAS</span>
          <span style={{ color: 'var(--upas-border)' }}>/</span>
          <span className="font-medium" style={{ color: 'var(--upas-text-primary)' }}>
            {viewLabels[activeView]}
          </span>
        </nav>
      </div>

      {/* Left side: Settings button */}
      <button
        onClick={() => setActiveView('settings')}
        className="p-2 rounded-lg transition-colors duration-150 cursor-pointer hover:bg-slate-100"
        style={{ color: 'var(--upas-text-secondary)' }}
        title="الإعدادات"
        aria-label="فتح الإعدادات"
      >
        <GearIcon />
      </button>
    </header>
  );
}