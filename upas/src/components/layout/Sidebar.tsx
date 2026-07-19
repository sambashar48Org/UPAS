import { useState } from 'react';
import { useUIStore, type AppView, type DatabaseView } from '../../stores/uiStore';

const DatabaseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

const NewProjectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const AnalysisIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);

const ResultsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const AboutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const CollapseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronDownIcon = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Navigation items ───────────────────────────────────────────────
const navItems: Array<{ view: AppView; label: string; icon: React.ReactNode }> = [
  { view: 'dashboard', label: 'لوحة التحكم', icon: <DashboardIcon /> },
  { view: 'new-project', label: 'مشروع جديد', icon: <NewProjectIcon /> },
  { view: 'analysis', label: 'التحليل', icon: <AnalysisIcon /> },
  { view: 'results', label: 'النتائج', icon: <ResultsIcon /> },
  { view: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
  { view: 'about', label: 'حول البرنامج', icon: <AboutIcon /> },
];

// ─── Database sub-items ─────────────────────────────────────────────
const dbItems: Array<{ view: DatabaseView; label: string }> = [
  { view: 'bombs', label: 'المتفجرات' },
  { view: 'materials', label: 'المواد' },
  { view: 'soil-types', label: 'أنواع التربة' },
  { view: 'structures', label: 'المنشآت' },
  { view: 'standards', label: 'المعايير' },
  { view: 'projects', label: 'المشاريع' },
];

export default function Sidebar() {
  const activeView = useUIStore((s) => s.activeView);
  const databaseView = useUIStore((s) => s.databaseView);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const setDatabaseView = useUIStore((s) => s.setDatabaseView);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  const [dbExpanded, setDbExpanded] = useState(false);

  const handleDbItemClick = (view: DatabaseView) => {
    setDatabaseView(view);
    setActiveView('database');
  };

  const isDbActive = activeView === 'database';

  return (
    <aside
      className="flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out select-none"
      style={{
        width: sidebarOpen ? 'var(--upas-sidebar-width)' : '64px',
        backgroundColor: 'var(--upas-primary)',
      }}
    >
      {/* Logo / Title */}
      <div
        className="flex items-center gap-3 px-4 shrink-0 overflow-hidden"
        style={{ height: 'var(--upas-header-height)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" />
            <path d="M5 20V8l7-5 7 5v12" />
            <path d="M9 20v-6h6v6" />
          </svg>
        </div>
        {sidebarOpen && (
          <div className="flex flex-col min-w-0">
            <span className="text-white font-bold text-sm leading-tight">UPAS</span>
            <span className="text-slate-300 text-[10px] leading-tight truncate">
              نظام تحليل الحماية تحت الأرض
            </span>
          </div>
        )}
      </div>

      <div className="mx-3 border-t border-white/10" />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.view && !isDbActive;
          return (
            <button
              key={item.view}
              onClick={() => {
                setActiveView(item.view);
                if (item.view !== 'database') setDatabaseView(null);
              }}
              className={`
                w-full flex items-center gap-3 rounded-lg text-sm font-medium
                transition-colors duration-150 cursor-pointer
                ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
                ${
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }
              `}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span
                className="shrink-0"
                style={{ color: isActive ? 'var(--upas-accent)' : undefined }}
              >
                {item.icon}
              </span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Divider before Database */}
        <div className="!my-3 mx-1 border-t border-white/10" />

        {/* Database Section */}
        <button
          onClick={() => {
            if (!sidebarOpen) {
              setActiveView('database');
              setDatabaseView('bombs');
            } else {
              setDbExpanded(!dbExpanded);
            }
          }}
          className={`
            w-full flex items-center gap-3 rounded-lg text-sm font-medium
            transition-colors duration-150 cursor-pointer
            ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}
            ${isDbActive ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}
          `}
          title={!sidebarOpen ? 'قاعدة البيانات' : undefined}
        >
          <span className="shrink-0" style={{ color: isDbActive ? 'var(--upas-accent)' : undefined }}>
            <DatabaseIcon />
          </span>
          {sidebarOpen && (
            <>
              <span className="truncate flex-1 text-right">قاعدة البيانات</span>
              <ChevronDownIcon open={dbExpanded} />
            </>
          )}
        </button>

        {/* Database sub-items */}
        {sidebarOpen && dbExpanded && (
          <div className="mr-4 mt-1 space-y-0.5 border-r border-white/20 pr-3">
            {dbItems.map((item) => {
              const isActive = isDbActive && databaseView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => handleDbItemClick(item.view)}
                  className={`
                    w-full text-right rounded-md px-3 py-1.5 text-xs font-medium
                    transition-colors duration-150 cursor-pointer
                    ${isActive
                      ? 'bg-white/15 text-amber-400'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Toggle button */}
      <div className="px-2 pb-3 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-2 rounded-lg
            py-2 text-slate-400 hover:text-white hover:bg-white/10
            transition-colors duration-150 cursor-pointer"
          title={sidebarOpen ? 'طي القائمة' : 'توسيع القائمة'}
        >
          <span className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`}>
            <CollapseIcon />
          </span>
          {sidebarOpen && <span className="text-xs">طي القائمة</span>}
        </button>
      </div>
    </aside>
  );
}