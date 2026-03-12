const bannedWords = ['spam', 'scam', 'fake'];

export function containsProfanity(text: string) {
  const normalized = text.toLowerCase();
  return bannedWords.some((word) => normalized.includes(word));
}

export function sanitizeInput(text: string) {
  return text.replace(/[<>]/g, '');
}
