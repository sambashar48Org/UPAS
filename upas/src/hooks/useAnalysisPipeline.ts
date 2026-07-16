/**
 * UPAS — useAnalysisPipeline Hook
 * Sprint 3B: Thin React wrapper around AnalysisPipeline service.
 *
 * Architecture Rule: NO engineering logic here.
 * This hook ONLY bridges React state ↔ AnalysisPipeline service.
 */

import { useCallback } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { executeAnalysis } from '../services/analysis';
import type { PipelineResult } from '../services/analysis';

export function useAnalysisPipeline() {
  const project = useProjectStore((s) => s.currentProject);
  const soilProfile = useProjectStore((s) => s.soilProfile);
  const structure = useProjectStore((s) => s.structure);
  const threats = useProjectStore((s) => s.threats);
  const bombs = useProjectStore((s) => s.bombs);
  const setIsAnalyzing = useProjectStore((s) => s.setIsAnalyzing);
  const setLastFullResult = useProjectStore((s) => s.setLastFullResult);
  const setLastReport = useProjectStore((s) => s.setLastReport);
  const setAnalysisError = useProjectStore((s) => s.setAnalysisError);
  const addAnalysisResult = useProjectStore((s) => s.addAnalysisResult);
  const setAnalysisTab = useUIStore((s) => s.setAnalysisTab);
  const toggleThreatObject = useUIStore((s) => s.toggleThreatObject);
  const toggleDamageZones = useUIStore((s) => s.toggleDamageZones);
  const addNotification = useUIStore((s) => s.addNotification);

  const runAnalysis = useCallback(async (): Promise<PipelineResult> => {
    // Pre-checks
    if (!project || !soilProfile || !structure) {
      const msg = 'بيانات غير مكتملة: يتطلب مشروع + تربة + منشأ';
      setAnalysisError(msg);
      addNotification(msg, 'error');
      return { success: false, fullResult: null, domainResult: null, report: null, errors: [msg], validationErrors: [] };
    }

    const threat = threats[0];
    const bomb = bombs[0];
    if (!threat || !bomb) {
      const msg = 'بيانات غير مكتملة: يتطلب تهديد + متفجرات';
      setAnalysisError(msg);
      addNotification(msg, 'error');
      return { success: false, fullResult: null, domainResult: null, report: null, errors: [msg], validationErrors: [] };
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // Use setTimeout to allow UI to update before heavy computation
      const result = await new Promise<PipelineResult>((resolve) => {
        setTimeout(() => {
          resolve(executeAnalysis({ project, soilProfile, structure, threat, bomb }));
        }, 50);
      });

      if (result.success && result.fullResult && result.domainResult && result.report) {
        setLastFullResult(result.fullResult);
        setLastReport(result.report);
        addAnalysisResult(result.domainResult);
        setAnalysisTab('results');
        toggleThreatObject(); // enable threat visualization
        toggleDamageZones(); // enable damage zones
        addNotification('تم التحليل بنجاح', 'success');
      } else {
        const errorMsg = result.errors.join('. ');
        setAnalysisError(errorMsg);
        addNotification(errorMsg, 'error');
      }

      return result;
    } catch (err) {
      const msg = `خطأ غير متوقع: ${err instanceof Error ? err.message : String(err)}`;
      setAnalysisError(msg);
      addNotification(msg, 'error');
      return { success: false, fullResult: null, domainResult: null, report: null, errors: [msg], validationErrors: [] };
    } finally {
      setIsAnalyzing(false);
    }
  }, [project, soilProfile, structure, threats, bombs, setIsAnalyzing, setLastFullResult, setLastReport, setAnalysisError, addAnalysisResult, setAnalysisTab, toggleThreatObject, toggleDamageZones, addNotification]);

  return { runAnalysis };
}