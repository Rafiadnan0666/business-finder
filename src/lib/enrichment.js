const EMAIL_PATTERNS = [
  'info', 'contact', 'hello', 'support', 'admin',
  'office', 'enquiries', 'enquiry', 'mail', 'business',
  'hr', 'careers', 'jobs', 'recruitment', 'hiring',
  'talent', 'people', 'hrteam', 'personnel', 'team',
  'sales', 'help', 'feedback', 'service', 'customerservice',
  'partners', 'vendors', 'procurement', 'finance', 'accounting',
  'marketing', 'pr', 'media', 'press',
  'operations', 'logistics', 'orders', 'billing',
  'bookings', 'reservations', 'appointments',
  'customercare', 'customerrelations'
];

const HR_PREFIXES = [
  'hr', 'careers', 'recruitment', 'jobs', 'hiring',
  'talent', 'people', 'personnel', 'hrteam', 'hrdept',
  'humanresources', 'staffing', 'workwithus',
  'joinus', 'career', 'job', 'recruiter', 'talentacquisition'
];

const SKIP_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'no_reply',
  'example.com', 'domain.com', 'yourname', 'your@',
  '@email.com', '@gmail.com', '@yahoo.com', '@hotmail.com',
  '@outlook.com', '@aol.com', '@mail.com', '@yopmail.com',
  '@tempmail', '@test.com', '@sample.com', '@example'
];

