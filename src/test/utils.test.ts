import { describe, it, expect } from 'vitest';
import { nanoid } from '../services/nanoid';
import { formatQty, formatRelativeTime, parsePositiveFloat } from '../utils/format';
import type { Unit } from '../types';

// =============================================================================
// nanoid tests
// =============================================================================
describe('nanoid', () => {
  it('generates a string of length 21', () => {
    const id = nanoid();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(21);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => nanoid()));
    expect(ids.size).toBe(100);
  });
});

// =============================================================================
// Format utilities
// =============================================================================
describe('formatQty', () => {
  const cases: [number, Unit, string][] = [
    [10, 'piece', '10 pcs'],
    [1.5, 'kg', '1.5 kg'],
    [0.5, 'litre', '0.5 L'],
    [24, 'dozen', '24 dz'],
    [500, 'g', '500 g'],
    [2, 'bottle', '2 btl'],
    [200, 'ml', '200 ml'],
    [0.001, 'kg', '0.001 kg'],
    [8.5, 'kg', '8.5 kg'], // flour example from spec
  ];

  it.each(cases)('formats %d %s as "%s"', (qty, unit, expected) => {
    expect(formatQty(qty, unit)).toBe(expected);
  });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for 0ms ago', () => {
    expect(formatRelativeTime(Date.now(), 'en')).toBe('Just now');
  });

  it('returns minutes for < 1h', () => {
    const result = formatRelativeTime(Date.now() - 5 * 60_000, 'en');
    expect(result).toContain('m ago');
  });

  it('returns hours for < 24h', () => {
    const result = formatRelativeTime(Date.now() - 2 * 3_600_000, 'en');
    expect(result).toContain('h ago');
  });

  it('returns "Yesterday" for ~1 day ago', () => {
    const result = formatRelativeTime(Date.now() - 25 * 3_600_000, 'en');
    expect(result).toBe('Yesterday');
  });

  it('returns days for > 1 day', () => {
    const result = formatRelativeTime(Date.now() - 3 * 86_400_000, 'en');
    expect(result).toContain('days ago');
  });
});

describe('parsePositiveFloat', () => {
  it('returns parsed value for valid positive numbers', () => {
    expect(parsePositiveFloat('1.5')).toBe(1.5);
    expect(parsePositiveFloat('10')).toBe(10);
    expect(parsePositiveFloat('0.001')).toBe(0.001);
  });

  it('returns null for zero', () => {
    expect(parsePositiveFloat('0')).toBeNull();
  });

  it('returns null for negative', () => {
    expect(parsePositiveFloat('-1')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parsePositiveFloat('abc')).toBeNull();
    expect(parsePositiveFloat('')).toBeNull();
  });
});
