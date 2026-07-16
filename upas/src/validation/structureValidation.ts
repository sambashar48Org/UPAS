/**
 * UPAS — Structure Validator
 * Validates Structure model data integrity
 * Independent layer: no React dependencies
 */

import type { Structure } from '../models/Structure';
import type { ValidationResult } from '../types';
import { createValidationResult, addError, addWarning } from './helpers';

export function validateStructure(structure: Structure): ValidationResult {
  const result = createValidationResult();

  // Name
  if (!structure.name || structure.name.trim().length === 0) {
    addError(result, 'name', 'اسم المنشأ مطلوب', 'STRUCTURE_NAME_EMPTY');
  }

  // Dimensions — all must be positive
  const dimensions = [
    { field: 'length', ev: structure.length, label: 'الطول' },
    { field: 'width', ev: structure.width, label: 'العرض' },
    { field: 'height', ev: structure.height, label: 'الارتفاع' },
  ];

  for (const dim of dimensions) {
    if (!dim.ev || dim.ev.value === undefined) {
      addError(result, dim.field, `${dim.label} مطلوب`, `STRUCTURE_${dim.field.toUpperCase()}_MISSING`);
    } else if ((dim.ev.value as number) <= 0) {
      addError(result, dim.field, `${dim.label} يجب أن يكون قيمة موجبة`, `STRUCTURE_${dim.field.toUpperCase()}_INVALID`);
    }
  }

  // Thicknesses
  const thicknesses = [
    { field: 'wallThickness', ev: structure.wallThickness, label: 'سماكة الجدار' },
    { field: 'roofThickness', ev: structure.roofThickness, label: 'سماكة السقف' },
    { field: 'floorThickness', ev: structure.floorThickness, label: 'سماكة الأرضية' },
  ];

  for (const t of thicknesses) {
    if (!t.ev || t.ev.value === undefined) {
      addError(result, t.field, `${t.label} مطلوبة`, `STRUCTURE_${t.field.toUpperCase()}_MISSING`);
    } else if ((t.ev.value as number) <= 0) {
      addError(result, t.field, `${t.label} يجب أن تكون قيمة موجبة`, `STRUCTURE_${t.field.toUpperCase()}_INVALID`);
    } else if ((t.ev.value as number) > (structure.height.value as number) / 2) {
      addWarning(result, t.field, `${t.label} كبيرة نسبياً مقارنة بارتفاع المنشأ`, `STRUCTURE_${t.field.toUpperCase()}_EXCESSIVE`);
    }
  }

  // Material references
  const materials = [
    { field: 'wallMaterialRef', ev: structure.wallMaterialRef, label: 'مادة الجدار' },
    { field: 'roofMaterialRef', ev: structure.roofMaterialRef, label: 'مادة السقف' },
    { field: 'floorMaterialRef', ev: structure.floorMaterialRef, label: 'مادة الأرضية' },
  ];

  for (const m of materials) {
    if (!m.ev || m.ev.trim().length === 0) {
      addError(result, m.field, `${m.label} مطلوبة`, `STRUCTURE_${m.field.toUpperCase()}_MISSING`);
    }
  }

  // Burial depth
  if (structure.burialDepth && (structure.burialDepth.value as number) < 0) {
    addWarning(result, 'burialDepth', 'عمق الدفن سلبي — تحقق من القيمة', 'STRUCTURE_BURIAL_NEGATIVE');
  }

  return result;
}