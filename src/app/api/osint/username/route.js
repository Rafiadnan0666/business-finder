import SITES from '@/lib/sherlock-sites';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

async function checkSite(site, username) {
  const url = site.u.replace(/\{u\}/g, encodeURIComponent(username)).replace(/\{U\}/g, username);
  try {
    const resp = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': UA }
    });
    if (resp.ok || resp.status === 301 || resp.status === 302 || resp.status === 403) {
      return { name: site.n, url, category: site.c, exists: true, status: resp.status };
    }
    if (resp.status === 404 || resp.status === 410) {
      return { name: site.n, url, category: site.c, exists: false, status: resp.status };
    }
    const text = await resp.text().catch(() => '');
    const errorIndicators = ['not found','page not found','doesn\'t exist','nobody','error 404','could not find','page doesn\'t exist','user not found','profile not found','no results','nothing found','this page does not exist'];
    const lower = text.toLowerCase();
    if (errorIndicators.some(ind => lower.includes(ind))) {
      return { name: site.n, url, category: site.c, exists: false, status: resp.status, reason: 'error_page' };
    }
    return { name: site.n, url, category: site.c, exists: true, status: resp.status };
  } catch {
    return { name: site.n, url, category: site.c, exists: false, status: 0, reason: 'timeout' };
  }
}

export async function POST(req) {
  const { username } = await req.json();
  if (!username || username.length < 2) {
    return Response.json({ error: 'Username must be at least 2 characters' }, { status: 400 });
  }
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  if (!clean) {
    return Response.json({ error: 'Invalid username' }, { status: 400 });
  }
  const results = [];
  const batches = [];
  for (let i = 0; i < SITES.length; i += 20) {
    batches.push(SITES.slice(i, i + 20));
  }
  for (const batch of batches) {
    const settled = await Promise.allSettled(batch.map(site => checkSite(site, clean)));
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value);
    }
  }
  const found = results.filter(r => r.exists);
  const notFound = results.filter(r => !r.exists);
  return Response.json({
    username: clean,
    total_checked: results.length,
    found: found.length,
    not_found: notFound.length,
    results: found.sort((a, b) => a.name.localeCompare(b.name)),
    not_found_sites: notFound.sort((a, b) => a.name.localeCompare(b.name))
  });
}
