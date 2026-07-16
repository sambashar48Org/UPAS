import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';

import materialsRaw from '../../../data/materials.json';
import bombTypesRaw from '../../../data/bomb-types.json';
import soilTypesRaw from '../../../data/soil-types.json';

const materials = materialsRaw.materials;
const bombTypes = bombTypesRaw.bombTypes;
const soilTypes = soilTypesRaw.soilTypes;

// Soil type color map for visual identification
const soilColorMap: Record<string, string> = {
  sand_loose: '#f5deb3',
  sand_medium: '#daa520',
  sand_dense: '#b8860b',
  clay_soft: '#8b7355',
  clay_stiff: '#6b4423',
  rock_weathered: '#808080',
  rock_sound: '#4a4a4a',
};

export default function Dashboard() {
  const projects = useProjectStore((s) => s.projects);
  const createNewProject = useProjectStore((s) => s.createNewProject);
  const setActiveView = useUIStore((s) => s.setActiveView);
  const setDatabaseView = useUIStore((s) => s.setDatabaseView);

  const handleCreateProject = () => {
    createNewProject();
    setActiveView('new-project');
  };

  const handleOpenProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      useProjectStore.getState().setCurrentProject(project);
      setActiveView('analysis');
    }
  };

  const handleDatabaseClick = (view: 'bombs' | 'materials' | 'soil-types') => {
    setDatabaseView(view);
    setActiveView('database');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with quick action */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            نظام UPAS — تحليل الحماية تحت الأرض
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
            منصة هندسية ثلاثية الأبعاد لتحليل المنشآت تحت الأرض ضد التهديدات الانفجارية
          </p>
        </div>
        <button
          onClick={handleCreateProject}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium
            transition-colors duration-200 cursor-pointer text-sm
            hover:opacity-90 active:scale-[0.98] shrink-0"
          style={{ backgroundColor: 'var(--upas-accent)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          مشروع جديد
        </button>
      </div>

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            المشاريع الأخيرة
          </h2>
          <span className="text-xs" style={{ color: 'var(--upas-text-secondary)' }}>
            {projects.length} مشروع
          </span>
        </div>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--upas-bg-card)', borderColor: 'var(--upas-border)' }}
        >
          {projects.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
                لا توجد مشاريع بعد — أنشئ مشروعك الأول للبدء
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
              {projects.slice(-5).reverse().map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleOpenProject(project.id)}
                  className="w-full text-right px-5 py-3 flex items-center justify-between
                    hover:bg-slate-50 transition-colors duration-100 cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                      {project.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--upas-text-secondary)' }}>
                      {project.location || 'بدون موقع'} — {new Date(project.createdAt).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: project.status === 'draft' ? '#fef3c7' : '#d1fae5',
                      color: project.status === 'draft' ? '#92400e' : '#065f46',
                    }}
                  >
                    {project.status === 'draft' ? 'مسودة' : project.status}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Engineering Data Grid: Materials + Bombs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Materials */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--upas-text-primary)' }}>
              المواد الإنشائية
            </h2>
            <button
              onClick={() => handleDatabaseClick('materials')}
              className="text-xs cursor-pointer hover:underline"
              style={{ color: 'var(--upas-primary)' }}
            >
              عرض الكل
            </button>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--upas-bg-card)', borderColor: 'var(--upas-border)' }}
          >
            <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
              {materials.slice(0, 5).map((mat) => (
                <div key={mat.ref} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: mat.category === 'concrete' ? '#6b7280' : mat.category === 'steel' ? '#3b82f6' : '#a3734c' }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                        {mat.nameAr}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
                        f'c = {mat.compressiveStrength.value} {mat.compressiveStrength.unit}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--upas-bg-secondary)', color: 'var(--upas-text-secondary)' }}>
                    {mat.category === 'concrete' ? 'خرسانة' : mat.category === 'steel' ? 'فولاذ' : 'بناء'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bombs / Explosives */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold" style={{ color: 'var(--upas-text-primary)' }}>
              المتفجرات
            </h2>
            <button
              onClick={() => handleDatabaseClick('bombs')}
              className="text-xs cursor-pointer hover:underline"
              style={{ color: 'var(--upas-primary)' }}
            >
              عرض الكل
            </button>
          </div>
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--upas-bg-card)', borderColor: 'var(--upas-border)' }}
          >
            <div className="divide-y" style={{ borderColor: 'var(--upas-border)' }}>
              {bombTypes.slice(0, 5).map((bomb) => (
                <div key={bomb.ref} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: bomb.tntEquivalentFactor >= 1.3 ? '#ef4444'
                          : bomb.tntEquivalentFactor >= 1.0 ? '#f59e0b'
                          : '#6b7280'
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                        {bomb.nameAr}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--upas-text-secondary)' }}>
                        VOD = {bomb.detonationVelocity.value} {bomb.detonationVelocity.unit}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded" style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}>
                    ×{bomb.tntEquivalentFactor}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Soil Types Strip */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            أنواع التربة
          </h2>
          <button
            onClick={() => handleDatabaseClick('soil-types')}
            className="text-xs cursor-pointer hover:underline"
            style={{ color: 'var(--upas-primary)' }}
          >
            عرض الكل
          </button>
        </div>
        <div className="flex gap-3 flex-wrap">
          {soilTypes.map((soil) => (
            <div
              key={soil.ref}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: 'var(--upas-bg-card)',
                borderColor: 'var(--upas-border)',
              }}
            >
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: soilColorMap[soil.ref] || '#888' }}
              />
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--upas-text-primary)' }}>
                  {soil.nameAr}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--upas-text-secondary)' }}>
                  φ = {soil.frictionAngle.value}° — γ = {soil.unitWeight.value} {soil.unitWeight.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}