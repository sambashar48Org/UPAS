import { Component, type ReactNode, type ErrorInfo } from 'react';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/screens/Dashboard';
import NewProject from './components/screens/NewProject';
import AnalysisView from './components/screens/AnalysisView';
import DatabaseView from './components/screens/DatabaseView';
import SettingsScreen from './components/screens/Settings';
import AboutScreen from './components/screens/About';
import { useUIStore } from './stores/uiStore';

// ─── Error Boundary ─────────────────────────────────────────────
// Prevents any component crash from blanking the entire app
interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; error: Error | null }
class AppErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[UPAS ErrorBoundary]', error, info.componentStack);
  }
  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    useUIStore.getState().setActiveView('dashboard');
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: 'var(--upas-bg-primary)' }}>
          <div className="text-center max-w-md px-6">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--upas-text-primary)' }}>حدث خطأ غير متوقع</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--upas-text-secondary)' }}>
              {this.state.error?.message || 'خطأ داخلي في التطبيق'}
            </p>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--upas-accent, #3b82f6)' }}
            >
              العودة للوحة التحكم
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


export default function App() {
  const activeView = useUIStore((s) => s.activeView);

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'new-project':
        return <NewProject />;
      case 'analysis':
        return <AnalysisView />;
      case 'results':
        // Results are shown inside AnalysisView tab — redirect there
        return <AnalysisView />;
      case 'settings':
        return <SettingsScreen />;
      case 'about':
        return <AboutScreen />;
      case 'database':
        return <DatabaseView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppErrorBoundary>
      <AppLayout>{renderView()}</AppLayout>
    </AppErrorBoundary>
  );
}