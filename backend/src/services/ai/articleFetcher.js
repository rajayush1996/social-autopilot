import axios from 'axios';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import logger from '../../utils/logger.js';

/**
 * ArticleFetcher
 * Fetches and extracts readable text from a user-supplied article URL so the AI
 * receives the real article as context instead of hallucinating from the slug.
 *
 * Because the URL is user-supplied and the request runs server-side, every hop is
 * validated against private/internal address ranges (SSRF) and the resolved IP is
 * pinned for the connection to close the DNS-rebinding window.
 */

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_EXTRACTED_CHARS = 8000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MAX_ENTRIES = 50;
const USER_AGENT = 'SocialAutopilotBot/1.0 (+article-repurposing)';

const BLOCKED_IPV4_CIDRS = Object.freeze([
  '0.0.0.0/8', // "this network"
  '10.0.0.0/8', // private
  '100.64.0.0/10', // carrier-grade NAT
  '127.0.0.0/8', // loopback
  '169.254.0.0/16', // link-local (includes cloud metadata 169.254.169.254)
  '172.16.0.0/12', // private
  '192.0.0.0/24', // IETF protocol assignments
  '192.0.2.0/24', // documentation
  '192.168.0.0/16', // private
  '198.18.0.0/15', // benchmarking
  '198.51.100.0/24', // documentation
  '203.0.113.0/24', // documentation
  '224.0.0.0/4', // multicast
  '240.0.0.0/4', // reserved (includes 255.255.255.255)
]);

const BLOCKED_HOST_SUFFIXES = Object.freeze(['.localhost', '.local', '.internal', '.lan', '.home.arpa']);

/** In-process cache so generating for 4 platforms fetches the article once. */
const articleCache = new Map();

export class ArticleFetchError extends Error {
  constructor(message, code = 'ARTICLE_FETCH_FAILED') {
    super(message);
    this.name = 'ArticleFetchError';
    this.code = code;
  }
}

function ipv4ToInt(ip) {
  return ip.split('.').reduce((accumulator, octet) => accumulator * 256 + Number(octet), 0);
}

function isIpv4InCidr(ip, cidr) {
  const [range, bitsRaw] = cidr.split('/');
  const bits = Number(bitsRaw);
  if (bits === 0) return true;
  const mask = (0xffffffff << (32 - bits)) >>> 0;
  return ((ipv4ToInt(ip) & mask) >>> 0) === ((ipv4ToInt(range) & mask) >>> 0);
}

/** Expand any valid IPv6 literal into its 8 numeric hextets. */
function expandIpv6(ip) {
  let address = ip;
  let embeddedIpv4 = null;

  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  if (net.isIPv4(tail)) {
    embeddedIpv4 = tail;
    address = address.slice(0, lastColon + 1) + '0:0';
  }

  const [head, rest] = address.split('::');
  const headParts = head ? head.split(':').filter(Boolean) : [];
  const tailParts = rest !== undefined && rest ? rest.split(':').filter(Boolean) : [];
  const missing = 8 - (headParts.length + tailParts.length);
  const parts =
    rest === undefined
      ? headParts
      : [...headParts, ...Array.from({ length: Math.max(missing, 0) }, () => '0'), ...tailParts];

  const hextets = parts.map((part) => parseInt(part || '0', 16));

  if (embeddedIpv4) {
    const octets = embeddedIpv4.split('.').map(Number);
    hextets[6] = (octets[0] << 8) | octets[1];
    hextets[7] = (octets[2] << 8) | octets[3];
  }

  while (hextets.length < 8) hextets.push(0);
  return hextets.slice(0, 8);
}

/**
 * True when the literal IP address points at loopback, private, link-local,
 * multicast or otherwise non-public space.
 */
