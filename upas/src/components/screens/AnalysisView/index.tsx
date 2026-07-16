import { useProjectStore } from '../../../stores/projectStore';

interface AnalysisCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

function AnalysisCard({ title, description, icon, disabled }: AnalysisCardProps) {
  return (
    <div
      className={`
        rounded-xl border p-6 transition-shadow duration-200
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'}
      `}
      style={{
        backgroundColor: 'var(--upas-bg-card)',
        borderColor: 'var(--upas-border)',
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: disabled ? 'var(--upas-bg-secondary)' : 'var(--upas-bg-primary)',
            color: disabled ? 'var(--upas-text-secondary)' : 'var(--upas-primary)',
          }}
        >
          {icon}
        </div>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--upas-bg-secondary)',
            color: 'var(--upas-text-secondary)',
          }}
        >
          قريباً
        </span>
      </div>
      <h3
        className="text-base font-bold mb-1.5"
        style={{ color: 'var(--upas-text-primary)' }}
      >
        {title}
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--upas-text-secondary)' }}
      >
        {description}
      </p>
    </div>
  );
}

const ThreatIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const SoilIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
);

const StructureIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="4" y1="16" x2="20" y2="16" />
  </svg>
);

const PlayIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export default function AnalysisView() {
  const currentProject = useProjectStore((s) => s.currentProject);

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
          style={{ backgroundColor: 'var(--upas-bg-secondary)' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--upas-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2
          className="text-lg font-bold mb-2"
          style={{ color: 'var(--upas-text-primary)' }}
        >
          لا يوجد مشروع محدد
        </h2>
        <p
          className="text-sm max-w-sm"
          style={{ color: 'var(--upas-text-secondary)' }}
        >
          أنشئ مشروعاً جديداً أولاً للبدء في التحليل
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: 'var(--upas-text-primary)' }}
        >
          التحليل
        </h1>
        <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          المشروع: {currentProject.name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <AnalysisCard
          title="إعداد التهديد"
          description="تحديد نوع التهديد، حجم المتفجرات، موقع الانفجار وعمق الدفن"
          icon={<ThreatIcon />}
        />
        <AnalysisCard
          title="ملف التربة"
          description="تعريف طبقات التربة، خصائص الميكانيكية والكثافة والسرعة الموجية"
          icon={<SoilIcon />}
        />
        <AnalysisCard
          title="المنشأ"
          description="تحديد هندسة المنشأ، الأبعاد، المادة، سماكة الجدران والسقف"
          icon={<StructureIcon />}
        />
        <AnalysisCard
          title="بدء التحليل"
          description="تشغيل محرك التحليل وحساب ضغوط الانفجار ومستوى الحماية"
          icon={<PlayIcon />}
          disabled
        />
      </div>

      {/* 3D Scene placeholder */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: 'var(--upas-bg-card)',
          borderColor: 'var(--upas-border)',
          height: '400px',
        }}
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
            عرض ثلاثي الأبعاد — قريباً
          </p>
        </div>
      </div>
    </div>
  );
}