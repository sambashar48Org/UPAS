import { useEffect, useRef } from 'react';
import { useProjectStore } from '../../../stores/projectStore';
import { useUIStore } from '../../../stores/uiStore';
import { createStructure } from '../../../models/Structure';
import { createSoilProfile, createSoilLayer } from '../../../models/Soil';
import { StructureType } from '../../../types';
import EngineeringScene from '../../../engine/scene/EngineeringScene';
import CameraToolbar from '../../ui/CameraToolbar';
import SectionViewControls from '../../ui/SectionViewControls';
import VisualizationModeControls from '../../ui/VisualizationModeControls';
import PropertiesPanel from '../../ui/PropertiesPanel';
import ObjectTree from '../../ui/ObjectTree';

export default function AnalysisView() {
  const currentProject = useProjectStore((s) => s.currentProject);
  const structure = useProjectStore((s) => s.structure);
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const setStructure = useProjectStore((s) => s.setStructure);
  const setSoilProfile = useProjectStore((s) => s.setSoilProfile);
  const sceneFPS = useUIStore((s) => s.sceneFPS);
  const visualizationMode = useUIStore((s) => s.visualizationMode);

  const demoProjectId = useRef<string | null>(null);

  // Seed demo data when project exists but no structure/soil
  useEffect(() => {
    if (!currentProject) return;
    if (structure || soilProfile) return;
    if (demoProjectId.current === currentProject.id) return;

    demoProjectId.current = currentProject.id;

    const demoStructure = createStructure({
      projectId: currentProject.id,
      name: 'ملجأ تحت أرضي تجريبي',
      type: StructureType.Box,
      length: { value: 8, unit: 'm' },
      width: { value: 5, unit: 'm' },
      height: { value: 3.5, unit: 'm' },
      wallThickness: { value: 0.35, unit: 'm' },
      roofThickness: { value: 0.40, unit: 'm' },
      floorThickness: { value: 0.35, unit: 'm' },
      burialDepth: { value: 3, unit: 'm' },
    });
    setStructure(demoStructure);

    const layer0 = createSoilLayer({ name: 'رمل مفكوك', soilTypeRef: 'sand_loose', topElevation: { value: 0, unit: 'm' }, thickness: { value: 1.5, unit: 'm' } }, 0);
    const layer1 = createSoilLayer({ name: 'طين رخو', soilTypeRef: 'clay_soft', topElevation: { value: -1.5, unit: 'm' }, thickness: { value: 2.5, unit: 'm' } }, 1);
    const layer2 = createSoilLayer({ name: 'رمل متوسط', soilTypeRef: 'sand_medium', topElevation: { value: -4, unit: 'm' }, thickness: { value: 3, unit: 'm' } }, 2);
    const layer3 = createSoilLayer({ name: 'صخر متآكل', soilTypeRef: 'rock_weathered', topElevation: { value: -7, unit: 'm' }, thickness: { value: 4, unit: 'm' } }, 3);

    const demoSoil = createSoilProfile({
      projectId: currentProject.id,
      name: 'ملف تربة تجريبي',
      layers: [layer0, layer1, layer2, layer3],
      waterTableDepth: { value: -3, unit: 'm' },
      totalDepth: { value: 11, unit: 'm' },
    });
    setSoilProfile(demoSoil);
  }, [currentProject, structure, soilProfile, setStructure, setSoilProfile]);

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

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* ─── Top toolbar ──────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b shrink-0"
        style={{
          backgroundColor: 'var(--upas-bg-card)',
          borderColor: 'var(--upas-border)',
        }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold" style={{ color: 'var(--upas-text-primary)' }}>
            التحليل
          </h1>
          <span className="text-xs" style={{ color: 'var(--upas-text-secondary)' }}>
            {currentProject.name}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--upas-text-secondary)' }}>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              backgroundColor: visualizationMode === 'surface' ? '#10b981' :
                visualizationMode === 'cutaway' ? '#f59e0b' :
                visualizationMode === 'xray' ? '#8b5cf6' : 'transparent',
              color: visualizationMode !== 'normal' ? '#fff' : undefined,
            }}
          >
            {visualizationMode === 'normal' ? 'عادي' :
             visualizationMode === 'surface' ? 'سطح' :
             visualizationMode === 'cutaway' ? 'مقطع' :
             visualizationMode === 'xray' ? 'أشعة سينية' : ''}
          </span>
          <span>{sceneFPS} إطار/ث</span>
        </div>
      </div>

      {/* ─── Main workspace ──────────────────────────── */}
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

        {/* Properties panel (right side in RTL) */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}