/**
 * UPAS — Validation Utilities
 * Shared helpers for building validators
 */

import type { ValidationResult } from '../types';

export function createValidationResult(): ValidationResult {
  return { isValid: true, errors: [], warnings: [] };
}

export function addError(
  result: ValidationResult,
  field: string,
  message: string,
  code: string
): void {
  result.isValid = false;
  result.errors.push({ field, message, code });
}

export function addWarning(
  result: ValidationResult,
  field: string,
  message: string,
  code: string
): void {
  result.warnings.push({ field, message, code });
}