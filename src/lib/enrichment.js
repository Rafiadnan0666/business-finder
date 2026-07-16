const EMAIL_PATTERNS = [
  'info', 'contact', 'hello', 'support', 'admin',
  'office', 'enquiries', 'enquiry', 'mail', 'business',
  'hr', 'careers', 'jobs', 'recruitment', 'hiring',
  'talent', 'people', 'hrteam', 'personnel', 'team',
  'sales', 'help', 'feedback', 'service', 'customerservice',
  'partners', 'vendors', 'procurement', 'finance', 'accounting',
  'marketing', 'pr', 'media', 'press', 'editor',
  'manager', 'management', 'director', 'ceo', 'founder',
  'operations', 'logistics', 'shipping', 'orders', 'billing',
  'bookings', 'reservations', 'appointments', 'registrar',
  'admissions', 'applications', 'info@', 'contact@',
  'customercare', 'customerrelations', 'complaints'
];

const HR_PREFIXES = [
  'hr', 'careers', 'recruitment', 'jobs', 'hiring',
  'talent', 'people', 'personnel', 'hrteam', 'hrdept',
  'humanresources', 'employement', 'staffing', 'workwithus',
  'joinus', 'career', 'job', 'recruiter', 'talentacquisition',
  'hrdepartment', 'employeerelations', 'workforce'
];

const SKIP_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'no_reply',
  'example.com', 'domain.com', 'yourname', 'your@',
  '@email.com', '@gmail.com', '@yahoo.com', '@hotmail.com',
  '@outlook.com', '@aol.com', '@mail.com', '@yopmail.com',
  '@tempmail', '@test.com', '@sample.com', '@example',
  '@domain', '@your', '@name', '@company'
];

const SUBPAGES = [
  '/contact', '/about', '/team', '/careers', '/hr',
  '/jobs', '/recruitment', '/contact-us', '/about-us',
  '/reach-us', '/get-in-touch', '/contactus', '/aboutus',
  '/locations', '/store-locator', '/find-us', '/connect',
  '/support', '/help', '/faq', '/services',
  '/corporate', '/company', '/leadership', '/management',
  '/our-team', '/meet-the-team', '/staff', '/employees',
  '/work-with-us', '/join-our-team', '/current-openings',
  '/offices', '/our-offices', '/worldwide', '/global',
  '/contact/人力资源', '/contact-general',
  '/en/contact', '/en/about', '/en/careers',
  '/contact/email', '/email-us', '/write-to-us',
  '/main/contact.aspx', '/contact.php', '/contact.cfm'
];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
];

