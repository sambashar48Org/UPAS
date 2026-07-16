import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import type { StructurePart } from '../../stores/uiStore';

const TreeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="12" height="12" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
  >
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

const colorDot = (color: string) => (
  <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
);

function TreeNode({
  nodeId,
  icon,
  label,
  sublabel,
  color,
  children,
  defaultExpanded = false,
  onClick,
  isSelected,
}: {
  nodeId: string;
  icon?: React.ReactNode;
  label: string;
  sublabel?: string;
  color?: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const expanded = useUIStore((s) => s.objectTreeExpanded[nodeId] ?? defaultExpanded);
  const toggleNode = useUIStore((s) => s.toggleObjectTreeNode);
  const hasChildren = Boolean(children);

  return (
    <div>
      <div
        onClick={() => {
          if (hasChildren) toggleNode(nodeId);
          onClick?.();
        }}
        className={`
          flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer text-xs
          transition-colors duration-100 select-none
          ${isSelected
            ? 'bg-orange-100 text-orange-800'
            : 'hover:bg-gray-100'
          }
        `}
        style={{ color: isSelected ? undefined : 'var(--upas-text-primary, #1e293b)' }}
      >
        {hasChildren ? (
          <ChevronIcon open={expanded} />
        ) : (
          <span style={{ width: 12 }} />
        )}

        {color && colorDot(color)}

        {icon && <span className="shrink-0" style={{ opacity: 0.5 }}>{icon}</span>}

        <span className="truncate flex-1 font-medium">{label}</span>
        {sublabel && (
          <span className="text-[10px] shrink-0" style={{ color: 'var(--upas-text-secondary, #64748b)' }}>
            {sublabel}
          </span>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="mr-3 border-r pr-2 mt-0.5 mb-0.5 space-y-0.5"
          style={{ borderColor: 'var(--upas-border, #e2e8f0)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function ObjectTree() {
  const structure = useProjectStore((s) => s.structure);
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const threats = useProjectStore((s) => s.threats);
  const bombs = useProjectStore((s) => s.bombs);
  const lastFullResult = useProjectStore((s) => s.lastFullResult);
  const selectedObjectId = useUIStore((s) => s.selectedObjectId);
  const selectedObjectType = useUIStore((s) => s.selectedObjectType);
  const selectedStructurePart = useUIStore((s) => s.selectedStructurePart);
  const setSelectedObject = useUIStore((s) => s.setSelectedObject);
  const setSelectedStructurePart = useUIStore((s) => s.setSelectedStructurePart);

  const handleSelectStructurePart = (part: StructurePart) => {
    if (structure) {
      setSelectedStructurePart(part);
      setSelectedObject(structure.id, 'structure-part');
    }
  };

  const handleSelectSoilLayer = (layerId: string) => {
    setSelectedObject(layerId, 'soil-layer');
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--upas-bg-card)' }}
      dir="rtl"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{ borderColor: 'var(--upas-border)' }}
      >
        <TreeIcon />
        <h3 className="text-xs font-bold" style={{ color: 'var(--upas-text-primary)' }}>
          شجرة الكائنات
        </h3>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {/* Ground Surface */}
        <TreeNode
          nodeId="ground"
          icon={<span style={{ color: '#10b981' }}>━━</span>}
          label="سطح الأرض"
          sublabel="±0.00"
          color="#10b981"
          onClick={() => setSelectedObject(null, null)}
          isSelected={false}
        />

        {/* Soil Layers */}
        <TreeNode
          nodeId="ground-soil"
          icon={<span style={{ color: '#d4a843' }}>▓</span>}
          label="التربة"
          sublabel={soilProfile ? `${soilProfile.layers.length} طبقات` : undefined}
          color="#d4a843"
          defaultExpanded={true}
        >
          {soilProfile?.layers.map((layer) => (
            <TreeNode
              key={layer.id}
              nodeId={`layer-${layer.layerIndex}`}
              label={layer.name}
              sublabel={`${Number(layer.thickness.value)} m`}
              color={
                layer.soilTypeRef.includes('sand') ? '#d4a843' :
                layer.soilTypeRef.includes('clay') ? '#8b7355' :
                layer.soilTypeRef.includes('rock') ? '#808080' : '#a0886c'
              }
              onClick={() => handleSelectSoilLayer(layer.id)}
              isSelected={selectedObjectType === 'soil-layer' && selectedObjectId === layer.id}
            />
          ))}
        </TreeNode>

        {/* Structure */}
        <TreeNode
          nodeId="structure"
          icon={<span style={{ color: '#a8b5c4' }}>◈</span>}
          label={structure?.name ?? 'المنشأ'}
          sublabel={structure ? `${Number(structure.length.value)}×${Number(structure.width.value)}×${Number(structure.height.value)} m` : undefined}
          color="#a8b5c4"
          defaultExpanded={true}
          onClick={() => {
            if (structure) {
              setSelectedStructurePart(null);
              setSelectedObject(structure.id, 'structure');
            }
          }}
          isSelected={(selectedObjectType === 'structure' || selectedObjectType === 'structure-part') && structure && selectedObjectId === structure.id && !selectedStructurePart}
        >
          {structure && (
            <>
              <TreeNode
                nodeId="struct-roof"
                label="السقف"
                sublabel={`${Number(structure.roofThickness.value)} m`}
                color="#f59e0b"
                onClick={() => handleSelectStructurePart('roof')}
                isSelected={selectedStructurePart === 'roof'}
              />
              <TreeNode
                nodeId="struct-walls"
                label="الجدران"
                sublabel={`${Number(structure.wallThickness.value)} m`}
                color="#64748b"
                onClick={() => handleSelectStructurePart('wall')}
                isSelected={selectedStructurePart === 'wall'}
              />
              <TreeNode
                nodeId="struct-floor"
                label="الأرضية"
                sublabel={`${Number(structure.floorThickness.value)} m`}
                color="#475569"
                onClick={() => handleSelectStructurePart('floor')}
                isSelected={selectedStructurePart === 'floor'}
              />
            </>
          )}
        </TreeNode>

        {/* Threat */}
        <TreeNode
          nodeId="threat"
          icon={<span style={{ color: '#ef4444' }}>⚠</span>}
          label="التهديد"
          sublabel={threats[0] ? `${threats[0].name}` : bombs[0] ? `${Number(bombs[0].chargeMass.value)} kg` : 'لم يتم التحديد'}
          color="#ef4444"
          defaultExpanded={false}
        >
          {bombs[0] && (
            <TreeNode
              nodeId="threat-bomb"
              label={bombs[0].name}
              sublabel={`${bombs[0].explosiveTypeRef} — ${Number(bombs[0].chargeMass.value)} kg`}
              color="#fca5a5"
            />
          )}
          {threats[0] && (
            <TreeNode
              nodeId="threat-info"
              label="المسافة"
              sublabel={`${Number(threats[0].standoffDistance.value)} m — ${threats[0].detonationType}`}
              color="#fca5a5"
            />
          )}
        </TreeNode>

        {/* Sprint 3C: Analysis Results (shown only when results exist) */}
        {lastFullResult && (
          <TreeNode
            nodeId="analysis-results"
            icon={<span style={{ color: '#7c3aed' }}>≡</span>}
            label="نتائج التحليل"
            sublabel={`SF = ${lastFullResult.overall.minSafetyFactor.toFixed(2)}`}
            color="#7c3aed"
            defaultExpanded={true}
          >
            {/* Protection Level */}
            <TreeNode
              nodeId="result-protection"
              label={lastFullResult.overall.protectionLevel === 'safe' ? 'آمن' :
                     lastFullResult.overall.protectionLevel === 'marginal' ? 'هامشي' :
                     lastFullResult.overall.protectionLevel === 'unsafe' ? 'غير آمن' : 'حرج'}
              sublabel={`العنصر الحاكم: ${lastFullResult.overall.governingElement}`}
              color={lastFullResult.overall.protectionLevel === 'safe' ? '#22c55e' :
                     lastFullResult.overall.protectionLevel === 'marginal' ? '#eab308' :
                     lastFullResult.overall.protectionLevel === 'unsafe' ? '#f97316' : '#dc2626'}
            />
            {/* Element safety factors */}
            {lastFullResult.blast.roofResponse && (
              <TreeNode
                nodeId="result-roof"
                label="السقف"
                sublabel={`SF = ${lastFullResult.blast.roofResponse.safetyFactor.toFixed(2)} — ${lastFullResult.blast.roofResponse.responseMode}`}
                color={lastFullResult.blast.roofResponse.safetyFactor >= 1.5 ? '#22c55e' :
                       lastFullResult.blast.roofResponse.safetyFactor >= 1.2 ? '#eab308' : '#dc2626'}
              />
            )}
            {lastFullResult.blast.wallResponse && (
              <TreeNode
                nodeId="result-wall"
                label="الجدران"
                sublabel={`SF = ${lastFullResult.blast.wallResponse.safetyFactor.toFixed(2)} — ${lastFullResult.blast.wallResponse.responseMode}`}
                color={lastFullResult.blast.wallResponse.safetyFactor >= 1.5 ? '#22c55e' :
                       lastFullResult.blast.wallResponse.safetyFactor >= 1.2 ? '#eab308' : '#dc2626'}
              />
            )}
            {lastFullResult.blast.floorResponse && (
              <TreeNode
                nodeId="result-floor"
                label="الأرضية"
                sublabel={`SF = ${lastFullResult.blast.floorResponse.safetyFactor.toFixed(2)} — ${lastFullResult.blast.floorResponse.responseMode}`}
                color={lastFullResult.blast.floorResponse.safetyFactor >= 1.5 ? '#22c55e' :
                       lastFullResult.blast.floorResponse.safetyFactor >= 1.2 ? '#eab308' : '#dc2626'}
              />
            )}
            {/* Crater info */}
            {lastFullResult.visualization.damageZones.find(dz => dz.type === 'crater') && (
              <TreeNode
                nodeId="result-crater"
                label="الحفرة"
                sublabel={`r = ${lastFullResult.visualization.damageZones.find(dz => dz.type === 'crater')!.radius.toFixed(2)} m`}
                color="#dc2626"
              />
            )}
            {/* Warnings count */}
            {lastFullResult.warnings.length > 0 && (
              <TreeNode
                nodeId="result-warnings"
                label="التحذيرات"
                sublabel={`${lastFullResult.warnings.length} تحذير`}
                color="#f59e0b"
              />
            )}
          </TreeNode>
        )}
      </div>
    </div>
  );
}