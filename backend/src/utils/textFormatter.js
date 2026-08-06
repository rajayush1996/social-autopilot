/**
 * Utility to convert standard Markdown formatting (**bold**, *italic*)
 * into native Unicode Bold & Italic characters for LinkedIn, X, and Instagram posts.
 */

export function toUnicodeBold(text) {
  if (!text) return '';
  const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const boldUpper = ['𝗔','𝗕','𝗖','𝗗','𝗘','𝗙','𝗚','𝗛','𝗜','𝗝','𝗞','𝗟','𝗠','𝗡','𝗢','𝗣','𝗤','𝗥','𝗦','𝗧','𝗨','𝗩','𝗪','𝗫','𝗬','𝗭'];
  const normalLower = 'abcdefghijklmnopqrstuvwxyz';
  const boldLower = ['𝗮','𝗯','𝗰','𝗱','𝗲','𝗳','𝗴','𝗵','𝗶','𝗷','𝗸','𝗹','𝗺','𝗻','𝗼','𝗽','𝗾','𝗿','𝘀','𝘁','𝘂','𝘃','𝘄','𝘅','𝘆','𝘇'];
  const normalDigit = '0123456789';
  const boldDigit = ['𝟬','𝟭','𝟮','𝟯','𝟰','𝟱','𝟲','𝟳','𝟴','𝟵'];

  return text
    .split('')
    .map((char) => {
      const uIdx = normalUpper.indexOf(char);
      if (uIdx !== -1) return boldUpper[uIdx];
      const lIdx = normalLower.indexOf(char);
      if (lIdx !== -1) return boldLower[lIdx];
      const dIdx = normalDigit.indexOf(char);
      if (dIdx !== -1) return boldDigit[dIdx];
      return char;
    })
    .join('');
}

export function toUnicodeItalic(text) {
  if (!text) return '';
  const normalUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const italicUpper = ['𝐴','𝐵','𝐶','𝐷','𝐸','𝐹','𝐺','𝐻','𝐼','𝐽','𝐾','𝐿','𝑀','𝑁','𝑂','𝑃','𝑄','𝑅','𝑆','𝑇','𝑈','𝑉','𝑊','𝑋','𝑌','𝑍'];
  const normalLower = 'abcdefghijklmnopqrstuvwxyz';
  const italicLower = ['𝑎','𝑏','𝑐','𝑑','𝑒','𝑓','𝑔','ℎ','𝑖','𝑗','𝑘','𝑙','𝑚','𝑛','𝑜','𝑝','𝑞','𝑟','𝑠','𝑡','𝑢','𝑣','𝑤','𝑥','𝑦','𝑧'];

  return text
    .split('')
    .map((char) => {
      const uIdx = normalUpper.indexOf(char);
      if (uIdx !== -1) return italicUpper[uIdx];
      const lIdx = normalLower.indexOf(char);
      if (lIdx !== -1) return italicLower[lIdx];
      return char;
    })
    .join('');
}

export function convertMarkdownToUnicode(text) {
  if (!text) return text;
  
  // Protect {{placeholder}} tags from being transformed to unicode bold/italic before replacement
  const placeholders = [];
  const protectedText = text.replace(/\{\{[^}]+\}\}/g, (match) => {
    placeholders.push(match);
    return `PHVAL${placeholders.length - 1}TAG`;
  });

  // Convert **bold** or __bold__ to Unicode Bold
  let converted = protectedText.replace(/\*\*(.*?)\*\*|__(.*?)__/g, (match, p1, p2) => {
    const inner = p1 || p2;
    return toUnicodeBold(inner);
  });
  
  // Convert *italic* or _italic_ to Unicode Italic
  converted = converted.replace(/\*(.*?)\*|_(.*?)_/g, (match, p1, p2) => {
    const inner = p1 || p2;
    return toUnicodeItalic(inner);
  });

  // Restore {{placeholder}} tags (whether standard, boldified, or italicized token)
  placeholders.forEach((ph, idx) => {
    const token = `PHVAL${idx}TAG`;
    const boldToken = toUnicodeBold(token);
    const italicToken = toUnicodeItalic(token);
    converted = converted.replaceAll(token, ph)
                         .replaceAll(boldToken, ph)
                         .replaceAll(italicToken, ph);
  });

  return converted;
}
