import { useState } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore, type AnalysisTab } from '../../../stores/uiStore';
import EngineeringScene from '../../../engine/scene/EngineeringScene';
import { CutPlaneSlider } from '../../../engine/scene/CutPlane';
import CameraToolbar from '../../ui/CameraToolbar';
import SectionViewControls from '../../ui/SectionViewControls';
import VisualizationModeControls from '../../ui/VisualizationModeControls';
import AnalysisToolbar from '../../ui/AnalysisToolbar';
import PropertiesPanel from '../../ui/PropertiesPanel';
import ObjectTree from '../../ui/ObjectTree';
import InputForm, { InputSubTabs } from '../../ui/InputForm';
import SoilForm from '../../ui/InputForm/SoilForm';
import StructureForm from '../../ui/InputForm/StructureForm';
import ThreatForm from '../../ui/InputForm/ThreatForm';
import DesignCriteriaForm from '../../ui/InputForm/DesignCriteriaForm';
import ResultsPanel from '../../ui/ResultsPanel';
import ReportViewer from '../../ui/ReportViewer';
import ProfessionalReport from '../../ui/ProfessionalReport';

export default function AnalysisView() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const structure = useProjectStore((s) => s.structure);
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const threats = useProjectStore((s) => s.threats);
  const bombs = useProjectStore((s) => s.bombs);
  const setStructure = useProjectStore((s) => s.setStructure);
  const setSoilProfile = useProjectStore((s) => s.setSoilProfile);
  const setThreats = useProjectStore((s) => s.setThreats);
  const setBombs = useProjectStore((s) => s.setBombs);
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);

  const analysisTab = useUIStore((s) => s.analysisTab);
  const sceneFPS = useUIStore((s) => s.sceneFPS);
  const visualizationMode = useUIStore((s) => s.visualizationMode);

  const [inputSubTab, setInputSubTab] = useState<'soil' | 'structure' | 'threat' | 'design'>('soil');

  // NOTE: Demo data is loaded by Dashboard.handleLoadDemo() or user input.
  // AnalysisView does NOT auto-load demo data — it renders whatever is in the store.

  // ─── No project ──────────────────────────────────────────────
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
        <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--upas-text-primary)' }}>
          لا يوجد مشروع محدد
        </h2>
        <p className="text-sm max-w-sm" style={{ color: 'var(--upas-text-secondary)' }}>
          أنشئ مشروعاً جديداً أولاً للبدء في التحليل
        </p>
      </div>
    );
  }

  const hasSceneData = structure || soilProfile;

  // Render the right panel content based on tab
  const renderRightPanel = () => {
    if (analysisTab === 'input') {
      return (
        <div
          className="shrink-0 border-l overflow-hidden flex flex-col"
          style={{ width: 280, minWidth: 280, borderColor: 'var(--upas-border)', position: 'relative', zIndex: 2 }}
        >
          <InputSubTabs active={inputSubTab} onChange={setInputSubTab} />
          <div className="flex-1 overflow-y-auto min-h-0">
            {inputSubTab === 'soil' && <SoilForm />}
            {inputSubTab === 'structure' && <StructureForm />}
            {inputSubTab === 'threat' && <ThreatForm />}
            {inputSubTab === 'design' && <DesignCriteriaForm />}
          </div>
        </div>
      );
    }
    if (analysisTab === 'results') {
      return (
        <div
          className="shrink-0 border-l overflow-hidden"
          style={{ width: 320, minWidth: 320, borderColor: 'var(--upas-border)', position: 'relative', zIndex: 2 }}
        >
          <ResultsPanel />
        </div>
      );
    }
    if (analysisTab === 'report') {
      return (
        <div
          className="shrink-0 border-l overflow-hidden"
          style={{ width: 420, minWidth: 420, borderColor: 'var(--upas-border)', position: 'relative', zIndex: 2 }}
        >
          <ProfessionalReport />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* ─── Analysis Toolbar (Run + Tabs) ──────────────────── */}
      <AnalysisToolbar />

      {/* ─── Main workspace ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">
        {/* Object Tree panel (left side in RTL) */}
        <div
          className="shrink-0 border-l overflow-hidden"
          style={{
            width: 220,
            minWidth: 220,
            borderColor: 'var(--upas-border)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <ObjectTree />
        </div>

        {/* 3D Scene area */}
        <div className="relative flex-1 min-w-0" style={{ zIndex: 1 }}>
          {hasSceneData ? (
            <>
              {/* Toolbars overlaid on the 3D viewport */}
              <CameraToolbar />
              <SectionViewControls />
              <VisualizationModeControls />
              <CutPlaneSlider />

              {/* The 3D canvas */}
              <EngineeringScene className="w-full h-full" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#e8edf3' }}>
              <p className="text-sm" style={{ color: 'var(--upas-text-secondary)' }}>
                أضف منشأ وتربة لعرضها
              </p>
            </div>
          )}
        </div>

        {/* Right panel: Input / Results / Report */}
        {renderRightPanel()}

        {/* Properties panel (far right, always available) */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}