export function isBlockedAddress(ip) {
  const family = net.isIP(ip);
  if (family === 0) return true;

  if (family === 4) {
    return BLOCKED_IPV4_CIDRS.some((cidr) => isIpv4InCidr(ip, cidr));
  }

  const hextets = expandIpv6(ip);

  // IPv4-mapped (::ffff:a.b.c.d) and NAT64 (64:ff9b::/96) carry a v4 address.
  const isIpv4Mapped =
    hextets.slice(0, 5).every((hextet) => hextet === 0) && hextets[5] === 0xffff;
  const isNat64 = hextets[0] === 0x0064 && hextets[1] === 0xff9b;
  if (isIpv4Mapped || isNat64) {
    const embedded = [
      (hextets[6] >> 8) & 0xff,
      hextets[6] & 0xff,
      (hextets[7] >> 8) & 0xff,
      hextets[7] & 0xff,
    ].join('.');
    return isBlockedAddress(embedded);
  }

  if (hextets.every((hextet) => hextet === 0)) return true; // ::
  if (hextets.slice(0, 7).every((hextet) => hextet === 0) && hextets[7] === 1) return true; // ::1
  if ((hextets[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((hextets[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((hextets[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast

  return false;
}

/**
 * Parse and shallow-validate the URL shape before any network access happens.
 */
export function validateArticleUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl).trim());
  } catch {
    throw new ArticleFetchError('Article URL is not a valid absolute URL.', 'INVALID_URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new ArticleFetchError(
      `Unsupported URL scheme "${parsed.protocol}". Only http and https are allowed.`,
      'INVALID_SCHEME'
    );
  }

  if (parsed.username || parsed.password) {
    throw new ArticleFetchError('Article URL must not contain embedded credentials.', 'INVALID_URL');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) {
    throw new ArticleFetchError('Article URL is missing a hostname.', 'INVALID_URL');
  }
  if (hostname === 'localhost' || BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new ArticleFetchError(`Refusing to fetch internal host "${hostname}".`, 'BLOCKED_HOST');
  }
  if (net.isIP(hostname) && isBlockedAddress(hostname)) {
    throw new ArticleFetchError(
      `Refusing to fetch private or reserved address "${hostname}".`,
      'BLOCKED_HOST'
    );
  }

  parsed.hash = '';
  return parsed;
}

/**
 * Resolve the hostname and reject if ANY returned record is non-public.
 * Returns the record to pin for the actual connection.
 */
async function resolvePublicAddress(hostname) {
  if (net.isIP(hostname)) {
    return { address: hostname, family: net.isIP(hostname) };
  }

  let records;
  try {
    records = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new ArticleFetchError(`Could not resolve host "${hostname}" (${err.code || err.message}).`, 'DNS_FAILED');
  }

  if (!records || records.length === 0) {
    throw new ArticleFetchError(`Host "${hostname}" did not resolve to any address.`, 'DNS_FAILED');
  }

  for (const record of records) {
    if (isBlockedAddress(record.address)) {
      throw new ArticleFetchError(
        `Refusing to fetch "${hostname}" because it resolves to the private address ${record.address}.`,
        'BLOCKED_HOST'
      );
    }
  }

  return records[0];
}

/**
 * Agent whose DNS lookup always returns the already-validated address, so the
 * host cannot be re-resolved to a private IP between validation and connect.
 */
function createPinnedAgent(protocol, pinned) {
  const lookup = (hostname, options, callback) => {
    if (options && options.all) {
      return callback(null, [{ address: pinned.address, family: pinned.family }]);
    }
    return callback(null, pinned.address, pinned.family);
  };

  const agentOptions = { lookup, keepAlive: false };
  return protocol === 'https:' ? new https.Agent(agentOptions) : new http.Agent(agentOptions);
}

async function requestWithGuards(url) {
  const parsed = validateArticleUrl(url);
  const pinned = await resolvePublicAddress(parsed.hostname.replace(/^\[|\]$/g, ''));
  const agent = createPinnedAgent(parsed.protocol, pinned);

  try {
    const response = await axios.get(parsed.toString(), {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 0, // redirects are followed manually so each hop is re-validated
      maxContentLength: MAX_RESPONSE_BYTES,
      maxBodyLength: MAX_RESPONSE_BYTES,
      responseType: 'text',
      decompress: true,
      validateStatus: () => true,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
        'Accept-Language': 'en',
      },
      httpAgent: parsed.protocol === 'http:' ? agent : undefined,
      httpsAgent: parsed.protocol === 'https:' ? agent : undefined,
    });

    return { response, parsed };
  } catch (err) {
    if (err.code === 'ERR_FR_MAX_CONTENT_LENGTH_EXCEEDED') {
      throw new ArticleFetchError('Article page is larger than the 2 MB fetch limit.', 'TOO_LARGE');
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      throw new ArticleFetchError('Article URL timed out before responding.', 'TIMEOUT');
    }
    throw new ArticleFetchError(`Could not reach the article URL (${err.code || err.message}).`, 'UNREACHABLE');
  } finally {
    agent.destroy();
  }
}

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
});

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function matchMeta(html, pattern) {
  const match = html.match(pattern);
  return match ? decodeEntities(match[1]).trim() : '';
}

/**
 * Extract a title/description/body-text triple from raw HTML without a DOM parser.
 * Good enough for server-rendered articles; swap in cheerio/readability if the
 * quality ceiling becomes a problem.
 */
export function extractArticleText(html) {
  const source = String(html || '');

  const title =
    matchMeta(source, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i) ||
    matchMeta(source, /<title[^>]*>([\s\S]*?)<\/title>/i);

  const description =
    matchMeta(source, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) ||
    matchMeta(source, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);

  const withoutNoise = source
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|form|button|select)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  const scoped =
    withoutNoise.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] ||
    withoutNoise.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ||
    withoutNoise.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    withoutNoise;

  const text = decodeEntities(
    scoped
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title, description, text };
}

