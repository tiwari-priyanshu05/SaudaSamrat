// =============================================================================
// SaudaSamrat — Voice Kirana Command Parser (Phase 9)
// Pure parser for Indian neighborhood retail speech (Hindi, English, Hinglish).
// =============================================================================

import type { Product, Unit } from '../types';

export interface ParsedVoiceResult {
  rawTranscript: string;
  matchedProduct: Product | null;
  detectedQuantity: number;
  detectedUnit: Unit | null;
  confidence: number; // 0 to 1
  remainingText: string;
}

// Hindi & English numeral words mapping
const NUMBER_WORDS: Record<string, number> = {
  // English words
  quarter: 0.25,
  half: 0.5,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  twenty: 20,
  fifty: 50,
  hundred: 100,

  // Hindi / Hinglish words
  pawa: 0.25,
  paav: 0.25,
  aadha: 0.5,
  adha: 0.5,
  dedh: 1.5,
  dhai: 2.5,
  ek: 1,
  do: 2,
  teen: 3,
  char: 4,
  chaar: 4,
  paanch: 5,
  panch: 5,
  chhe: 6,
  che: 6,
  saat: 7,
  aath: 8,
  ath: 8,
  nau: 9,
  das: 10,
  dus: 10,
  gyarah: 11,
  barah: 12,
  pandrah: 15,
  bees: 20,
  pachis: 25,
  pachaas: 50,
  sau: 100,
};

// Unit aliases
const UNIT_ALIASES: Array<{ unit: Unit; aliases: string[] }> = [
  {
    unit: 'kg',
    aliases: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
  },
  {
    unit: 'g',
    aliases: ['gm', 'gms', 'gram', 'grams', 'g'],
  },
  {
    unit: 'packet',
    aliases: ['packet', 'packets', 'pkt', 'pkts', 'packetan', 'packeton', 'pauchi'],
  },
  {
    unit: 'piece',
    aliases: ['piece', 'pieces', 'pc', 'pcs', 'nag', 'item', 'items'],
  },
  {
    unit: 'bottle',
    aliases: ['bottle', 'bottles', 'botal', 'botol'],
  },
  {
    unit: 'litre',
    aliases: ['litre', 'litres', 'liter', 'liters', 'ltr', 'ltrs', 'l'],
  },
  {
    unit: 'ml',
    aliases: ['ml', 'milli', 'millilitre', 'milliliter'],
  },
  {
    unit: 'dozen',
    aliases: ['dozen', 'dozens', 'darjan', 'darzon'],
  },
];

/**
 * Normalizes text: trims, lowercases, removes punctuation.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts quantity and optional unit from the beginning or middle of the transcript.
 */
function extractQuantityAndUnit(tokens: string[]): {
  quantity: number;
  unit: Unit | null;
  remainingTokens: string[];
} {
  let quantity = 1;
  let unit: Unit | null = null;
  let consumedIndices = new Set<number>();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Check if token is a direct numeric string (e.g. "2" or "2.5" or "1/2")
    if (/^\d+(\.\d+)?$/.test(token)) {
      quantity = parseFloat(token);
      consumedIndices.add(i);

      // Check next token for unit
      if (i + 1 < tokens.length) {
        const nextToken = tokens[i + 1];
        for (const u of UNIT_ALIASES) {
          if (u.aliases.includes(nextToken)) {
            unit = u.unit;
            consumedIndices.add(i + 1);
            break;
          }
        }
      }
      break;
    }

    // Check number words (e.g. "do", "two", "aadha")
    if (NUMBER_WORDS[token] !== undefined) {
      quantity = NUMBER_WORDS[token];
      consumedIndices.add(i);

      // Check next token for unit
      if (i + 1 < tokens.length) {
        const nextToken = tokens[i + 1];
        for (const u of UNIT_ALIASES) {
          if (u.aliases.includes(nextToken)) {
            unit = u.unit;
            consumedIndices.add(i + 1);
            break;
          }
        }
      }
      break;
    }

    // Check if token directly combines quantity and unit (e.g. "2kg" or "500g")
    const combinedMatch = /^(\d+(\.\d+)?)(kg|kgs|g|gm|gms|ml|l|ltr)$/.exec(token);
    if (combinedMatch) {
      quantity = parseFloat(combinedMatch[1]);
      const rawUnit = combinedMatch[3];
      for (const u of UNIT_ALIASES) {
        if (u.aliases.includes(rawUnit)) {
          unit = u.unit;
          break;
        }
      }
      consumedIndices.add(i);
      break;
    }
  }

  const remainingTokens = tokens.filter((_, idx) => !consumedIndices.has(idx));
  return { quantity, unit, remainingTokens };
}

/**
 * Matches remaining tokens against products using token overlap & substring scoring.
 */
function findBestProductMatch(
  queryTokens: string[],
  products: Product[]
): { product: Product | null; confidence: number } {
  if (products.length === 0 || queryTokens.length === 0) {
    return { product: null, confidence: 0 };
  }

  const queryString = queryTokens.join(' ');
  let bestMatch: Product | null = null;
  let bestScore = 0;

  for (const p of products) {
    const pName = p.name.toLowerCase();
    const pCategory = p.category.toLowerCase();
    let score = 0;

    // Exact name match
    if (pName === queryString) {
      score = 1.0;
    }
    // Substring match
    else if (pName.includes(queryString) || queryString.includes(pName)) {
      score = 0.85;
    } else {
      // Token overlap
      let matches = 0;
      for (const t of queryTokens) {
        if (pName.includes(t) || pCategory.includes(t)) {
          matches++;
        }
      }
      if (matches > 0) {
        score = (matches / Math.max(queryTokens.length, 1)) * 0.75;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = p;
    }
  }

  return { product: bestMatch, confidence: bestScore };
}

/**
 * Main parse function for voice kirana phrases.
 * Example inputs:
 * - "2 kilo chini" -> qty: 2, unit: 'kg', product: 'Chini / Sugar'
 * - "5 packet maggi" -> qty: 5, unit: 'packet', product: 'Maggi'
 * - "do bottle tel" -> qty: 2, unit: 'bottle', product: 'Tel'
 * - "10 parle g" -> qty: 10, unit: 'packet' (from product), product: 'Parle G'
 */
export function parseVoiceKiranaCommand(
  transcript: string,
  products: Product[]
): ParsedVoiceResult {
  const normalized = normalizeText(transcript);
  if (!normalized) {
    return {
      rawTranscript: transcript,
      matchedProduct: null,
      detectedQuantity: 1,
      detectedUnit: null,
      confidence: 0,
      remainingText: '',
    };
  }

  const tokens = normalized.split(' ');
  const { quantity, unit, remainingTokens } = extractQuantityAndUnit(tokens);
  const remainingText = remainingTokens.join(' ');

  const { product, confidence } = findBestProductMatch(remainingTokens, products);

  // Default unit to product unit if detected unit is absent
  const finalUnit = unit || (product ? product.unit : null);

  return {
    rawTranscript: transcript,
    matchedProduct: product,
    detectedQuantity: quantity,
    detectedUnit: finalUnit,
    confidence,
    remainingText,
  };
}
