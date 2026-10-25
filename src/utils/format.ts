import type { Unit } from '../types';

// --------------- Quantity & units -------------------------------------------

export function formatQty(qty: number, unit: Unit): string {
  // Use at most 3 decimal places, dropping trailing zeros
  const formatted = +qty.toFixed(3);
  return `${formatted} ${unitLabel(unit)}`;
}

export function unitLabel(unit: Unit): string {
  const labels: Record<Unit, string> = {
    piece: 'pcs',
    packet: 'pkt',
    bottle: 'btl',
    kg: 'kg',
    g: 'g',
    litre: 'L',
    ml: 'ml',
    dozen: 'dz',
  };
  return labels[unit] ?? unit;
}

// --------------- Date & time ------------------------------------------------

export function formatRelativeTime(epochMs: number, lang: 'hi' | 'en' = 'en'): string {
  const diff = Date.now() - epochMs;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (lang === 'hi') {
    if (minutes < 1) return 'अभी';
    if (minutes < 60) return `${minutes} मिनट पहले`;
    if (hours < 24) return `${hours} घंटे पहले`;
    if (days === 1) return 'कल';
    return `${days} दिन पहले`;
  } else {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }
}

export function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// --------------- Parsing helpers --------------------------------------------

export function parsePositiveFloat(raw: string): number | null {
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v <= 0) return null;
  return v;
}

export function parseNonNegativeFloat(raw: string): number | null {
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v < 0) return null;
  return v;
}

// --------------- Shop Owner Greeting -----------------------------------------

export function extractFirstName(fullName: string): { firstName: string; hasHonorific: boolean } {
  const normalized = fullName.trim().replace(/\s+/g, ' ');
  if (!normalized) return { firstName: '', hasHonorific: false };

  const tokens = normalized.split(' ');

  // If single word, e.g. "Rahul", "Rahulji", "O'Connor"
  if (tokens.length === 1) {
    const hasHonorific =
      /(?:^|\s|[_\-])(ji|जी)$/i.test(tokens[0]) || /(ji|जी)$/i.test(tokens[0]);
    return { firstName: tokens[0], hasHonorific };
  }

  // If two tokens and the second is "ji" or "जी" (e.g. "Rahul ji", "राहुल जी", "Sharma जी")
  const lastToken = tokens[tokens.length - 1];
  const lastIsJi = /^(ji|जी)$/i.test(lastToken);
  if (tokens.length === 2 && lastIsJi) {
    return { firstName: normalized, hasHonorific: true };
  }

  // If initials (e.g. "Dr. A. P. J.")
  const isInitialsOnly = tokens.slice(1).every((t) => /^[a-zA-Z]\.?$/.test(t));
  if (isInitialsOnly) {
    return { firstName: normalized, hasHonorific: false };
  }

  // Handle prefix titles (e.g. Dr., Mr., Mrs., Shri, Smt., डॉ., श्री, श्रीमती)
  let startIdx = 0;
  let title = '';
  if (
    tokens.length > 1 &&
    /^(dr\.?|mr\.?|mrs\.?|ms\.?|shri|smt\.?|डॉ\.?|श्री|श्रीमती)$/i.test(tokens[0])
  ) {
    title = tokens[0] + ' ';
    startIdx = 1;
  }

  const rawFirst = tokens[startIdx] || tokens[0];
  const nextToken = tokens[startIdx + 1];
  const nextIsJi = nextToken !== undefined && /^(ji|जी)$/i.test(nextToken);

  if (nextIsJi) {
    return { firstName: `${title}${rawFirst} ${nextToken}`, hasHonorific: true };
  }

  const hasHonorificSelf =
    /(?:^|\s|[_\-])(ji|जी)$/i.test(rawFirst) || /(ji|जी)$/i.test(rawFirst);

  return {
    firstName: `${title}${rawFirst}`,
    hasHonorific: hasHonorificSelf,
  };
}

export function formatOwnerGreeting(ownerName: string, lang: 'hi' | 'en' = 'en'): string {
  const { firstName, hasHonorific } = extractFirstName(ownerName);
  if (!firstName) {
    return lang === 'hi' ? 'नमस्ते! 🙏' : 'Namaste! 🙏';
  }

  const prefix = lang === 'hi' ? 'नमस्ते, ' : 'Namaste, ';
  const suffix = hasHonorific ? '! 🙏' : (lang === 'hi' ? ' जी! 🙏' : ' ji! 🙏');

  return `${prefix}${firstName}${suffix}`;
}