function readCache(key) {
  const entry = articleCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    articleCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key, value) {
  if (articleCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = articleCache.keys().next().value;
    if (oldestKey !== undefined) articleCache.delete(oldestKey);
  }
  articleCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Test/ops helper — clears the in-process article cache. */
export function clearArticleCache() {
  articleCache.clear();
}

/**
 * Fetch an article and return extracted context for the AI prompt.
 *
 * @param {String} rawUrl - User-supplied article URL
 * @returns {Promise<{url: String, finalUrl: String, title: String, description: String, text: String, truncated: Boolean}>}
 * @throws {ArticleFetchError} When the URL is unsafe, unreachable, or unreadable
 */
export async function fetchArticleContext(rawUrl) {
  const normalizedUrl = validateArticleUrl(rawUrl).toString();

  const cached = readCache(normalizedUrl);
  if (cached) {
    logger.info(`[ArticleFetcher] Cache hit for ${normalizedUrl}`);
    return cached;
  }

  let currentUrl = normalizedUrl;
  let redirectCount = 0;

  while (true) {
    const { response, parsed } = await requestWithGuards(currentUrl);
    const status = response.status;

    if ([301, 302, 303, 307, 308].includes(status)) {
      const location = response.headers?.location;
      if (!location) {
        throw new ArticleFetchError(`Article URL returned HTTP ${status} without a location header.`, 'BAD_REDIRECT');
      }
      if (++redirectCount > MAX_REDIRECTS) {
        throw new ArticleFetchError(`Article URL exceeded ${MAX_REDIRECTS} redirects.`, 'TOO_MANY_REDIRECTS');
      }
      currentUrl = new URL(location, parsed).toString(); // re-validated on the next pass
      continue;
    }

    if (status >= 400) {
      throw new ArticleFetchError(`Article URL returned HTTP ${status}.`, 'HTTP_ERROR');
    }

    const contentType = String(response.headers?.['content-type'] || '');
    if (!/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      throw new ArticleFetchError(
        `Article URL returned unsupported content type "${contentType || 'unknown'}".`,
        'UNSUPPORTED_TYPE'
      );
    }

    const { title, description, text } = extractArticleText(response.data);

    if (text.length < 200) {
      throw new ArticleFetchError(
        'Could not extract readable text from the article (it may require JavaScript or a subscription).',
        'NO_CONTENT'
      );
    }

    const context = {
      url: normalizedUrl,
      finalUrl: parsed.toString(),
      title,
      description,
      text: text.slice(0, MAX_EXTRACTED_CHARS),
      truncated: text.length > MAX_EXTRACTED_CHARS,
    };

    logger.info(
      `[ArticleFetcher] Extracted ${context.text.length} chars from ${context.finalUrl}${context.truncated ? ' (truncated)' : ''}`
    );

    writeCache(normalizedUrl, context);
    return context;
  }
}

export default fetchArticleContext;
