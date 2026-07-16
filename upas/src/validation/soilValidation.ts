/**
 * UPAS — Soil Validator
 * Validates SoilProfile and SoilLayer data integrity
 * Independent layer: no React dependencies
 */

import type { SoilProfile, SoilLayer } from '../models/Soil';
import type { ValidationResult } from '../types';
import { createValidationResult, addError, addWarning } from './helpers';

export function validateSoilProfile(profile: SoilProfile): ValidationResult {
  const result = createValidationResult();

  // Profile basics
  if (!profile.name || profile.name.trim().length === 0) {
    addError(result, 'name', 'اسم ملف التربة مطلوب', 'SOIL_PROFILE_NAME_EMPTY');
  }

  // At least one layer
  if (!profile.layers || profile.layers.length === 0) {
    addError(result, 'layers', 'يجب أن يحتوي ملف التربة على طبقة واحدة على الأقل', 'SOIL_LAYERS_EMPTY');
    return result;
  }

  // Validate each layer
  profile.layers.forEach((layer, index) => {
    const layerResult = validateSoilLayer(layer);
    layerResult.errors.forEach((e) =>
      addError(result, `layers[${index}].${e.field}`, e.message, e.code)
    );
    layerResult.warnings.forEach((w) =>
      addWarning(result, `layers[${index}].${w.field}`, w.message, w.code)
    );
  });

  // Check for gaps/overlaps in layers (warning only for Sprint 1)
  if (profile.layers.length > 1) {
    for (let i = 1; i < profile.layers.length; i++) {
      const prev = profile.layers[i - 1]!;
      const curr = profile.layers[i]!;
      const prevBottom = (prev.topElevation.value as number) - (prev.thickness.value as number);
      if (Math.abs(prevBottom - (curr.topElevation.value as number)) > 0.001) {
        addWarning(
          result,
          `layers[${i}].topElevation`,
          'قد يكون هناك فجوة أو تداخل بين الطبقات',
          'SOIL_LAYER_GAP'
        );
      }
    }
  }

  return result;
}

export function validateSoilLayer(layer: SoilLayer): ValidationResult {
  const result = createValidationResult();

  if (!layer.name || layer.name.trim().length === 0) {
    addError(result, 'name', 'اسم الطبقة مطلوب', 'SOIL_LAYER_NAME_EMPTY');
  }

  if (!layer.soilTypeRef || layer.soilTypeRef.trim().length === 0) {
    addError(result, 'soilTypeRef', 'نوع التربة مطلوب', 'SOIL_TYPE_EMPTY');
  }

  if (layer.thickness.value === undefined || (layer.thickness.value as number) <= 0) {
    addError(result, 'thickness', 'سماكة الطبقة يجب أن تكون قيمة موجبة', 'SOIL_THICKNESS_INVALID');
  }

  return result;
}