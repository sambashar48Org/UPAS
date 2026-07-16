import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/screens/Dashboard';
import NewProject from './components/screens/NewProject';
import AnalysisView from './components/screens/AnalysisView';
import { useUIStore } from './stores/uiStore';

function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: 'var(--upas-bg-secondary)' }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--upas-text-secondary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </div>
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--upas-text-primary)' }}>
        {title}
      </h2>
      <p className="text-sm max-w-sm" style={{ color: 'var(--upas-text-secondary)' }}>
        {description}
      </p>
    </div>
  );
}

export default function App() {
  const activeView = useUIStore((s) => s.activeView);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'new-project':
        return <NewProject />;
      case 'project-setup':
        return (
          <PlaceholderScreen
            title="إعداد المشروع"
            description="هذه الشاشة قيد التطوير — ستتوفر قريباً"
          />
        );
      case 'analysis':
        return <AnalysisView />;
      case 'results':
        return (
          <PlaceholderScreen
            title="النتائج"
            description="هذه الشاشة قيد التطوير — ستتوفر بعد إكمال التحليل"
          />
        );
      case 'settings':
        return (
          <PlaceholderScreen
            title="الإعدادات"
            description="هذه الشاشة قيد التطوير — ستتوفر قريباً"
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return <AppLayout>{renderView()}</AppLayout>;
}