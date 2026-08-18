/**
 * Utility to format markdown cleanly for native social platforms (LinkedIn, X, Instagram)
 * Strips raw markdown asterisks and cleans spacing while preserving emojis, links and placeholders.
 */

export function convertMarkdownToUnicode(text) {
  if (!text) return text;
  
  // Protect {{placeholder}} tags from being modified
  const placeholders = [];
  const protectedText = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    placeholders.push(match);
    return `__PHVAL_${placeholders.length - 1}_TAG__`;
  });

  // Clean standard markdown bold (**text** or __text__) to clean readable text
  let converted = protectedText.replace(/\*\*(.*?)\*\*|__(.*?)__/g, (match, p1, p2) => {
    return (p1 || p2 || '').trim();
  });
  
  // Clean markdown italic (*text* or _text_)
  converted = converted.replace(/\*(.*?)\*|_(.*?)_/g, (match, p1, p2) => {
    return (p1 || p2 || '').trim();
  });

  // Restore {{placeholder}} tags
  placeholders.forEach((ph, idx) => {
    const token = `__PHVAL_${idx}_TAG__`;
    converted = converted.replaceAll(token, ph);
  });

  return converted;
}

export default {
  convertMarkdownToUnicode,
};

