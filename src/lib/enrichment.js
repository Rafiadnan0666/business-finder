const EMAIL_PATTERNS = [
  'info', 'contact', 'hello', 'support', 'admin',
  'office', 'enquiries', 'enquiry', 'mail', 'business',
  'hr', 'careers', 'jobs', 'recruitment', 'hiring',
  'talent', 'people', 'hrteam', 'personnel', 'team',
  'sales', 'help', 'feedback', 'service', 'customerservice',
  'partners', 'vendors', 'procurement', 'finance', 'accounting',
  'marketing', 'pr', 'media', 'press', 'editor',
  'manager', 'management', 'director', 'ceo', 'founder',
  'operations', 'logistics', 'shipping', 'orders', 'billing'
];

const HR_PREFIXES = [
  'hr', 'careers', 'recruitment', 'jobs', 'hiring',
  'talent', 'people', 'personnel', 'hrteam', 'hrdept',
  'humanresources', 'employement', 'staffing', 'workwithus',
  'joinus', 'career', 'job', 'recruiter', 'talentacquisition'
];

const SKIP_PATTERNS = [
  'noreply', 'no-reply', 'donotreply', 'no_reply',
  'example.com', 'domain.com', 'yourname', 'your@',
  '@email.com', '@gmail.com', '@yahoo.com', '@hotmail.com',
  '@outlook.com', '@aol.com', '@mail.com', '@yopmail.com',
  '@tempmail', '@test.com', '@sample.com'
];

const SUBPAGES = [
  '', '/contact', '/about', '/team', '/careers', '/hr',
  '/jobs', '/recruitment', '/contact-us', '/about-us',
  '/reach-us', '/get-in-touch', '/contactus', '/aboutus',
  '/locations', '/store-locator', '/find-us', '/connect',
  '/support', '/help', '/faq', '/services'
];

function extractDomain(url) {
  if (!url || url === 'N/A') return null;
  try {
    const str = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(str);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    try {
      const u = new URL(`https://${url}`);
      return u.hostname.replace(/^www\./, '').toLowerCase();
    } catch { return null; }
  }
}

function tryConstructDomain(name, type) {
  if (!name || name === 'N/A' || name.length < 3) return [];
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '')
    .replace(/^(the|a|an)/, '')
    .trim();
  if (slug.length < 3) return [];
  const tlds = ['.com', '.net', '.org', '.io', '.co', '.us', '.biz', '.info'];
  const urls = [];
  for (const tld of tlds) {
    urls.push(`https://${slug}${tld}`);
  }
  return urls;
}

function generateEmailPatterns(domain) {
  if (!domain) return [];
  const seen = new Set();
  const emails = [];
  for (const prefix of EMAIL_PATTERNS) {
    const e = `${prefix}@${domain}`;
    if (!seen.has(e)) { seen.add(e); emails.push(e); }
  }
  return emails;
}

function extractEmailsFromText(text) {
  if (!text) return [];
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = text.match(emailRegex) || [];
  return found.filter(email => {
    const lower = email.toLowerCase();
    return !SKIP_PATTERNS.some(skip => lower.includes(skip));
  });
}

function extractPhonesFromText(text) {
  if (!text) return [];
  const patterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g,
    /\d{4}[\s.-]\d{3}[\s.-]\d{4}/g
  ];
  const phones = [];
  for (const regex of patterns) {
    const matches = text.match(regex);
    if (matches) phones.push(...matches);
  }
  return [...new Set(phones)].filter(p => p.replace(/[^\d]/g, '').length >= 7);
}

