// src/lib/server/nascar/cupDrivers.js

const CUP_DRIVERS_URL = 'https://www.nascar.com/drivers/nascar-cup-series/';

let cache = { fetchedAt: 0, data: null };
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function fetchCupDrivers(fetchImpl = fetch) {
  const now = Date.now();
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) return cache.data;

  const res = await fetchImpl(CUP_DRIVERS_URL, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml'
    }
  });

  if (!res.ok) {
    throw new Error(`NASCAR drivers page fetch failed (${res.status})`);
  }

  const html = await res.text();
  const options = parseDriversFromHtml(html);

  if (!options.length) {
    // Helpful debug if NASCAR changes markup again:
    // Uncomment temporarily to see what you actually received.
    // console.log('NASCAR HTML sample:', html.slice(0, 500));
    throw new Error('Parsed 0 drivers from NASCAR drivers page (HTML structure may have changed)');
  }

  cache = { fetchedAt: now, data: options };
  return options;
}

function parseDriversFromHtml(html) {
  // Capture href + ANY inner HTML (non-greedy)
  const re = /<a[^>]+href="\/drivers\/([^"\\/?#]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  const map = new Map(); // slug -> name

  let m;
  while ((m = re.exec(html)) !== null) {
    const slug = (m[1] || '').trim();
    let inner = (m[2] || '').trim();

    if (!slug) continue;

    // Strip nested tags inside <a>…</a>
    let name = stripTags(inner);
    name = decodeEntities(name);
    name = name.replace(/\s+/g, ' ').trim();

    // Filter obvious junk
    const lower = name.toLowerCase();
    if (!name) continue;
    if (lower.includes('back to drivers')) continue;
    if (lower === 'drivers') continue;

    // Driver names almost always have a space (first + last)
    // Keep it mildly strict so we don’t include nav items.
    if (!name.includes(' ')) continue;

    // De-dupe by slug
    if (!map.has(slug)) {
      map.set(slug, name);
    }
  }

  const options = [...map.entries()].map(([slug, name]) => ({
    id: slug,
    name,
    source: 'nascar.com',
    url: `https://www.nascar.com/drivers/${slug}`
  }));

  options.sort((a, b) => a.name.localeCompare(b.name));
  return options;
}

function stripTags(s) {
  return s.replace(/<[^>]*>/g, ' ');
}

function decodeEntities(s) {
  // Minimal entity decoding for common cases
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
