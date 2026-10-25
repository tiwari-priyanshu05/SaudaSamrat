// Minimal nanoid-compatible ID generator (avoids extra dependency)
// Generates a 21-character URL-safe random ID.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';

export function nanoid(size = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join('');
}
