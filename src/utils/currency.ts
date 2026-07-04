/**
 * Formats a raw number or formatted string into Indonesian format (dots as thousand separators)
 * and prevents leading zeros.
 */
export const formatNumberInput = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  const clean = String(value).replace(/\D/g, '');
  if (!clean) return '';
  const parsed = parseInt(clean, 10);
  if (parsed === 0) return '';
  return parsed.toLocaleString('id-ID');
};

/**
 * Parses a string with dots or thousand separators into a clean number.
 */
export const parseFormattedNumber = (value: string): number => {
  const clean = value.replace(/\D/g, '');
  return clean ? parseInt(clean, 10) : 0;
};
