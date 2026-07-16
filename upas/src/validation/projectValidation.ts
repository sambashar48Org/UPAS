/**
 * UPAS — Project Validator
 * Validates Project model data integrity
 * Independent layer: no React dependencies
 */

import type { Project } from '../models/Project';
import type { ValidationResult } from '../types';
import { createValidationResult, addError, addWarning } from './helpers';

export function validateProject(project: Project): ValidationResult {
  const result = createValidationResult();

  // Name
  if (!project.name || project.name.trim().length === 0) {
    addError(result, 'name', 'اسم المشروع مطلوب', 'PROJECT_NAME_EMPTY');
  } else if (project.name.trim().length < 3) {
    addWarning(result, 'name', 'اسم المشروع قصير جداً', 'PROJECT_NAME_SHORT');
  }

  // ID
  if (!project.id || project.id.trim().length === 0) {
    addError(result, 'id', 'معرف المشروع مطلوب', 'PROJECT_ID_EMPTY');
  }

  // Version info
  if (!project.version) {
    addError(result, 'version', 'معلومات الإصدار مطلوبة', 'PROJECT_VERSION_MISSING');
  } else {
    if (!project.version.version) {
      addError(result, 'version.version', 'رقم الإصدار مطلوب', 'VERSION_NUMBER_MISSING');
    }
    if (!project.version.createdWith) {
      addWarning(result, 'version.createdWith', 'معلومات أداة الإنشاء مفقودة', 'VERSION_TOOL_MISSING');
    }
  }

  // Ground level
  if (!project.groundLevel || project.groundLevel.value === undefined) {
    addError(result, 'groundLevel', 'مستوى سطح الأرض مطلوب', 'GROUND_LEVEL_MISSING');
  }

  // Status
  const validStatuses = ['draft', 'in_progress', 'completed', 'archived'];
  if (!validStatuses.includes(project.status)) {
    addError(result, 'status', 'حالة المشروع غير صالحة', 'PROJECT_STATUS_INVALID');
  }

  return result;
}