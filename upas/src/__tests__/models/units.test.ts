/**
 * UPAS — Unit Conversion Tests
 * Sprint 1: Verify engineering unit system
 */

import { describe, it, expect } from 'vitest';
import { convertUnit, convertRaw, ev, toUnit, formatEngineeringValue, areEqual } from '../../utils/units';

describe('Unit Conversion', () => {
  describe('Length conversions', () => {
    it('should convert mm to m', () => {
      expect(convertRaw(1000, 'mm', 'm')).toBeCloseTo(1, 5);
    });

    it('should convert m to mm', () => {
      expect(convertRaw(1, 'm', 'mm')).toBeCloseTo(1000, 5);
    });

    it('should convert ft to m', () => {
      expect(convertRaw(10, 'ft', 'm')).toBeCloseTo(3.048, 3);
    });

    it('should convert in to mm', () => {
      expect(convertRaw(1, 'in', 'mm')).toBeCloseTo(25.4, 1);
    });

    it('should return same value for same unit', () => {
      expect(convertRaw(5, 'm', 'm')).toBe(5);
    });
  });

  describe('Mass conversions', () => {
    it('should convert kg to lb', () => {
      expect(convertRaw(1, 'kg', 'lb')).toBeCloseTo(2.20462, 3);
    });

    it('should convert ton to kg', () => {
      expect(convertRaw(1, 'ton', 'kg')).toBeCloseTo(1000, 0);
    });
  });

  describe('Pressure conversions', () => {
    it('should convert MPa to kPa', () => {
      expect(convertRaw(1, 'MPa', 'kPa')).toBeCloseTo(1000, 0);
    });

    it('should convert GPa to MPa', () => {
      expect(convertRaw(1, 'GPa', 'MPa')).toBeCloseTo(1000, 0);
    });

    it('should convert psi to kPa', () => {
      expect(convertRaw(145.037, 'psi', 'kPa')).toBeCloseTo(1000, 0);
    });
  });

  describe('Incompatible units', () => {
    it('should return null for incompatible units', () => {
      expect(convertRaw(10, 'm', 'kg')).toBeNull();
      expect(convertRaw(5, 'kPa', 'mm')).toBeNull();
    });

    it('should return null for unknown units', () => {
      expect(convertRaw(10, 'xyz', 'm')).toBeNull();
    });
  });
});

describe('EngineeringValue helpers', () => {
  it('ev() should create value+unit objects', () => {
    const v = ev(100, 'kg');
    expect(v).toEqual({ value: 100, unit: 'kg' });
  });

  it('convertUnit() should convert and return new object', () => {
    const result = convertUnit(ev(1000, 'mm'), 'm');
    expect(result).toEqual({ value: 1, unit: 'm' });
  });

  it('convertUnit() should return null for incompatible units', () => {
    const result = convertUnit(ev(10, 'm'), 'kg');
    expect(result).toBeNull();
  });

  it('toUnit() should extract numeric value', () => {
    expect(toUnit(ev(1, 'ft'), 'm')).toBeCloseTo(0.3048, 3);
  });

  it('formatEngineeringValue() should format with decimals', () => {
    expect(formatEngineeringValue(ev(3.14159, 'm'), 2)).toBe('3.14 m');
    expect(formatEngineeringValue(ev(100, 'kg'))).toBe('100.00 kg');
  });

  it('areEqual() should compare values', () => {
    expect(areEqual(ev(1000, 'mm'), ev(1, 'm'))).toBe(true);
    expect(areEqual(ev(1000, 'mm'), ev(2, 'm'))).toBe(false);
    expect(areEqual(ev(5, 'm'), ev(5, 'm'))).toBe(true);
  });
});