const SUBPAGES = [
  '/contact', '/about', '/team', '/careers', '/hr',
  '/jobs', '/recruitment', '/contact-us', '/about-us',
  '/locations', '/store-locator', '/find-us',
  '/corporate', '/company', '/our-team', '/offices',
  '/support', '/services'
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const domainCache = new Map();
const MAX_CONCURRENT = 5;

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractDomain(url) {
  if (!url || url === 'N/A') return null;
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    try { return new URL(`https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
  }
}

function tryConstructDomain(name) {
  if (!name || name === 'N/A' || name.length < 3) return [];
  let slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '').replace(/^(the|a|an|les|le|la|el|der|die|das)/, '').trim();
  if (slug.length < 3) slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  if (slug.length < 3) return [];
  return ['.com', '.net', '.org', '.io', '.co', '.us', '.biz', '.info'].map(t => `https://${slug}${t}`);
}

function generateEmailPatterns(domain) {
  if (!domain) return [];
  const seen = new Set();
  const emails = [];
  for (const prefix of EMAIL_PATTERNS) {
    const p = prefix.replace('@', '');
    const e = `${p}@${domain}`;
    if (!seen.has(e)) { seen.add(e); emails.push(e); }
  }
  return emails;
}

function extractEmails(text) {
  if (!text) return [];
  const found = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  return [...new Set(found)].filter(e => {
    const l = e.toLowerCase();
    return !SKIP_PATTERNS.some(s => l.includes(s)) && !l.endsWith('.png') && !l.endsWith('.jpg') && !l.endsWith('.svg') && !l.endsWith('.css');
  });
}

function extractPhones(text) {
  if (!text) return [];
  const phones = [];
  const patterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g
  ];
  for (const regex of patterns) {
    const m = text.match(regex);
    if (m) phones.push(...m);
  }
  return [...new Set(phones)].filter(p => { const d = p.replace(/[^\d]/g, ''); return d.length >= 7 && d.length <= 15; });
}

function extractSocialLinks(html) {
  const social = { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' };
  const p = {
    facebook: /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/([^"'<>\s?/]+)/gi,
    instagram: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/([^"'<>\s?/]+)/gi,
    twitter: /(?:https?:)?\/\/(?:www\.)?(?:twitter|x)\.com\/([^"'<>\s?/]+)/gi,
    linkedin: /(?:https?:)?\/\/(?:www\.)?linkedin\.com\/(company|in|school|showcase)\/([^"'<>\s?/]+)/gi,
    youtube: /(?:https?:)?\/\/(?:www\.)?(?:youtube|youtu\.be)\/(@?[^"'<>\s?/]+)/gi
  };
  for (const [key, regex] of Object.entries(p)) {
    regex.lastIndex = 0;
    const m = regex.exec(html);
    if (m) social[key] = m[0].toLowerCase().replace(/\/$/, '').replace(/^(https?:)?\/\/(www\.)?/, '');
  }
  return social;
}

function extractStructuredData(html) {
  const data = { name: '', description: '', email: '', phone: '', address: '', sameAs: [], openingHours: '' };
  const blocks = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return data;
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.replace(/<[^>]+>/g, '').trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item.description && !data.description) data.description = item.description;
        if (item.email && !data.email) data.email = item.email;
        if (item.telephone && !data.phone) data.phone = item.telephone;
        if (item.openingHours && !data.openingHours) data.openingHours = Array.isArray(item.openingHours) ? item.openingHours.join(', ') : item.openingHours;
        if (item.name && !data.name) data.name = item.name;
        if (item.sameAs) data.sameAs.push(...(Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs]));
        const addr = item.address || item.location;
        if (addr) {
          const parts = [];
          if (addr.streetAddress) parts.push(addr.streetAddress);
          if (addr.addressLocality) parts.push(addr.addressLocality);
          if (addr.addressRegion) parts.push(addr.addressRegion);
          if (addr.postalCode) parts.push(addr.postalCode);
          if (addr.addressCountry) parts.push(typeof addr.addressCountry === 'object' ? addr.addressCountry.name || '' : addr.addressCountry);
          if (parts.length > (data.address ? data.address.split(',').length : 0)) data.address = parts.join(', ');
        }
        if (item.contactPoint) {
          const cps = Array.isArray(item.contactPoint) ? item.contactPoint : [item.contactPoint];
          for (const cp of cps) {
            if (cp.email && !data.email) data.email = cp.email;
            if (cp.telephone && !data.phone) data.phone = cp.telephone;
          }
        }
      }
    } catch {}
  }
  return data;
}

function extractMeta(html, names) {
  if (!html) return '';
  for (const name of Array.isArray(names) ? names : [names]) {
    const patterns = [
      new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+property=["']og:${name}["']\\s+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+name=["']twitter:${name}["']\\s+content=["']([^"']+)["']`, 'i')
    ];
    for (const p of patterns) {
      const m = p.exec(html);
      if (m) return m[1].trim();
    }
  }
  return '';
}

function extractSection(html, keywords, maxLen = 200) {
  if (!html) return '';
  for (const kw of keywords) {
    const patterns = [
      new RegExp(`${kw}\\s*[:\\-–]?\\s*([^<.]+?(?:\\.(?:\\s|$)|$))`, 'gi'),
      new RegExp(`${kw}[\\s\\S]{0,5}?<[^>]+>([^<]+)</`, 'gi')
    ];
    for (const p of patterns) {
      const m = p.exec(html);
      if (m) { const v = m[1].trim(); if (v.length > 3 && v.length < maxLen) return v; }
    }
  }
  return '';
}

function findHREmail(html, domain) {
  const hrEmails = new Set();
  for (const email of extractEmails(html)) {
    const local = email.split('@')[0].toLowerCase();
    if (HR_PREFIXES.some(p => local.includes(p)) || /recruit|talent|people|staff|employ|workforce/i.test(local)) hrEmails.add(email);
  }
  if (domain) { for (const p of HR_PREFIXES) hrEmails.add(`${p}@${domain}`); }
  return [...hrEmails];
}

function extractTitle(html) {
  if (!html) return '';
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/\s*[|–-–—].*$/, '').trim() : '';
}

function extractPaymentMethods(html) {
  if (!html) return [];
  const methods = [];
  const keywords = ['visa', 'mastercard', 'amex', 'paypal', 'apple pay', 'google pay', 'stripe', 'discover', 'bitcoin', 'venmo', 'zelle'];
  const lower = html.toLowerCase();
  for (const kw of keywords) { if (lower.includes(kw)) methods.push(kw); }
  return [...new Set(methods)];
}

async function fetchUrl(url, timeout = 5000) {
  if (domainCache.has(url)) return domainCache.get(url);
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': getRandomUA(), 'Accept': 'text/html', 'Accept-Language': 'en-US' }
    });
    if (!resp.ok || !resp.headers.get('content-type')?.includes('text/html')) { domainCache.set(url, ''); return ''; }
    const text = await resp.text();
    domainCache.set(url, text);
    return text;
  } catch { domainCache.set(url, ''); return ''; }
}

async function throttledFetch(urls, maxConcurrent = MAX_CONCURRENT, timeout = 4000) {
  const results = [];
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const settled = await Promise.allSettled(batch.map(u => fetchUrl(u, timeout)));
    results.push(...settled.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value));
  }
  return results;
}

export async function enrichBusiness(business) {
  const enriched = { ...business, _enriched: true };
  const domain = extractDomain(business.website);
  let htmls = [];
  let foundDomain = domain;

  if (domain) {
    htmls = await throttledFetch([`https://${domain}`, `https://www.${domain}`, `http://${domain}`], 3, 5000);
  }

  if (!htmls.length && business.name) {
    const constructed = tryConstructDomain(business.name);
    const results = await throttledFetch(constructed, 5, 4000);
    if (results.length) {
      const foundUrl = constructed[constructed.indexOf(constructed.find((u, i) => results[i]))];
      if (foundUrl) {
        foundDomain = extractDomain(foundUrl);
        if (foundDomain && (!enriched.website || enriched.website === 'N/A')) { enriched.website = foundUrl; enriched._website_source = 'constructed'; }
        htmls = results;
      }
    }
  }

  if (foundDomain) {
    const paths = SUBPAGES.map(p => `https://${foundDomain}${p}`);
    const subResults = await throttledFetch(paths, 5, 3000);
    htmls.push(...subResults);
  }

  const combinedHtml = htmls.join(' ');
  const mainHtml = htmls[0] || combinedHtml;
  const structured = extractStructuredData(combinedHtml);
  const sideHtml = htmls.slice(1).join(' ');

  if (!enriched.email || enriched.email === 'N/A') {
    if (structured.email) { enriched.email = structured.email; enriched._email_source = 'structured_data'; }
  }
  if (!enriched.email || enriched.email === 'N/A') {
    const allEmails = extractEmails(combinedHtml);
    const best = allEmails.filter(e => {
      const local = e.split('@')[0].toLowerCase();
      return !HR_PREFIXES.some(p => local.includes(p)) && !['info', 'contact', 'support', 'admin', 'noreply', 'hello', 'mail'].includes(local);
    });
    if (best.length > 0) { enriched.email = best[0]; enriched._email_source = 'scraped'; }
    else if (allEmails.length > 0) { enriched.email = allEmails[0]; enriched._email_source = 'scraped_fallback'; }
  }
  if (!enriched.email || enriched.email === 'N/A') {
    if (foundDomain) {
      enriched.email_patterns = generateEmailPatterns(foundDomain);
      enriched.email = enriched.email_patterns[0];
      enriched._email_source = 'generated';
    }
  }
  if (foundDomain && !enriched.email_patterns) enriched.email_patterns = generateEmailPatterns(foundDomain);

  if (!enriched.phone || enriched.phone === 'N/A') {
    if (structured.phone) { enriched.phone = structured.phone.replace(/[^\d+]/g, ''); enriched._phone_source = 'structured_data'; }
  }
  if (!enriched.phone || enriched.phone === 'N/A') {
    const phones = extractPhones(combinedHtml);
    if (phones.length > 0) { enriched.phone = phones[0].replace(/[^\d+]/g, ''); enriched._phone_source = 'scraped'; }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    if (structured.description) { enriched.description = structured.description; enriched._desc_source = 'structured_data'; }
  }
  if (!enriched.description || enriched.description === 'N/A') {
    const meta = extractMeta(mainHtml, ['description']);
    if (meta) { enriched.description = meta; enriched._desc_source = 'meta'; }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    if (structured.address) { enriched.address = structured.address; enriched._address_source = 'structured_data'; }
  }
  if (!enriched.address || enriched.address === 'N/A') {
    const addr = extractSection(combinedHtml, [
      'Address', 'address', 'Location', 'Visit us', 'Find us',
      'Headquarters', 'Corporate Office', 'Main Office',
      'Office Address', 'Registered Office'
    ]);
    if (addr) { enriched.address = addr; enriched._address_source = 'scraped'; }
  }
  if (!enriched.address || enriched.address === 'N/A') {
    const addr = extractSection(sideHtml, ['Address', 'address', 'Location', 'Headquarters', 'Office']);
    if (addr) { enriched.address = addr; enriched._address_source = 'scraped_subpage'; }
  }
  if (!enriched.address || enriched.address === 'N/A') {
    if (business.lat && business.lon) { enriched.address = `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)}`; enriched._address_source = 'coordinates'; }
  }

  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    if (structured.openingHours) { enriched.opening_hours = structured.openingHours; enriched._hours_source = 'structured_data'; }
  }
  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    const hours = extractSection(combinedHtml, [
      'Opening Hours', 'Opening hours', 'Business hours', 'Hours of operation',
      'Store hours', 'Open hours', 'opening_hours', 'Office Hours', 'Working Hours'
    ]);
    if (hours) { enriched.opening_hours = hours; enriched._hours_source = 'scraped'; }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    const parts = [];
    if (enriched.name) parts.push(enriched.name);
    if (enriched.type && enriched.type !== 'N/A') parts.push(`(${enriched.type})`);
    if (enriched.address && enriched.address !== 'Address not available' && !enriched.address.includes('(see map)')) parts.push(`at ${enriched.address}`);
    if (enriched.cuisine) parts.push(`cuisine: ${enriched.cuisine}`);
    if (enriched.brand) parts.push(`brand: ${enriched.brand}`);
    if (parts.length > 0) { enriched.description = parts.join(' | '); enriched._desc_source = 'composite'; }
  }

  const social = extractSocialLinks(combinedHtml);
  const socialSide = extractSocialLinks(sideHtml);
  if (!enriched.facebook) enriched.facebook = social.facebook || socialSide.facebook;
  if (!enriched.instagram) enriched.instagram = social.instagram || socialSide.instagram;
  if (!enriched.twitter) enriched.twitter = social.twitter || socialSide.twitter;
  if (!enriched.linkedin) enriched.linkedin = social.linkedin || socialSide.linkedin || enriched.linkedin || '';
  if (!enriched.youtube) enriched.youtube = social.youtube || socialSide.youtube || '';

  if (structured.sameAs?.length) {
    for (const url of structured.sameAs) {
      const l = url.toLowerCase();
      if (!enriched.facebook && l.includes('facebook.com')) enriched.facebook = url;
      if (!enriched.instagram && l.includes('instagram.com')) enriched.instagram = url;
      if (!enriched.twitter && (l.includes('twitter.com') || l.includes('x.com'))) enriched.twitter = url;
      if (!enriched.linkedin && l.includes('linkedin.com')) enriched.linkedin = url;
      if (!enriched.youtube && l.includes('youtube.com')) enriched.youtube = url;
    }
  }

  const payments = extractPaymentMethods(combinedHtml);
  if (payments.length && !enriched.payment) enriched.payment = payments.join(', ');

  if (!enriched.type || enriched.type === 'N/A' || !enriched.category || enriched.category === 'N/A') {
    const title = extractTitle(mainHtml);
    const textToCheck = `${title} ${mainHtml ? mainHtml.slice(0, 3000) : ''}`;
    const typeKeywords = {
      restaurant: /restaurant|menu|catering|kitchen|chef|dining|bistro|eatery|food|grill|pizzeria|steakhouse/i,
      cafe: /cafe|café|coffee|bakery|pastry|espresso|tea\s*house|roastery|coffeeshop/i,
      hotel: /hotel|lodging|accommodation|resort|inn|suite|motel|hostel/i,
      clinic: /clinic|medical|healthcare|doctor|patient|health\s*center/i,
      hospital: /hospital|emergency|medical\s*center/i,
      pharmacy: /pharmacy|drugstore|chemist|prescription|pharma/i,
      school: /school|academy|learning|education|college|institute/i,
      university: /university|higher\s*education/i,
      bank: /bank|banking|financial|credit\s*union|mortgage|loan/i,
      office: /office|corporate|headquarters|company|enterprise|business\s*center/i,
      shop: /shop|store|retail|ecommerce|boutique|shopping|market/i,
      dentist: /dentist|dental|teeth|oral\s*care|orthodontist/i,
      car_rental: /car\s*rental|rent-a-car|vehicle\s*rental|auto\s*rental/i,
      supermarket: /supermarket|grocery|food\s*market|grocer/i,
      mall: /mall|shopping\s*center|shopping\s*plaza/i,
      bar: /bar|pub|tavern|nightclub|cocktail|brewery/i
    };
    for (const [type, regex] of Object.entries(typeKeywords)) {
      if (regex.test(textToCheck)) {
        if (!enriched.type || enriched.type === 'N/A') enriched.type = type;
        if (!enriched.category || enriched.category === 'N/A') enriched.category = type;
        break;
      }
    }
  }

  if ((!enriched.type || enriched.type === 'N/A') && enriched.name) {
    const nl = enriched.name.toLowerCase();
    for (const [type, regex] of Object.entries({
      restaurant: /restaurant|cafe|bistro|grill|kitchen|pizza|sushi|diner/i,
      hotel: /hotel|inn|resort|suites|motel/i,
      clinic: /clinic|medical|healthcare|med/i,
      pharmacy: /pharmacy|drugs?|chemist/i,
      school: /school|academy|preschool/i,
      bank: /bank|credit\s*union/i,
      shop: /shop|store|mart|boutique/i,
      dentist: /dentist|dental/i,
      bar: /bar|pub|tavern|brewery/i
    })) {
      if (regex.test(nl)) { enriched.type = type; enriched.category = type; break; }
    }
  }

  const isOffice = enriched.type === 'office' || (enriched.name && /\b(?:LLC|Inc|Corp|Ltd|GmbH|Pty|Limited|Company|Enterprise|Corporation|Incorporated|PLC|SA|AG|SE|BV|NV)\b/i.test(enriched.name));

  if (!enriched.type || enriched.type === 'N/A') { enriched.type = isOffice ? 'office' : 'business'; enriched.category = enriched.type; }

  const hrEmails = findHREmail(combinedHtml, foundDomain || '');
  let bestHr = '';
  if (hrEmails.length > 0) {
    const realHr = hrEmails.filter(e => !HR_PREFIXES.some(p => e === `${p}@${foundDomain}`));
    bestHr = realHr.length > 0 ? realHr[0] : hrEmails[0];
    enriched.hr_emails = hrEmails;
    enriched._has_hr = true;
    enriched._hr_source = realHr.length > 0 ? 'scraped' : 'pattern';
  }

  if (!bestHr && isOffice && foundDomain) {
    const candidates = HR_PREFIXES.map(p => `${p}@${foundDomain}`);
    const general = enriched.email;
    for (const hr of candidates) {
      if (hr !== general) { bestHr = hr; enriched._hr_source = 'auto_generated'; break; }
    }
    enriched.hr_emails = candidates.filter(h => h !== general);
  }

  if (!bestHr && foundDomain && isOffice) { bestHr = `hr@${foundDomain}`; enriched._hr_source = 'default'; }

  if (bestHr && (!enriched.email || enriched.email === 'N/A' || bestHr !== enriched.email)) enriched.hr_email = bestHr;
  if (!enriched.hr_email && enriched.hr_emails?.length) {
    const first = enriched.hr_emails[0];
    if (first !== enriched.email) enriched.hr_email = first;
  }

  const allFields = ['type', 'category', 'subcategory', 'phone', 'address', 'website', 'email', 'opening_hours', 'description', 'brand', 'operator', 'cuisine', 'building'];
  const labels = {
    type: isOffice ? 'Office/Company' : 'Business', category: 'General',
    phone: 'Phone not listed', email: 'Email not available',
    website: 'Website not available',
    opening_hours: isOffice ? 'Mon-Fri 9:00 AM - 5:00 PM' : 'Hours not available',
    description: isOffice ? `Office/Company at ${enriched.address || `${business.lat?.toFixed(4) || ''}, ${business.lon?.toFixed(4) || ''}`}` : 'No description available',
    address: business.lat && business.lon ? `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)}` : 'Address not available'
  };
  for (const field of allFields) {
    if (!enriched[field] || enriched[field].toString().trim() === '') {
      enriched[field] = labels[field] || '';
    }
  }

  if (!enriched.email && enriched.hr_email) { enriched.email = enriched.hr_email; enriched._email_source = 'from_hr'; }
  if (!enriched.email_patterns && foundDomain) enriched.email_patterns = generateEmailPatterns(foundDomain);

  delete enriched.all_tags;
  return enriched;
}

async function enrichSingle(business) {
  try {
    return await enrichBusiness(business);
  } catch (error) {
    console.error(`Enrich failed for ${business.name}:`, error);
    const fb = { ...business, _enriched_error: true, _enriched: true };
    const fields = ['type', 'category', 'subcategory', 'phone', 'address', 'website', 'email', 'opening_hours', 'description'];
    for (const f of fields) {
      if (!fb[f] || fb[f].toString().trim() === '') {
        fb[f] = f === 'description' ? 'No description available' : f === 'email' ? 'Email not available' : f === 'phone' ? 'Phone not listed' : f === 'address' ? `See map at ${fb.lat?.toFixed(4)}, ${fb.lon?.toFixed(4)}` : 'Not available';
      }
    }
    return fb;
  }
}

export async function enrichAll(businesses, onProgress) {
  const results = [];
  const batchSize = 3;
  for (let i = 0; i < businesses.length; i += batchSize) {
    const batch = businesses.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(b => enrichSingle(b)));
    settled.forEach((r, idx) => {
      results.push(r.status === 'fulfilled' ? r.value : { ...batch[idx], _enriched_error: true, _enriched: true });
    });
    if (onProgress) onProgress(results.length, businesses.length);
  }
  return results;
}
