import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';

const stats = [
  {
    key: 'activeProjects',
    label: 'المشاريع النشطة',
    value: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: '#3b82f6',
    bg: '#eff6ff',
  },
  {
    key: 'completedAnalyses',
    label: 'التحليلات المنجزة',
    value: 0,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    key: 'materials',
    label: 'المواد المتاحة',
    value: 7,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" />
      </svg>
    ),
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    key: 'explosives',
    label: 'أنواع المتفجرات',
    value: 7,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
    color: '#ef4444',
    bg: '#fef2f2',
  },
];

export default function Dashboard() {
  const projects = useProjectStore((s) => s.projects);
  const createNewProject = useProjectStore((s) => s.createNewProject);
  const setActiveView = useUIStore((s) => s.setActiveView);

  const handleCreateProject = () => {
    createNewProject();
    setActiveView('new-project');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome Section */}
      <section className="rounded-2xl p-8 text-white relative overflow-hidden"
        style={{ backgroundColor: 'var(--upas-primary)' }}
      >
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-2">مرحباً بك في نظام UPAS</h1>
          <p className="text-slate-200 text-base">
            نظام تحليل الحماية تحت الأرض — تحليل هندسي متقدم للمنشآت تحت الأرض
          </p>
        </div>
        {/* Decorative background element */}
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full opacity-10 -translate-x-1/2 -translate-y-1/2 bg-white" />
        <div className="absolute bottom-0 right-0 w-48 h-48 rounded-full opacity-5 translate-x-1/4 translate-y-1/4 bg-amber-400" />
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const dynamicValue =
            stat.key === 'activeProjects' ? projects.length : stat.value;
          return (
            <div
              key={stat.key}
              className="rounded-xl p-5 border transition-shadow duration-200 hover:shadow-md"
              style={{
                backgroundColor: 'var(--upas-bg-card)',
                borderColor: 'var(--upas-border)',
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium" style={{ color: 'var(--upas-text-secondary)' }}>
                  {stat.label}
                </span>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: stat.bg, color: stat.color }}
                >
                  {stat.icon}
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: 'var(--upas-text-primary)' }}>
                {dynamicValue}
              </p>
            </div>
          );
        })}
      </section>

      {/* Quick Action */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium
            transition-colors duration-200 cursor-pointer text-sm
            hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: 'var(--upas-accent)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          إنشاء مشروع جديد
        </button>
        <span className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          ابدأ بإنشاء مشروع جديد لإجراء تحليل حماية تحت الأرض
        </span>
      </section>
    </div>
  );
}