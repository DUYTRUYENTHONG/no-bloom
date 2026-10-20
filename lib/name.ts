export function normalizeName(input: string): string {
  return input.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export function countGraphemes(input: string): number {
  return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(input)].length;
}

export function validateName(input: string): { value: string; valid: boolean; tooLong: boolean } {
  const value = normalizeName(input);
  const tooLong = countGraphemes(value) > 60;
  return { value, valid: value.length > 0 && !tooLong, tooLong };
}