function extractSocialLinks(html) {
  const social = { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '', tiktok: '' };
  const patterns = {
    facebook: /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/([^"'<>\s?/]+)/gi,
    instagram: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/([^"'<>\s?/]+)/gi,
    twitter: /(?:https?:)?\/\/(?:www\.)?(?:twitter|x)\.com\/([^"'<>\s?/]+)/gi,
    linkedin: /(?:https?:)?\/\/(?:www\.)?linkedin\.com\/(company|in|school)\/([^"'<>\s?/]+)/gi,
    youtube: /(?:https?:)?\/\/(?:www\.)?youtube\.com\/(@?[^"'<>\s?/]+)/gi,
    tiktok: /(?:https?:)?\/\/(?:www\.)?tiktok\.com\/(@?[^"'<>\s?/]+)/gi
  };
  for (const [key, regex] of Object.entries(patterns)) {
    regex.lastIndex = 0;
    const match = regex.exec(html);
    if (match) {
      social[key] = match[0].toLowerCase().replace(/\/$/, '')
        .replace(/^(?:https?:)?\/\/(?:www\.)?/, '');
    }
  }
  return social;
}

function extractStructuredData(html) {
  const data = { name: '', description: '', email: '', phone: '', address: '', sameAs: [] };
  const ldJsonMatches = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ldJsonMatches) {
    for (const block of ldJsonMatches) {
      try {
        const json = JSON.parse(block.replace(/<[^>]+>/g, ''));
        const items = Array.isArray(json) ? json : [json];
        for (const item of items) {
          if (item.description && !data.description) data.description = item.description;
          if (item.email && !data.email) data.email = item.email;
          if (item.telephone && !data.phone) data.phone = item.telephone;
          if (item.address?.streetAddress) data.address = `${item.address.streetAddress}${item.address.addressLocality ? ', ' + item.address.addressLocality : ''}${item.address.addressCountry ? ', ' + item.address.addressCountry : ''}`;
          if (item.sameAs) {
            const links = Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs];
            data.sameAs.push(...links);
          }
          if (item.name && !data.name) data.name = item.name;
          if (item.url && !data.name) data.name = item.url;
        }
      } catch { /* skip invalid JSON-LD */ }
    }
  }
  return data;
}

function extractMetaContent(html, names) {
  if (!html) return '';
  for (const name of Array.isArray(names) ? names : [names]) {
    const patterns = [
      new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+property=["']og:${name}["']\\s+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+name=["']twitter:${name}["']\\s+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta\\s+property=["']twitter:${name}["']\\s+content=["']([^"']+)["']`, 'i')
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match) return match[1].trim();
    }
  }
  return '';
}

function extractSection(html, keywords) {
  if (!html) return '';
  for (const keyword of keywords) {
    const patterns = [
      new RegExp(`${keyword}\\s*[:\\-–]?\\s*([^<.]+?(?:\\.(?:\\s|$)|$))`, 'gi'),
      new RegExp(`${keyword}[\\s\\S]{0,5}?<[^>]+>([^<]+)</`, 'gi'),
      new RegExp(`<[^>]+>${keyword}[\\s\\S]{0,5}?<[^>]+>([^<]+)</`, 'gi')
    ];
    for (const pattern of patterns) {
      const match = pattern.exec(html);
      if (match) {
        const val = match[1].trim();
        if (val.length > 3 && val.length < 200) return val;
      }
    }
  }
  return '';
}

function findHREmail(html, domain) {
  const hrEmails = new Set();
  const allEmails = extractEmailsFromText(html);
  for (const email of allEmails) {
    const local = email.split('@')[0].toLowerCase();
    if (HR_PREFIXES.some(prefix => local.includes(prefix))) {
      hrEmails.add(email);
    }
  }
  if (domain) {
    for (const prefix of HR_PREFIXES) {
      hrEmails.add(`${prefix}@${domain}`);
    }
  }
  return [...hrEmails];
}

function extractTitle(html) {
  if (!html) return '';
  const match = html.match(/<title>([^<]+)<\/title>/i);
  return match ? match[1].trim().replace(/\s*[|–-].*$/, '').trim() : '';
}

function extractFooterText(html) {
  if (!html) return '';
  const match = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
  return match ? match[1] : '';
}

async function fetchUrl(url, timeout = 6000) {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
    });
    if (!resp.ok) return '';
    return await resp.text();
  } catch { return ''; }
}

function ensureNoBlanks(obj, fields) {
  for (const field of fields) {
    if (!obj[field] || obj[field].toString().trim() === '' || obj[field] === 'N/A') {
      obj[field] = '';
    }
  }
  return obj;
}

export async function enrichBusiness(business) {
  const enriched = { ...business, _enriched: true };
  const domain = extractDomain(business.website);
  let html = '';
  let foundDomain = domain;

  if (domain) {
    const urlsToTry = [
      `https://${domain}`,
      `https://www.${domain}`,
      `http://${domain}`,
      `http://www.${domain}`
    ];
    for (const url of urlsToTry) {
      html = await fetchUrl(url);
      if (html) { foundDomain = domain; break; }
    }
  }

  if (!html && !domain && business.name) {
    const constructedUrls = tryConstructDomain(business.name, business.type);
    for (const url of constructedUrls) {
      html = await fetchUrl(url);
      if (html) {
        foundDomain = extractDomain(url);
        if (!enriched.website || enriched.website === 'N/A') {
          enriched.website = url;
          enriched._website_source = 'constructed';
        }
        break;
      }
    }
  }

  const allHtml = [html];
  if (foundDomain) {
    for (const path of SUBPAGES) {
      if (!path) continue;
      const subHtml = await fetchUrl(`https://${foundDomain}${path}`, 4000);
      if (subHtml) allHtml.push(subHtml);
      if (!subHtml) {
        const subHtml2 = await fetchUrl(`https://www.${foundDomain}${path}`, 4000);
        if (subHtml2) allHtml.push(subHtml2);
      }
    }
  }

  const combinedHtml = allHtml.join(' ');

  let structured = { name: '', description: '', email: '', phone: '', address: '', sameAs: [] };
  if (combinedHtml) {
    structured = extractStructuredData(combinedHtml);
  }

  const mainHtml = html || combinedHtml;

  if (!enriched.email || enriched.email === 'N/A') {
    const sdEmail = structured.email;
    if (sdEmail) {
      enriched.email = sdEmail;
      enriched._email_source = 'structured_data';
    }
  }

  if (!enriched.email || enriched.email === 'N/A') {
    const scrapedEmails = extractEmailsFromText(combinedHtml);
    const validEmails = scrapedEmails.filter(e => {
      const local = e.split('@')[0].toLowerCase();
      return !HR_PREFIXES.some(p => local.includes(p)) &&
        !['info', 'contact', 'support', 'admin', 'noreply'].includes(local);
    });
    if (validEmails.length > 0) {
      enriched.email = validEmails[0];
      enriched._email_source = 'scraped';
    } else if (scrapedEmails.length > 0) {
      enriched.email = scrapedEmails[0];
      enriched._email_source = 'scraped_fallback';
    }
  }

  if (!enriched.email || enriched.email === 'N/A') {
    if (foundDomain) {
      const patterns = generateEmailPatterns(foundDomain);
      enriched.email = patterns[0];
      enriched.email_patterns = patterns;
      enriched._email_source = 'generated';
    }
  }

  if (foundDomain && !enriched.email_patterns) {
    enriched.email_patterns = generateEmailPatterns(foundDomain);
  }

  if (!enriched.phone || enriched.phone === 'N/A') {
    const sdPhone = structured.phone;
    if (sdPhone) {
      enriched.phone = sdPhone.replace(/[^\d+]/g, '');
      enriched._phone_source = 'structured_data';
    }
  }

  if (!enriched.phone || enriched.phone === 'N/A') {
    const phones = extractPhonesFromText(combinedHtml);
    if (phones.length > 0) {
      enriched.phone = phones[0].replace(/[^\d+]/g, '');
      enriched._phone_source = 'scraped';
    }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    const sdDesc = structured.description;
    if (sdDesc) {
      enriched.description = sdDesc;
      enriched._desc_source = 'structured_data';
    }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    const metaDesc = extractMetaContent(mainHtml, ['description']);
    if (metaDesc) {
      enriched.description = metaDesc;
      enriched._desc_source = 'meta';
    }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    const sdAddr = structured.address;
    if (sdAddr) {
      enriched.address = sdAddr;
      enriched._address_source = 'structured_data';
    }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    const addr = extractSection(combinedHtml, [
      'Address', 'address', 'Location', 'location',
      'Visit us', 'Find us', 'Street address', 'Our address',
      'Headquarters', 'Corporate Office', 'Main Office',
      'Office Address', 'Registered Office'
    ]);
    if (addr) {
      enriched.address = addr;
      enriched._address_source = 'scraped';
    }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    if (business.lat && business.lon) {
      enriched.address = `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)} (see map)`;
      enriched._address_source = 'coordinates';
    }
  }

  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    const hours = extractSection(combinedHtml, [
      'Opening Hours', 'Opening hours', 'Business hours',
      'Hours of operation', 'Store hours', 'Open hours',
      'opening_hours', 'Office Hours', 'Working Hours',
      'Service Hours', 'Hours', 'hours'
    ]);
    if (hours) {
      enriched.opening_hours = hours;
      enriched._hours_source = 'scraped';
    }
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
    if (enriched._enriched && enriched.website && enriched.website !== 'N/A') parts.push(`website: ${enriched.website}`);
    if (parts.length > 0) {
      enriched.description = parts.join(' | ');
      enriched._desc_source = 'composite';
    }
  }

  const social = extractSocialLinks(combinedHtml);
  if (!enriched.facebook) enriched.facebook = social.facebook;
  if (!enriched.instagram) enriched.instagram = social.instagram;
  if (!enriched.twitter) enriched.twitter = social.twitter;
  if (!enriched.linkedin) {
    enriched.linkedin = social.linkedin || enriched.linkedin || '';
  }
  if (!enriched.youtube) enriched.youtube = social.youtube || '';
  if (!enriched.tiktok) enriched.tiktok = social.tiktok || '';

  if (structured.sameAs && structured.sameAs.length > 0) {
    for (const url of structured.sameAs) {
      const lower = url.toLowerCase();
      if (!enriched.facebook && lower.includes('facebook.com')) enriched.facebook = url;
      if (!enriched.instagram && lower.includes('instagram.com')) enriched.instagram = url;
      if (!enriched.twitter && (lower.includes('twitter.com') || lower.includes('x.com'))) enriched.twitter = url;
      if (!enriched.linkedin && lower.includes('linkedin.com')) enriched.linkedin = url;
      if (!enriched.youtube && lower.includes('youtube.com')) enriched.youtube = url;
    }
  }

  if (!enriched.type || enriched.type === 'N/A' || !enriched.category || enriched.category === 'N/A') {
    const title = extractTitle(mainHtml);
    const typeKeywords = {
      restaurant: /restaurant|menu|catering|kitchen|chef|dining|bistro|eatery|food/i,
      cafe: /cafe|café|coffee|bakery|pastry|espresso|tea\s*house/i,
      hotel: /hotel|lodging|accommodation|resort|inn|suite|motel/i,
      clinic: /clinic|medical|healthcare|doctor|patient|health\s*center/i,
      hospital: /hospital|emergency|medical\s*center/i,
      pharmacy: /pharmacy|drugstore|chemist|prescription|pharma/i,
      school: /school|academy|learning|education|college/i,
      university: /university|higher\s*education|institute/i,
      bank: /bank|banking|financial|credit\s*union|mortgage|loan/i,
      office: /office|corporate|headquarters|head\s*office|headquarters|company|enterprise/i,
      shop: /shop|store|retail|ecommerce|boutique|shopping/i,
      dentist: /dentist|dental|teeth|oral\s*care|orthodontist/i,
      car_rental: /car\s*rental|rent-a-car|vehicle\s*rental|car\s*hire/i,
      supermarket: /supermarket|grocery|food\s*market|grocer/i,
      mall: /mall|shopping\s*center|shopping\s*plaza|retail\s*park/i,
      bar: /bar|pub|tavern|nightclub|cocktail|brewery/i
    };
    const textToCheck = `${title} ${mainHtml ? mainHtml.slice(0, 3000) : ''}`;
    for (const [type, regex] of Object.entries(typeKeywords)) {
      if (regex.test(textToCheck)) {
        if (!enriched.type || enriched.type === 'N/A') enriched.type = type;
        if (!enriched.category || enriched.category === 'N/A') enriched.category = type;
        break;
      }
    }
  }

  if ((!enriched.type || enriched.type === 'N/A') && enriched.building) {
    enriched.type = enriched.building;
  }

  if ((!enriched.type || enriched.type === 'N/A') && enriched.name) {
    const nameLower = enriched.name.toLowerCase();
    for (const [type, regex] of Object.entries({
      restaurant: /restaurant|cafe|bistro|grill|kitchen/i,
      hotel: /hotel|inn|resort|suites/i,
      clinic: /clinic|medical|healthcare/i,
      pharmacy: /pharmacy|drugs?|chemist/i,
      school: /school|academy/i,
      bank: /bank/i,
      shop: /shop|store|mart/i,
      dentist: /dentist|dental/i,
      bar: /bar|pub|tavern/i
    })) {
      if (regex.test(nameLower)) {
        enriched.type = type;
        enriched.category = type;
        break;
      }
    }
  }

  const isOffice = enriched.type === 'office' || (enriched.name && /llc|inc|corp|ltd|gmbh|pty|limited|company|enterprise|corporation|associates|group|partners|consulting|solutions|services|industries|holdings/i.test(enriched.name));

  const hrEmails = findHREmail(combinedHtml, foundDomain || '');
  let bestHr = '';
  if (hrEmails.length > 0) {
    const realHr = hrEmails.filter(e => !HR_PREFIXES.some(p => e === `${p}@${foundDomain}`));
    bestHr = realHr.length > 0 ? realHr[0] : hrEmails[0];
    enriched.hr_emails = hrEmails;
    enriched._has_hr = true;
    if (realHr.length > 0) enriched._hr_source = 'scraped';
    else enriched._hr_source = 'pattern';
  }

  if (!bestHr && isOffice && foundDomain) {
    const hrCandidates = HR_PREFIXES.map(p => `${p}@${foundDomain}`);
    const generalEmail = enriched.email;
    for (const hr of hrCandidates) {
      if (hr !== generalEmail) {
        bestHr = hr;
        enriched._hr_source = 'auto_generated';
        break;
      }
    }
    enriched.hr_emails = hrCandidates.filter(h => h !== generalEmail);
  }

  if (bestHr) {
    if (!enriched.email || enriched.email === 'N/A' || bestHr !== enriched.email) {
      enriched.hr_email = bestHr;
    }
  }

  if (!enriched.hr_email && enriched.hr_emails && enriched.hr_emails.length > 0) {
    const first = enriched.hr_emails[0];
    if (first !== enriched.email) enriched.hr_email = first;
  }

  const allFields = [
    'type', 'category', 'subcategory', 'phone', 'address',
    'website', 'email', 'opening_hours', 'description',
    'brand', 'operator', 'cuisine', 'building'
  ];

  const displayLabels = {
    type: 'Type not specified', category: 'Category not specified',
    phone: 'Phone not listed', email: 'Email not available',
    website: 'Website not available', opening_hours: 'Hours not available',
    description: 'No description available', address: 'Address not available',
    building: '', brand: '', operator: '', cuisine: '',
    subcategory: ''
  };

  for (const field of allFields) {
    if (!enriched[field] || enriched[field].toString().trim() === '') {
      const label = displayLabels[field];
      enriched[field] = label || '';
      if (label) enriched[`_${field}_placeholder`] = true;
    }
  }

  if (!enriched.email && enriched.hr_email) {
    enriched.email = enriched.hr_email;
    enriched._email_source = 'from_hr';
  }

  if (!enriched.phone && enriched.type === 'office' && enriched.website && enriched.website !== 'N/A') {
    enriched._phone_note = 'Check website for phone';
  }

  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    if (isOffice) {
      enriched.opening_hours = 'Mon-Fri 9:00 AM - 5:00 PM (typical office hours)';
      enriched._hours_source = 'estimated';
    }
  }

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
      const fallback = { ...businesses[i], _enriched_error: true, _enriched: true };
      const fields = ['type', 'category', 'subcategory', 'phone', 'address', 'website', 'email', 'opening_hours', 'description'];
      for (const f of fields) {
        if (!fallback[f] || fallback[f].toString().trim() === '') {
          fallback[f] = f === 'type' ? 'Business' : f === 'category' ? 'General' : f === 'description' ? 'No description available' : f === 'email' ? 'Email not available' : f === 'phone' ? 'Phone not listed' : f === 'address' ? 'Address not available' : f === 'website' ? 'Website not available' : f === 'opening_hours' ? 'Hours not available' : '';
        }
      }
      results.push(fallback);
    }
    if (onProgress) onProgress(i + 1, businesses.length);
  }
  return results;
}
