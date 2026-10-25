import { describe, it, expect } from 'vitest';
import { parseVoiceKiranaCommand } from '../services/voiceParser';
import type { Product } from '../types';

describe('Phase 9 — Voice Kirana Command Parser', () => {
  const dummyProducts: Product[] = [
    {
      id: 'p1',
      name: 'Madhur Pure Sugar',
      category: 'staples',
      quantity: 50,
      unit: 'kg',
      lowStockThreshold: 10,
      status: 'active',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'p2',
      name: 'Maggi 2-Minute Noodles',
      category: 'instant_food',
      quantity: 40,
      unit: 'packet',
      lowStockThreshold: 12,
      status: 'active',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'p3',
      name: 'Fortune Mustard Oil 1L',
      category: 'edible_oils',
      quantity: 20,
      unit: 'bottle',
      lowStockThreshold: 5,
      status: 'active',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'p4',
      name: 'Tata Salt',
      category: 'staples',
      quantity: 30,
      unit: 'kg',
      lowStockThreshold: 5,
      status: 'active',
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: 'p5',
      name: 'Parle-G Gold Biscuits',
      category: 'snacks',
      quantity: 100,
      unit: 'packet',
      lowStockThreshold: 20,
      status: 'active',
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  it('parses direct numbers and units in English', () => {
    const res = parseVoiceKiranaCommand('2 kg sugar', dummyProducts);
    expect(res.detectedQuantity).toBe(2);
    expect(res.detectedUnit).toBe('kg');
    expect(res.matchedProduct?.id).toBe('p1');
    expect(res.confidence).toBeGreaterThan(0.5);
  });

  it('parses Hindi number words and units ("do kilo chini / sugar")', () => {
    const res = parseVoiceKiranaCommand('do kg sugar', dummyProducts);
    expect(res.detectedQuantity).toBe(2);
    expect(res.detectedUnit).toBe('kg');
    expect(res.matchedProduct?.id).toBe('p1');
  });

  it('parses "paanch packet maggi"', () => {
    const res = parseVoiceKiranaCommand('paanch packet maggi', dummyProducts);
    expect(res.detectedQuantity).toBe(5);
    expect(res.detectedUnit).toBe('packet');
    expect(res.matchedProduct?.id).toBe('p2');
  });

  it('parses fractional quantities like "aadha" (0.5) and "half"', () => {
    const resHindi = parseVoiceKiranaCommand('aadha kg salt', dummyProducts);
    expect(resHindi.detectedQuantity).toBe(0.5);
    expect(resHindi.detectedUnit).toBe('kg');
    expect(resHindi.matchedProduct?.id).toBe('p4');

    const resEng = parseVoiceKiranaCommand('half kg salt', dummyProducts);
    expect(resEng.detectedQuantity).toBe(0.5);
    expect(resEng.matchedProduct?.id).toBe('p4');
  });

  it('handles combined quantity + unit tokens like "2kg" or "500g"', () => {
    const res = parseVoiceKiranaCommand('2kg sugar', dummyProducts);
    expect(res.detectedQuantity).toBe(2);
    expect(res.detectedUnit).toBe('kg');
    expect(res.matchedProduct?.id).toBe('p1');
  });

  it('inherits the product unit when unit is omitted by customer', () => {
    // "10 parle g" -> unit is omitted in speech, defaults to packet
    const res = parseVoiceKiranaCommand('10 parle g', dummyProducts);
    expect(res.detectedQuantity).toBe(10);
    expect(res.detectedUnit).toBe('packet');
    expect(res.matchedProduct?.id).toBe('p5');
  });

  it('safely handles empty, blank, or unrecognized gibberish input', () => {
    const emptyRes = parseVoiceKiranaCommand('', dummyProducts);
    expect(emptyRes.matchedProduct).toBeNull();
    expect(emptyRes.confidence).toBe(0);

    const gibberish = parseVoiceKiranaCommand('qwerty asdfgh 99999', dummyProducts);
    expect(gibberish.detectedQuantity).toBe(99999);
    expect(gibberish.matchedProduct).toBeNull();
  });
});
