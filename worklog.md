---
Task ID: 1
Agent: main
Task: Sprint 3D Phase 1 — Wave Propagation + Enhanced Ground Shock

Work Log:
- Created 18 regression tests (numerical toBeCloseTo, NOT snapshots) for 3 soil profiles × 6 functions
- Extended soil-types.json v2 with: relativeDensity, SPT_NValue, dampingRatio, groundShockCoefficients (legacy + enhanced) for all 7 types
- Added Sprint 3D types to calculations/types.ts: WavePropagationResult, EnhancedGroundShockResult, PPVDamageAssessment, SoilAssessment, SoilAssessmentWarning
- Extended SoilLayerInput with 5 new fields (backward compatible)
- Added useEnhancedSoilModel to AnalysisSettingsInput and AnalysisSettings
- Added PPV_DAMAGE_THRESHOLDS and IMPEDANCE_MISMATCH_WARNING_RATIO to constants.ts
- Updated resolveSoilInput() in calculations/index.ts to resolve new JSON properties
- Created wave-propagation.ts: multi-layer travel time, acoustic impedance, transmission coefficients, water table effect
- Created ground-shock-enhanced.ts: path-interpolated K,n coefficients, per-layer PPV decay, damping attenuation
- Created soil-assessment.ts: PPV damage assessment (TM 5-855-1), impedance mismatch warnings, liquefactionPotential: "not_assessed"
- Modified soil/index.ts: delegation branch in calculateSoilStructureInteraction() — legacy path UNCHANGED, enhanced fields populated when useEnhancedSoilModel=true
- Zero modifications to calculations/results/index.ts (per engineer constraint)
- Legacy ground shock coefficients preserved alongside enhanced (nested structure)
- AC-14 integration test: full Input → Calculation → FullAnalysisResult pipeline with useEnhancedSoilModel=true

Stage Summary:
- 165 tests pass (117 original + 18 regression + 30 new)
- TypeScript: zero errors
- Legacy mode: all original results identical (regression tests confirm)
- Enhanced mode: new SSI fields populated (layerTravelTimes, impedanceMismatchLosses, totalImpedanceTransmission, ppvDamageLevel)