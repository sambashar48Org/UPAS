import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/screens/Dashboard';
import NewProject from './components/screens/NewProject';
import AnalysisView from './components/screens/AnalysisView';
import DatabaseView from './components/screens/DatabaseView';
import SettingsScreen from './components/screens/Settings';
import AboutScreen from './components/screens/About';
import { useUIStore } from './stores/uiStore';



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

  return <AppLayout>{renderView()}</AppLayout>;
}