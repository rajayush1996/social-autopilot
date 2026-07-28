import test from 'node:test';
import assert from 'node:assert';
import {
  isBlockedAddress,
  validateArticleUrl,
  extractArticleText,
  fetchArticleContext,
  ArticleFetchError,
} from '../../src/services/ai/articleFetcher.js';

test('ArticleFetcher SSRF address guards', async (t) => {
  await t.test('blocks loopback, private, link-local and reserved IPv4', () => {
    const blocked = [
      '127.0.0.1',
      '127.1.2.3',
      '10.0.0.7',
      '172.16.5.4',
      '172.31.255.255',
      '192.168.1.1',
      '169.254.169.254', // cloud metadata endpoint
      '100.64.0.1',
      '0.0.0.0',
      '224.0.0.1',
      '255.255.255.255',
    ];

    for (const ip of blocked) {
      assert.strictEqual(isBlockedAddress(ip), true, `${ip} should be blocked`);
    }
  });

  await t.test('blocks loopback, unique-local, link-local and mapped IPv6', () => {
    const blocked = [
      '::1',
      '::',
      'fc00::1',
      'fd12:3456:789a::1',
      'fe80::1',
      'ff02::1',
      '::ffff:127.0.0.1', // IPv4-mapped loopback
      '::ffff:192.168.0.1',
      '64:ff9b::a9fe:a9fe', // NAT64-wrapped 169.254.169.254
    ];

    for (const ip of blocked) {
      assert.strictEqual(isBlockedAddress(ip), true, `${ip} should be blocked`);
    }
  });

  await t.test('allows public addresses', () => {
    const allowed = ['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700::1111', '2a00:1450:4001::200e'];

    for (const ip of allowed) {
      assert.strictEqual(isBlockedAddress(ip), false, `${ip} should be allowed`);
    }
  });

  await t.test('treats malformed input as blocked', () => {
    assert.strictEqual(isBlockedAddress('not-an-ip'), true);
    assert.strictEqual(isBlockedAddress(''), true);
  });
});

test('ArticleFetcher URL validation', async (t) => {
  await t.test('rejects non-http(s) schemes', () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com/a', 'gopher://example.com']) {
      assert.throws(() => validateArticleUrl(url), (err) => err instanceof ArticleFetchError && err.code === 'INVALID_SCHEME');
    }
  });

  await t.test('rejects internal hostnames', () => {
    for (const url of [
      'http://localhost:5000/admin',
      'http://redis.internal/keys',
      'http://printer.local/status',
      'http://db.lan/',
    ]) {
      assert.throws(() => validateArticleUrl(url), (err) => err.code === 'BLOCKED_HOST', `${url} should be blocked`);
    }
  });

  await t.test('rejects literal private IP hosts', () => {
    for (const url of [
      'http://127.0.0.1:6379/',
      'http://169.254.169.254/latest/meta-data/',
      'http://10.1.2.3/internal',
      'http://[::1]:8080/',
    ]) {
      assert.throws(() => validateArticleUrl(url), (err) => err.code === 'BLOCKED_HOST', `${url} should be blocked`);
    }
  });

  await t.test('rejects embedded credentials and malformed URLs', () => {
    assert.throws(() => validateArticleUrl('http://user:pass@example.com/a'), (err) => err.code === 'INVALID_URL');
    assert.throws(() => validateArticleUrl('example.com/no-scheme'), (err) => err.code === 'INVALID_URL');
  });

  await t.test('accepts a public URL and strips the fragment', () => {
    const parsed = validateArticleUrl('https://example.com/blog/post?utm=1#section-2');
    assert.strictEqual(parsed.toString(), 'https://example.com/blog/post?utm=1');
  });

  await t.test('fetchArticleContext surfaces guard failures as ArticleFetchError', async () => {
    await assert.rejects(
      fetchArticleContext('http://169.254.169.254/latest/meta-data/'),
      (err) => err instanceof ArticleFetchError && err.code === 'BLOCKED_HOST'
    );
  });
});

test('ArticleFetcher text extraction', async (t) => {
  const html = `<!doctype html>
    <html><head>
      <title>Ignored Title | Site</title>
      <meta property="og:title" content="How We Cut Deploy Time by 60&#37;">
      <meta name="description" content="A short summary of the deploy work.">
      <script>var tracking = "should not appear";</script>
      <style>.a{color:red}</style>
    </head>
    <body>
      <nav>Home About Pricing</nav>
      <header>Site header junk</header>
      <article>
        <h1>How We Cut Deploy Time by 60%</h1>
        <p>Our pipeline took 22 minutes to ship a single commit &amp; that blocked releases.</p>
        <p>We split the test suite into four shards and cached the dependency layer.</p>
        <ul><li>Sharding saved 9 minutes</li><li>Layer caching saved 4 minutes</li></ul>
        <p>The result: deploys now finish in under 9 minutes on every branch we ship.</p>
      </article>
      <footer>Copyright 2026</footer>
    </body></html>`;

  const { title, description, text } = extractArticleText(html);

  await t.test('prefers og:title and decodes entities', () => {
    assert.strictEqual(title, 'How We Cut Deploy Time by 60%');
    assert.strictEqual(description, 'A short summary of the deploy work.');
    assert.ok(text.includes('commit & that blocked releases'), 'entities should be decoded in body text');
  });

  await t.test('drops script, style, nav, header and footer noise', () => {
    for (const noise of ['should not appear', 'color:red', 'Home About Pricing', 'Site header junk', 'Copyright 2026']) {
      assert.ok(!text.includes(noise), `extracted text should not contain "${noise}"`);
    }
  });

  await t.test('keeps the article body copy', () => {
    assert.ok(text.includes('22 minutes'));
    assert.ok(text.includes('Sharding saved 9 minutes'));
    assert.ok(text.includes('under 9 minutes'));
    assert.ok(!/<[a-z]/i.test(text), 'extracted text should contain no markup');
  });
});