const domainCache = new Map();

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractDomain(url) {
  if (!url || url === 'N/A' || (typeof url === 'string' && url.startsWith('N/A'))) return null;
  try {
    const str = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(str);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    try { const u = new URL(`https://${url}`); return u.hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
  }
}

function tryConstructDomain(name) {
  if (!name || name === 'N/A' || name.length < 3) return [];
  let slug = name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '').replace(/^(the|a|an|les|le|la|el|der|die|das)/, '').trim();
  if (slug.length < 3) slug = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  if (slug.length < 3) return [];
  const tlds = ['.com', '.net', '.org', '.io', '.co', '.us', '.biz', '.info', '.co.uk', '.ca', '.com.au', '.de', '.fr', '.eu', '.app', '.online', '.store', '.shop', '.site'];
  return tlds.map(t => `https://${slug}${t}`);
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
  const patterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g,
    /\d{4}[\s.-]\d{3}[\s.-]\d{4}/g,
    /1[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /0\d{2,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/g
  ];
  const phones = [];
  for (const regex of patterns) {
    const m = text.match(regex);
    if (m) phones.push(...m);
  }
  return [...new Set(phones)].filter(p => {
    const d = p.replace(/[^\d]/g, '');
    return d.length >= 7 && d.length <= 15;
  });
}

function extractSocialLinks(html) {
  const social = { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '', tiktok: '', pinterest: '' };
  const p = {
    facebook: /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/([^"'<>\s?/]+)/gi,
    instagram: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/([^"'<>\s?/]+)/gi,
    twitter: /(?:https?:)?\/\/(?:www\.)?(?:twitter|x)\.com\/([^"'<>\s?/]+)/gi,
    linkedin: /(?:https?:)?\/\/(?:www\.)?linkedin\.com\/(company|in|school|showcase)\/([^"'<>\s?/]+)/gi,
    youtube: /(?:https?:)?\/\/(?:www\.)?(?:youtube|youtu\.be)\/(@?[^"'<>\s?/]+)/gi,
    tiktok: /(?:https?:)?\/\/(?:www\.)?tiktok\.com\/(@?[^"'<>\s?/]+)/gi,
    pinterest: /(?:https?:)?\/\/(?:www\.)?pinterest\.[a-z.]+\/([^"'<>\s?/]+)/gi
  };
  for (const [key, regex] of Object.entries(p)) {
    regex.lastIndex = 0;
    const m = regex.exec(html);
    if (m) social[key] = m[0].toLowerCase().replace(/\/$/, '').replace(/^(https?:)?\/\/(www\.)?/, '');
  }
  return social;
}

function extractStructuredData(html) {
  const data = { name: '', description: '', email: '', phone: '', address: '', sameAs: [], openingHours: '', url: '' };
  const blocks = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return data;
  for (const block of blocks) {
    try {
      const raw = block.replace(/<[^>]+>/g, '').trim();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item.description && !data.description) data.description = item.description;
        if (item.email && !data.email) data.email = item.email;
        if (item.telephone && !data.phone) data.phone = item.telephone;
        if (item.openingHours && !data.openingHours) data.openingHours = Array.isArray(item.openingHours) ? item.openingHours.join(', ') : item.openingHours;
        if (item.url && !data.url) data.url = item.url;
        if (item.name && !data.name) data.name = item.name;
        if (item.sameAs) {
          const links = Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs];
          data.sameAs.push(...links);
        }
        const address = item.address || item.location;
        if (address) {
          const parts = [];
          if (address.streetAddress) parts.push(address.streetAddress);
          if (address.addressLocality) parts.push(address.addressLocality);
          if (address.addressRegion) parts.push(address.addressRegion);
          if (address.postalCode) parts.push(address.postalCode);
          if (address.addressCountry) parts.push(typeof address.addressCountry === 'object' ? address.addressCountry.name || '' : address.addressCountry);
          if (parts.length > (data.address ? data.address.split(',').length : 0)) data.address = parts.join(', ');
        }
        const geo = item.geo;
        if (geo && !data.address && (geo.latitude || geo.latitude === 0)) {
          data.address = `${geo.latitude}, ${geo.longitude}`;
        }
        if (item.contactPoint) {
          const cps = Array.isArray(item.contactPoint) ? item.contactPoint : [item.contactPoint];
          for (const cp of cps) {
            if (cp.email && !data.email) data.email = cp.email;
            if (cp.telephone && !data.phone) data.phone = cp.telephone;
            if (cp.contactType && cp.contactType.toLowerCase().includes('hr') && cp.email) {
              if (!data.sameAs.includes(cp.email)) data.sameAs.push(cp.email);
            }
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
      new RegExp(`<meta\\s+name=["']twitter:${name}["']\\s+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+property=["']twitter:${name}["']\\s+content=["']([^"']+)["']`, 'i')
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
      new RegExp(`${kw}[\\s\\S]{0,5}?<[^>]+>([^<]+)</`, 'gi'),
      new RegExp(`<[^>]+>${kw}[\\s\\S]{0,5}?<[^>]+>([^<]+)</`, 'gi'),
      new RegExp(`${kw}[\\s\\S]{0,10}?<[^>]+>([^<]+)</`, 'gi')
    ];
    for (const p of patterns) {
      const m = p.exec(html);
      if (m) {
        const v = m[1].trim();
        if (v.length > 3 && v.length < maxLen) return v;
      }
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
  if (domain) {
    for (const p of HR_PREFIXES) hrEmails.add(`${p}@${domain}`);
  }
  return [...hrEmails];
}

function extractTitle(html) {
  if (!html) return '';
  const m = html.match(/<title>([^<]+)<\/title>/i);
  if (!m) return '';
  return m[1].trim().replace(/\s*[|–-–—].*$/, '').replace(/\s*\|.*$/, '').trim();
}

function extractWhatsApp(html) {
  if (!html) return '';
  const p = /(?:wa\.me|whatsapp\.com|api\.whatsapp\.com)\/(?:send\?phone=)?(\d+)/gi;
  const m = p.exec(html);
  return m ? m[1] || m[0] : '';
}

function extractPaymentMethods(html) {
  if (!html) return [];
  const methods = [];
  const keywords = ['visa', 'mastercard', 'amex', 'american express', 'paypal', 'apple pay', 'google pay', 'stripe', 'square', 'discover', 'diners', 'jcb', 'unionpay', 'bitcoin', 'crypto', 'venmo', 'zelle', 'cashapp', 'afterpay', 'klarna', 'affirm', 'sepa', 'wire transfer', 'bank transfer', 'direct debit'];
  const lower = html.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) methods.push(kw);
  }
  return [...new Set(methods)];
}

async function fetchUrl(url, timeout = 5000) {
  if (domainCache.has(url)) return domainCache.get(url);
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': getRandomUA(), 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' }
    });
    if (!resp.ok) { domainCache.set(url, ''); return ''; }
    const text = await resp.text();
    domainCache.set(url, text);
    return text;
  } catch { domainCache.set(url, ''); return ''; }
}

async function parallelFetch(urls, timeout = 4000) {
  const results = await Promise.allSettled(urls.map(u => fetchUrl(u, timeout)));
  return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
}

export async function enrichBusiness(business) {
  const enriched = { ...business, _enriched: true };
  const domain = extractDomain(business.website);
  let htmls = [];
  let foundDomain = domain;

  if (domain) {
    const variants = [`https://${domain}`, `https://www.${domain}`, `http://${domain}`, `http://www.${domain}`];
    htmls = await parallelFetch(variants);
    if (!htmls.length && domain) {
      const wwwDomain = domain.startsWith('www.') ? domain.slice(4) : `www.${domain}`;
      htmls = await parallelFetch([`https://${wwwDomain}`]);
    }
  }

  if (!htmls.length && business.name) {
    const constructed = tryConstructDomain(business.name);
    const results = await parallelFetch(constructed.slice(0, 6));
    if (results.length) {
      const idx = constructed.findIndex((url, i) => results[i] || (i < results.length && results[i - 1]));
      const foundUrl = constructed[constructed.length - results.filter(Boolean).length] || constructed[0];
      foundDomain = extractDomain(foundUrl);
      if (foundDomain && (!enriched.website || enriched.website === 'N/A')) { enriched.website = foundUrl; enriched._website_source = 'constructed'; }
      htmls = results.filter(Boolean);
    }
  }

  if (foundDomain) {
    const paths = SUBPAGES.map(p => `https://${foundDomain}${p}`);
    const wwwPaths = SUBPAGES.map(p => `https://www.${foundDomain}${p}`);
    const subResults = await parallelFetch([...paths, ...wwwPaths], 3000);
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
    const bestEmails = allEmails.filter(e => {
      const local = e.split('@')[0].toLowerCase();
      return !HR_PREFIXES.some(p => local.includes(p)) && !['info', 'contact', 'support', 'admin', 'noreply', 'hello', 'mail'].includes(local);
    });
    if (bestEmails.length > 0) { enriched.email = bestEmails[0]; enriched._email_source = 'scraped'; }
    else if (allEmails.length > 0) { enriched.email = allEmails[0]; enriched._email_source = 'scraped_fallback'; }
  }

  if (!enriched.email || enriched.email === 'N/A') {
    if (foundDomain) {
      const patterns = generateEmailPatterns(foundDomain);
      enriched.email = patterns[0];
      enriched.email_patterns = patterns;
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
      'Address', 'address', 'Location', 'location', 'Visit us', 'Find us',
      'Street address', 'Our address', 'Headquarters', 'Corporate Office',
      'Main Office', 'Office Address', 'Registered Office', 'Physical Address',
      'Mailing Address', 'Postal Address', 'Company Address'
    ]);
    if (addr) { enriched.address = addr; enriched._address_source = 'scraped'; }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    const addr = extractSection(sideHtml, [
      'Address', 'address', 'Location', 'location', 'Headquarters', 'Office'
    ]);
    if (addr) { enriched.address = addr; enriched._address_source = 'scraped_subpage'; }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    if (business.lat && business.lon) {
      enriched.address = `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)} (see map)`;
      enriched._address_source = 'coordinates';
    }
  }

  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    if (structured.openingHours) { enriched.opening_hours = structured.openingHours; enriched._hours_source = 'structured_data'; }
  }

  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    const hours = extractSection(combinedHtml, [
      'Opening Hours', 'Opening hours', 'Business hours', 'Hours of operation',
      'Store hours', 'Open hours', 'opening_hours', 'Office Hours',
      'Working Hours', 'Service Hours', 'Hours', 'hours',
      '营业时间', 'Geschäftszeiten', 'Horaires', 'Orari'
    ]);
    if (hours) { enriched.opening_hours = hours; enriched._hours_source = 'scraped'; }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    const parts = [];
    const name = enriched.name || '';
    const type = enriched.type || '';
    const loc = enriched.address || (business.lat && business.lon ? `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)}` : '');
    if (name) parts.push(name);
    if (type && type !== 'N/A') parts.push(`(${type})`);
    if (loc) parts.push(`located at ${loc}`);
    if (enriched.cuisine) parts.push(`cuisine: ${enriched.cuisine}`);
    if (enriched.brand) parts.push(`brand: ${enriched.brand}`);
    if (enriched.operator) parts.push(`operated by ${enriched.operator}`);
    if (enriched._enriched && enriched.website && enriched.website !== 'N/A') parts.push(`web: ${enriched.website}`);
    if (parts.length > 0) { enriched.description = parts.join(' | '); enriched._desc_source = 'composite'; }
  }

  const social = extractSocialLinks(combinedHtml);
  const socialSide = extractSocialLinks(sideHtml);
  const allSocial = { ...social };
  for (const k of Object.keys(socialSide)) { if (socialSide[k]) allSocial[k] = socialSide[k]; }
  if (!enriched.facebook) enriched.facebook = allSocial.facebook;
  if (!enriched.instagram) enriched.instagram = allSocial.instagram;
  if (!enriched.twitter) enriched.twitter = allSocial.twitter;
  if (!enriched.linkedin) enriched.linkedin = allSocial.linkedin || enriched.linkedin || '';
  if (!enriched.youtube) enriched.youtube = allSocial.youtube || '';
  if (!enriched.tiktok) enriched.tiktok = allSocial.tiktok || '';
  if (!enriched.pinterest) enriched.pinterest = allSocial.pinterest || '';

  if (structured.sameAs && structured.sameAs.length) {
    for (const url of structured.sameAs) {
      const l = url.toLowerCase();
      if (!enriched.facebook && l.includes('facebook.com')) enriched.facebook = url;
      if (!enriched.instagram && l.includes('instagram.com')) enriched.instagram = url;
      if (!enriched.twitter && (l.includes('twitter.com') || l.includes('x.com'))) enriched.twitter = url;
      if (!enriched.linkedin && l.includes('linkedin.com')) enriched.linkedin = url;
      if (!enriched.youtube && l.includes('youtube.com')) enriched.youtube = url;
    }
  }

  const wa = extractWhatsApp(combinedHtml) || extractWhatsApp(sideHtml);
  if (wa) enriched.whatsapp = wa;

  const payments = extractPaymentMethods(combinedHtml);
  if (payments.length && !enriched.payment) enriched.payment = payments.join(', ');

  if (!enriched.type || enriched.type === 'N/A' || !enriched.category || enriched.category === 'N/A') {
    const title = extractTitle(mainHtml);
    const textToCheck = `${title} ${mainHtml ? mainHtml.slice(0, 3000) : ''}`;
    const typeKeywords = {
      restaurant: /restaurant|menu|catering|kitchen|chef|dining|bistro|eatery|food|grill|pizzeria|steakhouse/i,
      cafe: /cafe|café|coffee|bakery|pastry|espresso|tea\s*house|roastery|coffeeshop/i,
      hotel: /hotel|lodging|accommodation|resort|inn|suite|motel|hostel|guesthouse/i,
      clinic: /clinic|medical|healthcare|doctor|patient|health\s*center|medica|healthcare/i,
      hospital: /hospital|emergency|medical\s*center/i,
      pharmacy: /pharmacy|drugstore|chemist|prescription|pharma|drug\s*store/i,
      school: /school|academy|learning|education|college|institute|training/i,
      university: /university|higher\s*education|college/i,
      bank: /bank|banking|financial|credit\s*union|mortgage|loan|finance/i,
      office: /office|corporate|headquarters|head\s*office|company|enterprise|business\s*center/i,
      shop: /shop|store|retail|ecommerce|boutique|shopping|market/i,
      dentist: /dentist|dental|teeth|oral\s*care|orthodontist|endodontist/i,
      car_rental: /car\s*rental|rent-a-car|vehicle\s*rental|car\s*hire|auto\s*rental/i,
      supermarket: /supermarket|grocery|food\s*market|grocer|fresh\s*mart/i,
      mall: /mall|shopping\s*center|shopping\s*plaza|retail\s*park/i,
      bar: /bar|pub|tavern|nightclub|cocktail|brewery|wine\s*bar|sports\s*bar/i
    };
    for (const [type, regex] of Object.entries(typeKeywords)) {
      if (regex.test(textToCheck)) {
        if (!enriched.type || enriched.type === 'N/A') enriched.type = type;
        if (!enriched.category || enriched.category === 'N/A') enriched.category = type;
        break;
      }
    }
  }

  if ((!enriched.type || enriched.type === 'N/A') && enriched.building) enriched.type = enriched.building;

  if ((!enriched.type || enriched.type === 'N/A') && enriched.name) {
    const nl = enriched.name.toLowerCase();
    for (const [type, regex] of Object.entries({
      restaurant: /restaurant|cafe|bistro|grill|kitchen|pizza|sushi|diner|eatery/i,
      hotel: /hotel|inn|resort|suites|motel/i,
      clinic: /clinic|medical|healthcare|med|doctor/i,
      pharmacy: /pharmacy|drugs?|chemist|pharma/i,
      school: /school|academy|preschool|kindergarten/i,
      bank: /bank|credit\s*union/i,
      shop: /shop|store|mart|boutique|emporium/i,
      dentist: /dentist|dental|ortho/i,
      bar: /bar|pub|tavern|brewery/i
    })) {
      if (regex.test(nl)) { enriched.type = type; enriched.category = type; break; }
    }
  }

  if ((!enriched.type || enriched.type === 'N/A') && structured.url) {
    const urlLower = structured.url.toLowerCase();
    const typeFromUrl = {
      restaurant: /restaurant|menu|dining/i,
      hotel: /hotel|resort|lodging/i,
      clinic: /clinic|medical|health/i,
      pharmacy: /pharmacy|drug/i,
      school: /school|academy|learning/i,
      bank: /bank|financial/i,
      shop: /shop|store|product|merch/i
    };
    for (const [type, regex] of Object.entries(typeFromUrl)) {
      if (regex.test(urlLower)) { enriched.type = type; enriched.category = type; break; }
    }
  }

  const isOffice = enriched.type === 'office' || (enriched.name && /\b(?:LLC|Inc|Corp|Ltd|GmbH|Pty|Limited|Company|Enterprise|Corporation|Associates|Group|Partners|Consulting|Solutions|Services|Industries|Holdings|Incorporated|Corporation|PLC|SA|AG|KG|SE|BV|NV|SARL|SAS|SRL|SpA)\b/i.test(enriched.name));

  if (!enriched.type || enriched.type === 'N/A') {
    enriched.type = isOffice ? 'office' : 'business';
    enriched.category = enriched.type;
  }

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

  if (!bestHr && foundDomain && isOffice) {
    const suffixes = ['-team', '-department', '-desk', '-inquiries', '-recruitment'];
    for (const s of suffixes) {
      for (const p of ['hr', 'careers', 'hiring', 'talent']) {
        const e = `${p}${s}@${foundDomain}`;
        if (e !== enriched.email) { bestHr = e; enriched._hr_source = 'extrapolated'; break; }
      }
      if (bestHr) break;
    }
    if (!bestHr) { bestHr = `hr@${foundDomain}`; enriched._hr_source = 'default'; }
  }

  if (bestHr && (!enriched.email || enriched.email === 'N/A' || bestHr !== enriched.email)) {
    enriched.hr_email = bestHr;
  }

  if (!enriched.hr_email && enriched.hr_emails?.length) {
    const first = enriched.hr_emails[0];
    if (first !== enriched.email) enriched.hr_email = first;
  }

  const allFields = [
    'type', 'category', 'subcategory', 'phone', 'address',
    'website', 'email', 'opening_hours', 'description',
    'brand', 'operator', 'cuisine', 'building'
  ];
  const displayLabels = {
    type: isOffice ? 'Office/Company' : 'Business',
    category: 'General',
    phone: 'Phone not listed',
    email: 'Email not available',
    website: 'Website not available',
    opening_hours: isOffice ? 'Mon-Fri 9:00 AM - 5:00 PM (typical office hours)' : 'Hours not available',
    description: isOffice ? `Office/Company at ${business.address || `${business.lat?.toFixed(4) || ''}, ${business.lon?.toFixed(4) || ''} (see map)`}` : 'No description available',
    address: business.lat && business.lon ? `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)} (see map)` : 'Address not available',
    building: '', brand: '', operator: '', cuisine: '', subcategory: ''
  };

  for (const field of allFields) {
    if (!enriched[field] || enriched[field].toString().trim() === '') {
      const label = displayLabels[field];
      enriched[field] = label || '';
    }
  }

  if (!enriched.email && enriched.hr_email) { enriched.email = enriched.hr_email; enriched._email_source = 'from_hr'; }

  if (!enriched.opening_hours || enriched.opening_hours === 'Hours not available') {
    if (isOffice) { enriched.opening_hours = 'Mon-Fri 9:00 AM - 5:00 PM (typical office hours)'; enriched._hours_source = 'estimated'; }
  }

  if (!enriched.email_patterns && foundDomain) enriched.email_patterns = generateEmailPatterns(foundDomain);

  delete enriched.all_tags;
  return enriched;
}

export async function enrichAll(businesses, onProgress) {
  const results = [];
  for (let i = 0; i < businesses.length; i++) {
    try {
      const enriched = await enrichBusiness(businesses[i]);
      results.push(enriched);
    } catch (error) {
      console.error(`Enrich failed for ${businesses[i].name}:`, error);
      const fb = { ...businesses[i], _enriched_error: true, _enriched: true };
      const fields = ['type', 'category', 'subcategory', 'phone', 'address', 'website', 'email', 'opening_hours', 'description'];
      for (const f of fields) {
        if (!fb[f] || fb[f].toString().trim() === '') {
          fb[f] = f === 'description' ? 'No description available' : f === 'email' ? 'Email not available' : f === 'phone' ? 'Phone not listed' : f === 'address' ? 'Address not available' : f === 'website' ? 'Website not available' : f === 'opening_hours' ? 'Hours not available' : '';
        }
      }
      results.push(fb);
    }
    if (onProgress) onProgress(i + 1, businesses.length);
  }
  return results;
}
