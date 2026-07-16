import { useUIStore, type AppView } from '../../stores/uiStore';

interface NavItem {
  view: AppView;
  label: string;
  icon: React.ReactNode;
}

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

const ProjectSetupIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
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

const CollapseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const navItems: NavItem[] = [
  { view: 'dashboard', label: 'لوحة التحكم', icon: <DashboardIcon /> },
  { view: 'new-project', label: 'مشروع جديد', icon: <NewProjectIcon /> },
  { view: 'project-setup', label: 'إعداد المشروع', icon: <ProjectSetupIcon /> },
  { view: 'analysis', label: 'التحليل', icon: <AnalysisIcon /> },
  { view: 'results', label: 'النتائج', icon: <ResultsIcon /> },
  { view: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
];

export default function Sidebar() {
  const activeView = useUIStore((s) => s.activeView);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  return (
    <aside
      className="flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out"
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

      {/* Divider */}
      <div className="mx-3 border-t border-white/10" />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setActiveView(item.view)}
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
                className={`shrink-0 ${isActive ? 'text-amber-400' : ''}`}
                style={{ color: isActive ? 'var(--upas-accent)' : undefined }}
              >
                {item.icon}
              </span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
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
          <span
            className={`transition-transform duration-300 ${sidebarOpen ? 'rotate-0' : 'rotate-180'}`}
          >
            <CollapseIcon />
          </span>
          {sidebarOpen && <span className="text-xs">طي القائمة</span>}
        </button>
      </div>
    </aside>
  );
}