const EMAIL_PATTERNS = [
  'info','contact','hello','support','admin','office','enquiries','mail','business',
  'hr','careers','jobs','recruitment','hiring','talent','people','hrteam','personnel','team',
  'sales','help','feedback','service','customerservice','partners','vendors','procurement',
  'finance','accounting','marketing','pr','media','press','operations','logistics','orders','billing',
  'bookings','reservations','appointments','customercare','customerrelations','owner','manager',
  'director','ceo','president','founder','chairman','secretary','reception','receptionist',
  'frontdesk','switchboard','head','chief','executive','admin@',
  'inquiries','enquire','customers','customer','service','serviceuk','serviceus','customersupport',
  'techsupport','supportteam','helpdesk','ithelp','webmaster','hostmaster','postmaster',
  'newsletter','subscribe','unsubscribe','notifications','no-reply','noreply',
  'account','accounts','billing','payments','invoice','invoices','receivables','payables',
  'purchasing','supply','warehouse','distribution','freight','shipping',
  'returns','refunds','warranty','guarantee','claims','insurance',
  'legal','compliance','audit','risk','security','privacy','dpo',
  'investorrelations','investors','shareholders','ir',
  'communications','corpcomms','internalcomms',
  'events','conferences','training','education','learning','academy',
  'research','rnd','development','product','engineering','it','dev','tech',
  'analytics','data','reporting','businessintelligence','bi',
  'strategy','planning','corporate','corp','global','international',
  'admins','sysadmin','network','server','infrastructure',
  'creative','design','ux','graphics','brand',
  'sourcing','talentacquisition','workforce','staffing','employeerelations',
  'interview','onboarding','offboarding','benefits','payroll','compensation',
  'wellness','safety','health','environment','quality'
];

const HR_PREFIXES = ['hr','careers','recruitment','jobs','hiring','talent','people','personnel','hrteam','hrdept','humanresources','staffing','workwithus','joinus','career','job','recruiter','talentacquisition','hrdepartment','employeerelations','workforce','onboarding','offboarding','payroll','benefits','compensation','wellness','safety','employers','staffingagency','workforceplanning'];

const SKIP_PATTERNS = ['noreply','no-reply','donotreply','example.com','domain.com','yourname','your@','@email.com','@gmail.com','@yahoo.com','@hotmail.com','@outlook.com','@aol.com','@mail.com','@yopmail.com','@tempmail','@test.com','@sample.com','@example'];

const SUBPAGES = [
  '/contact','/about','/careers','/hr','/jobs','/contact-us','/about-us',
  '/locations','/team','/offices','/our-team','/leadership','/management',
  '/staff','/employees','/our-people','/people','/directory','/board',
  '/management-team','/our-leadership','/executive-team','/company/team',
  '/team-members','/our-company','/company','/who-we-are',
  '/news','/press','/press-releases','/blog','/our-team-members',
  '/board-of-directors','/executives','/leadership-team',
  '/recruitment','/work-with-us','/join-us','/current-openings',
  '/testimonials','/reviews','/partners','/clients',
  '/our-clients','/our-partners','/investors','/governance',
  '/about/team','/about/leadership','/about/management',
  '/about/our-team','/about/company','/about/careers',
  '/company/leadership','/company/management','/company/careers',
  '/career','/opportunities','/openings','/vacancies',
  '/founders','/our-founders','/advisors','/mentors',
  '/ambassadors','/affiliates','/franchise','/dealers','/distributors',
  '/suppliers','/vendors','/service-providers',
  '/our-mission','/our-vision','/our-values',
  '/corporate-governance','/code-of-conduct','/ethics',
  '/diversity','/inclusion','/community',
  '/sustainability','/esg','/corporate-responsibility',
  '/events','/webinars','/conferences','/speakers',
  '/case-studies','/success-stories','/portfolio',
  '/projects','/work','/our-work',
  '/foundation','/charity','/giving-back'
];

const SUBDOMAINS = [
  'jobs.','careers.','hr.','team.','about.','contact.','people.',
  'staff.','employees.','leadership.','management.','board.',
  'news.','press.','blog.','recruitment.','join.','career.',
  'corp.','investors.','partners.','governance.','events.',
  'community.','engagement.','learning.','academy.','training.',
  'research.','innovation.','design.','creative.','brand.',
  'procurement.','vendors.','suppliers.','logistics.',
  'intranet.','portal.','my.','selfservice.','eservice.',
  'directory.','staffdir.','peoplefinder.','whoswho.',
  'executives.','exec.','leadership.','founders.',
  'sustainability.','responsibility.','foundation.',
  'franchise.','dealer.','partners.',
  'legal.','compliance.','privacy.',
  'investorrelations.','ir.'
];

const SOCIAL_PLATFORMS = {
  facebook: /(?:https?:)?\/\/(?:www\.)?(?:facebook|fb)\.com\/([^"'<>\s?/]+)/gi,
  instagram: /(?:https?:)?\/\/(?:www\.)?instagram\.com\/([^"'<>\s?/]+)/gi,
  twitter: /(?:https?:)?\/\/(?:www\.)?(?:twitter|x)\.com\/([^"'<>\s?/]+)/gi,
  linkedin: /(?:https?:)?\/\/(?:www\.)?linkedin\.com\/(company|in|school|showcase)\/([^"'<>\s?/]+)/gi,
  youtube: /(?:https?:)?\/\/(?:www\.)?(?:youtube|youtu\.be)\/(@?[^"'<>\s?/]+)/gi,
  tiktok: /(?:https?:)?\/\/(?:www\.)?tiktok\.com\/(@?[^"'<>\s?/]+)/gi,
  pinterest: /(?:https?:)?\/\/(?:www\.)?pinterest\.[a-z.]+\/([^"'<>\s?/]+)/gi,
  snapchat: /(?:https?:)?\/\/(?:www\.)?snapchat\.com\/add\/([^"'<>\s?/]+)/gi,
  discord: /(?:https?:)?\/\/(?:www\.)?discord\.com\/(?:invite\/)?([^"'<>\s?/]+)/gi,
  telegram: /(?:https?:)?\/\/(?:t(?:elegram)?\.me)\/([^"'<>\s?/]+)/gi,
  whatsapp: /(?:https?:)?\/\/(?:api\.)?whatsapp\.com\/(?:send\/?)?(?:\?phone=)?(\d+)/gi,
  medium: /(?:https?:)?\/\/(?:www\.)?medium\.com\/(@?[^"'<>\s?/]+)/gi,
  github: /(?:https?:)?\/\/(?:www\.)?github\.com\/([^"'<>\s?/]+)/gi,
  glassdoor: /(?:https?:)?\/\/(?:www\.)?glassdoor\.com\/(?:Overview\/)?([^"'<>\s?/]+)/gi,
  crunchbase: /(?:https?:)?\/\/(?:www\.)?crunchbase\.com\/(?:organization|person|company)\/([^"'<>\s?/]+)/gi,
  angellist: /(?:https?:)?\/\/(?:www\.)?angel\.co\/([^"'<>\s?/]+)/gi,
  behance: /(?:https?:)?\/\/(?:www\.)?behance\.net\/([^"'<>\s?/]+)/gi,
  dribbble: /(?:https?:)?\/\/(?:www\.)?dribbble\.com\/([^"'<>\s?/]+)/gi,
  twitch: /(?:https?:)?\/\/(?:www\.)?twitch\.tv\/([^"'<>\s?/]+)/gi,
  reddit: /(?:https?:)?\/\/(?:www\.)?reddit\.com\/(?:r\/)?([^"'<>\s?/]+)/gi,
  yelp: /(?:https?:)?\/\/(?:www\.)?yelp\.[a-z.]+\/([^"'<>\s?/]+)/gi,
  foursquare: /(?:https?:)?\/\/(?:www\.)?foursquare\.com\/([^"'<>\s?/]+)/gi,
  tripadvisor: /(?:https?:)?\/\/(?:www\.)?tripadvisor\.[a-z.]+\/([^"'<>\s?/]+)/gi,
  imdb: /(?:https?:)?\/\/(?:www\.)?imdb\.com\/(?:name|company|title)\/([^"'<>\s?/]+)/gi,
  etsy: /(?:https?:)?\/\/(?:www\.)?etsy\.com\/(?:shop\/)?([^"'<>\s?/]+)/gi,
  soundcloud: /(?:https?:)?\/\/(?:www\.)?soundcloud\.com\/([^"'<>\s?/]+)/gi,
  spotify: /(?:https?:)?\/\/(?:open\.)?spotify\.com\/(?:artist|show|episode|playlist|user)\/([^"'<>\s?/]+)/gi,
  vimeo: /(?:https?:)?\/\/(?:www\.)?vimeo\.com\/([^"'<>\s?/]+)/gi,
  patreon: /(?:https?:)?\/\/(?:www\.)?patreon\.com\/([^"'<>\s?/]+)/gi,
  producthunt: /(?:https?:)?\/\/(?:www\.)?producthunt\.com\/(?:@?[^"'<>\s?/]+)/gi,
  trustpilot: /(?:https?:)?\/\/(?:www\.)?trustpilot\.com\/(?:review\/)?([^"'<>\s?/]+)/gi,
  g2: /(?:https?:)?\/\/(?:www\.)?g2\.com\/(?:products|reviews)\/([^"'<>\s?/]+)/gi
};

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

const domainCache = new Map();
const MAX_CONCURRENT = 8;

function getUA() { return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]; }

function extractDomain(url) {
  if (!url || url === 'N/A') return null;
  try { return new URL(url.startsWith('http')?url:`https://${url}`).hostname.replace(/^www\./,'').toLowerCase(); }
  catch { try { return new URL(`https://${url}`).hostname.replace(/^www\./,'').toLowerCase(); } catch { return null; } }
}

function tryConstructDomain(name) {
  if (!name || name === 'N/A' || name.length < 3) return [];
  let slug = name.toLowerCase().replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'').replace(/^(the|a|an|les|le|la|el|der|die|das)/,'').trim();
  if (slug.length < 3) slug = name.toLowerCase().replace(/[^a-z0-9]/g,'').trim();
  if (slug.length < 3) return [];
  return ['.com','.net','.org','.io','.co','.us','.biz','.info','.co.uk','.ca','.com.au','.de','.fr','.eu','.app','.online','.store','.shop','.site','.org.uk','.in','.me'].map(t => `https://${slug}${t}`);
}

function generateEmailPatterns(domain, names) {
  if (!domain) return [];
  const seen = new Set();
  const emails = [];
  if (names?.length) {
    for (const n of names) {
      const first = n.name.split(' ')[0]?.toLowerCase().replace(/[^a-z]/g,'');
      const last = n.name.split(' ').slice(-1)[0]?.toLowerCase().replace(/[^a-z]/g,'');
      if (first && last) {
        [`${first}@${domain}`,`${first}.${last}@${domain}`,`${first}_${last}@${domain}`,`${first}${last}@${domain}`,`${last}@${domain}`].forEach(e => { if (!seen.has(e)) { seen.add(e); emails.push(e); }});
      } else if (first) {
        [`${first}@${domain}`].forEach(e => { if (!seen.has(e)) { seen.add(e); emails.push(e); }});
      }
    }
  }
  for (const prefix of EMAIL_PATTERNS) {
    const e = `${prefix.replace('@','')}@${domain}`;
    if (!seen.has(e)) { seen.add(e); emails.push(e); }
  }
  return emails;
}

function extractEmails(text) {
  if (!text) return [];
  return [...new Set(text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)||[])].filter(e => {
    const l = e.toLowerCase();
    return !SKIP_PATTERNS.some(s => l.includes(s)) && !/\.(png|jpg|svg|css|js|ico|gif|webp)$/.test(l);
  });
}

function extractPhones(text) {
  if (!text) return [];
  const p = [];
  const patterns = [
    /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,4}/g,
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /\d{3}[\s.-]\d{3}[\s.-]\d{4}/g,
    /\d{4}[\s.-]\d{3}[\s.-]\d{4}/g,
    /1[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/g,
    /00\d{2,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/g
  ];
  for (const r of patterns) { const m = text.match(r); if (m) p.push(...m); }
  return [...new Set(p)].filter(p => { const d = p.replace(/[^\d]/g,''); return d.length >= 7 && d.length <= 15; });
}

function extractSocialLinks(html) {
  const social = {};
  for (const [key, regex] of Object.entries(SOCIAL_PLATFORMS)) {
    regex.lastIndex = 0;
    const m = regex.exec(html);
    if (m) social[key] = m[0].toLowerCase().replace(/\/$/,'').replace(/^(https?:)?\/\/(www\.)?/,'');
  }
  return social;
}

function extractStructuredData(html) {
  const data = { name:'', description:'', email:'', phone:'', address:'', sameAs:[], openingHours:'', employees:[] };
  const blocks = html.match(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return data;
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block.replace(/<[^>]+>/g,'').trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item.description && !data.description) data.description = item.description;
        if (item.email && !data.email) data.email = item.email;
        if (item.telephone && !data.phone) data.phone = item.telephone;
        if (item.openingHours && !data.openingHours) data.openingHours = Array.isArray(item.openingHours) ? item.openingHours.join(', ') : item.openingHours;
        if (item.name && !data.name) data.name = item.name;
        if (item.sameAs) data.sameAs.push(...(Array.isArray(item.sameAs) ? item.sameAs : [item.sameAs]));
        if (item.numberOfEmployees) data.employees.push({ count: item.numberOfEmployees });
        const a = item.address || item.location;
        if (a) {
          const p = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode, typeof a.addressCountry === 'object' ? a.addressCountry.name||'' : a.addressCountry].filter(Boolean);
          if (p.length > (data.address ? data.address.split(',').length : 0)) data.address = p.join(', ');
        }
        if (item.contactPoint) {
          for (const cp of [].concat(item.contactPoint)) {
            if (cp.email && !data.email) data.email = cp.email;
            if (cp.telephone && !data.phone) data.phone = cp.telephone;
          }
        }
        if (item.member || item.employee) {
          for (const emp of [].concat(item.member || item.employee)) {
            if (emp.name) data.employees.push({ name: emp.name, jobTitle: emp.jobTitle || emp.role || '' });
          }
        }
      }
    } catch {}
  }
  return data;
}

function extractPeople(html) {
  const people = [];
  const seenNames = new Set();
  function addPerson(name, title='', source='') {
    const n = name.trim();
    if (!n || n.length < 2 || n.length > 60 || /^\d/.test(n) || n.includes('@') || n.includes('http') || n.includes('<') || n.includes('>')) return;
    const key = n.toLowerCase();
    if (seenNames.has(key)) return;
    seenNames.add(key);
    people.push({ name: n, title: title.trim(), _source: source });
  }
  const patterns = [
    /<h[234][^>]*>([^<]+)<\/h[234]>\s*<(?:p|span|div)[^>]*>([^<]*)<\/(?:p|span|div)>/gi,
    /<div[^>]*class="[^"]*(?:name|full-name|member-name|person-name)[^"]*"[^>]*>([^<]+)<\/div>\s*<div[^>]*class="[^"]*(?:role|position|job|title|designation)[^"]*"[^>]*>([^<]*)<\/div>/gi,
    /<span[^>]*class="[^"]*(?:name|member|person)[^"]*"[^>]*>([^<]+)<\/span>/gi,
    /<li[^>]*class="[^"]*(?:team|member|staff|person|executive|leadership)[^"]*"[^>]*>[\s\S]*?<h[234][^>]*>([^<]+)<\/h[234]>/gi,
    /<div[^>]*class="[^"]*(?:team|member|staff|person|card|executive|leadership)[^"]*"[^>]*>[\s\S]*?<h[234][^>]*>([^<]+)<\/h[234]>[\s\S]*?<(?:p|span|div)[^>]*class="[^"]*(?:role|position|job|title|designation)[^"]*"[^>]*>([^<]*)<\//gi,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*[-–—|]\s*([A-Za-z\s/]+)/g,
    /<a[^>]*href="[^"]*mailto:([^"]+)"[^>]*>([^<]*)<\/a>/gi,
    /<tr[^>]*>[\s\S]*?<td[^>]*class="[^"]*(?:name|person|member)[^"]*"[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*class="[^"]*(?:role|title|position|department)[^"]*"[^>]*>([^<]*)<\/td>/gi,
    /<div[^>]*class="[^"]*(?:team-member|member-card|person-card|employee-card|staff-card|profile-card|bio-card)[^"]*"[^>]*>[\s\S]*?<h[234][^>]*>([^<]+)<\/h[234]>/gi,
    /<div[^>]*class="[^"]*(?:team-member|member-card|person-card|employee-card)[^"]*"[^>]*>[\s\S]*?<img[^>]*alt="([^"]+)"[^>]*>/gi,
    /"name"\s*:\s*"([^"]+)"\s*,\s*"jobTitle"\s*:\s*"([^"]*)"/g,
    /"name"\s*:\s*"([^"]+)"\s*,\s*"role"\s*:\s*"([^"]*)"/g,
    /"fullName"\s*:\s*"([^"]+)"\s*,\s*"title"\s*:\s*"([^"]*)"/g,
    /"employee"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/g,
    /"teamMember"\s*:\s*\{\s*"name"\s*:\s*"([^"]+)"/g,
    /<meta[^>]+name="(?:author|creator)"[^>]+content="([^"]+)"/gi,
    /<a[^>]*class="[^"]*(?:author|writer|contributor)[^"]*"[^>]*>([^<]+)<\/a>/gi,
    /<div[^>]*class="[^"]*(?:author|byline)[^"]*"[^>]*>[\s]*by\s+([^<]+)<\/div>/gi
  ];
  for (const pat of patterns) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(html)) !== null) {
      if (m[2] !== undefined) addPerson(m[1], m[2], 'html_pattern');
      else addPerson(m[1], '', 'html_pattern');
    }
  }
  const nameEmailPairs = extractEmails(html);
  for (const email of nameEmailPairs) {
    const local = email.split('@')[0];
    const nameGuess = local.replace(/[._-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g, c => c.toUpperCase()).trim();
    if (!seenNames.has(nameGuess.toLowerCase())) {
      addPerson(nameGuess, '', 'email');
      if (people.length) people[people.length-1].email = email;
    }
  }
  const textNames = extractNamesFromText(html);
  for (const n of textNames) addPerson(n.name, n.title, 'text');
  return people;
}

function extractNamesFromText(text) {
  if (!text) return [];
  const names = [];
  const seen = new Set();
  const namePattern = /(?:^|[.!?]\s+)([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,}){1,3})(?=[,.\s!?]|$)/g;
  let m;
  while ((m = namePattern.exec(text)) !== null) {
    const name = m[1].trim();
    if (name.split(' ').length >= 2 && name.length < 50) {
      const first = name.split(' ')[0];
      const skipWords = new Set(['About','Contact','Location','Address','Phone','Email','Hours','Home','Search','Menu','Team','Our','The','This','That','These','Those','Welcome','Please','Click','Read','More','Sign','Login','Register','Subscribe','Follow','Share','Join','Learn','Get','Find','View','Check','See','Call','Send','Visit','Book','Order','Buy','Shop','Download','Upload','Support','Help','FAQ','Terms','Privacy','Policy','Careers','Jobs','News','Blog','Press','Events','Partners','Clients','Projects','Services','Products','Solutions','Resources','Contact','About','Copyright','All','Rights','Reserved','Powered','Designed','Developed','Created','Managed','Terms','Conditions','Cookie','Policy','Your','Shopping','Cart','Wishlist','Account','Checkout','Warranty','Returns','Shipping','Delivery','Payment','Security','Sitemap','Accessibility']);
      if (!skipWords.has(first)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) { seen.add(key); names.push({ name, title: '', _source: 'text' }); }
      }
    }
  }
  return names;
}

function extractMeta(html, names) {
  if (!html) return '';
  for (const name of [].concat(names)) {
    for (const p of [
      new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`,'i'),
      new RegExp(`<meta\\s+property=["']og:${name}["']\\s+content=["']([^"']+)["']`,'i'),
      new RegExp(`<meta\\s+name=["']twitter:${name}["']\\s+content=["']([^"']+)["']`,'i')
    ]) { const m = p.exec(html); if (m) return m[1].trim(); }
  }
  return '';
}

function extractSection(html, keywords, maxLen=200) {
  if (!html) return '';
  for (const kw of keywords) {
    for (const p of [
      new RegExp(`${kw}\\s*[:\\-–]?\\s*([^<.]+?(?:\\.(?:\\s|\$))+)`,'gi'),
      new RegExp(`${kw}[\\s\\S]{0,20}?<[^>]+>([^<]+)</`,'gi')
    ]) { const m = p.exec(html); if (m) { const v = m[1].trim(); if (v.length>3 && v.length<maxLen) return v; } }
  }
  return '';
}

function findHREmail(html, domain) {
  const s = new Set();
  for (const e of extractEmails(html)) { const l = e.split('@')[0].toLowerCase(); if (HR_PREFIXES.some(p => l.includes(p)) || /recruit|talent|people|staff|employ|workforce/i.test(l)) s.add(e); }
  if (domain) { for (const p of HR_PREFIXES) s.add(`${p}@${domain}`); }
  return [...s];
}

function extractTitle(html) {
  if (!html) return '';
  const m = html.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/\s*[|–-–—].*$/,'').trim() : '';
}

function extractPaymentMethods(html) {
  if (!html) return [];
  const kws = [
    'visa','mastercard','amex','american express','paypal','apple pay','google pay','stripe',
    'discover','bitcoin','ethereum','crypto','venmo','zelle','afterpay','klarna','affirm',
    'sepa','wire transfer','bank transfer','direct deposit','ach','cash','cheque','check',
    'diners','jcb','union pay','alipay','wechat pay','ideal','bancontact','giropay',
    'sofort','eps','multibanco','boleto','pix','mercado pago','payoneer','skrill',
    'neteller','webmoney','yandex money','qiwi','paytm','amazon pay','shopify payments',
    'square','goCardless','recurly','chargebee','paddle','lemonsqueezy','gumroad'
  ];
  const lower = html.toLowerCase();
  return [...new Set(kws.filter(k => lower.includes(k)))];
}

function extractSize(html, enriched) {
  const lower = (html||'').toLowerCase();
  const clues = [];
  const empCount = lower.match(/\b(\d{1,2}[,.]?\d{2,4})\s*employees?\b/i);
  if (empCount) clues.push(empCount[0]);
  if (/\b(?:small|medium|large)\s*(?:business|company|enterprise)\b/i.test(lower)) {
    const m = lower.match(/\b(small|medium|large)\s*(?:business|company|enterprise)\b/i);
    if (m) clues.push(m[0].toLowerCase());
  }
  if (enriched.capacity) clues.push(`capacity: ${enriched.capacity}`);
  if (/\bstartup\b/i.test(lower)) clues.push('startup');
  if (/\benterprise\b/i.test(lower)) clues.push('enterprise');
  if (/\bfortune\s*500\b/i.test(lower)) clues.push('fortune 500');
  if (/\bmultinational\b/i.test(lower)) clues.push('multinational');
  if (/\bsmall business\b/i.test(lower)) clues.push('small business');
  if (/\bfamily.?owned\b/i.test(lower)) clues.push('family-owned');
  if (/\blocal business\b/i.test(lower)) clues.push('local business');
  if (/\bindependent\b.*\bbusiness\b/i.test(lower)) clues.push('independent');
  if (/\bglobal\b.*\bcompany\b/i.test(lower)) clues.push('global company');
  if (/\bpublicly traded\b|\bNYSE\b|\bNASDAQ\b|\bstock exchange\b/i.test(lower)) clues.push('publicly traded');
  if (/\bb2b\b|\bwholesale\b/i.test(lower)) clues.push('b2b/wholesale');
  if (/\bfranchise\b/i.test(lower) || enriched.type === 'franchise') clues.push('franchise');
  if (/\bnon.?profit\b|\bnonprofit\b|\bcharity\b|\bfoundation\b/i.test(lower)) clues.push('non-profit');
  if (/\bgovernment\b|\bmunicipal\b|\bfederal\b|\bstate.?owned\b/i.test(lower)) clues.push('government');
  const empRange = lower.match(/\b(\d+)[\s-]*(?:to|[-–])[\s-]*(\d+)\s*employees?\b/i);
  if (empRange) clues.push(`${empRange[1]}-${empRange[2]} employees`);
  if (enriched.employees?.length && !clues.some(c => c.includes('employee'))) clues.push(`${enriched.employees.length}+ team members`);
  return clues.length ? [...new Set(clues)].join(', ') : '';
}

function computeCompleteness(enriched) {
  const fields = ['name','type','category','phone','email','address','website','opening_hours','description','facebook','instagram','linkedin','twitter','youtube','hr_email'];
  let score = 0;
  const missing = [];
  for (const f of fields) {
    const val = enriched[f];
    if (val && val !== 'N/A' && val !== `Phone not listed` && val !== `Email not available` && val !== `Website not available` && val !== `Hours not available` && val !== `No description available` && val !== `Address not available` && val !== 'Type not specified' && val !== 'Category not specified') {
      score++;
    } else {
      missing.push(f);
    }
  }
  return { score, total: fields.length, pct: Math.round(score/fields.length*100), missing };
}

async function fetchUrl(url, t=4000) {
  if (domainCache.has(url)) return domainCache.get(url);
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(t), headers: { 'User-Agent': getUA(), 'Accept': 'text/html' } });
    if (!resp.ok || !(resp.headers.get('content-type')||'').includes('text/html')) { domainCache.set(url,''); return ''; }
    const text = await resp.text();
    domainCache.set(url, text);
    return text;
  } catch { domainCache.set(url,''); return ''; }
}

async function throttledFetch(urls, max=MAX_CONCURRENT, t=4000) {
  const r = [];
  for (let i=0; i<urls.length; i+=max) {
    const s = await Promise.allSettled(urls.slice(i,i+max).map(u => fetchUrl(u, t)));
    r.push(...s.filter(x => x.status==='fulfilled' && x.value).map(x => x.value));
  }
  return r;
}

export async function enrichBusiness(business) {
  const enriched = { ...business, _enriched: true, employees: [], social_all: {} };
  const domain = extractDomain(business.website);
  let htmls = [], foundDomain = domain;

  if (domain) {
    htmls = await throttledFetch([`https://${domain}`, `https://www.${domain}`], 2, 4000);
  }

  if (!htmls.length && business.name) {
    const constructed = tryConstructDomain(business.name);
    const results = await throttledFetch(constructed, 5, 3000);
    if (results.length) {
      const idx = results.findIndex(r => r);
      const foundUrl = constructed[idx] || constructed[0];
      foundDomain = extractDomain(foundUrl);
      if (foundDomain && (!enriched.website || enriched.website === 'N/A')) { enriched.website = foundUrl; enriched._website_source = 'constructed'; }
      htmls = results.filter(Boolean);
    }
  }

  if (foundDomain) {
    htmls.push(...await throttledFetch(SUBPAGES.map(p => `https://${foundDomain}${p}`), 8, 2000));
    htmls.push(...await throttledFetch(SUBPAGES.map(p => `https://www.${foundDomain}${p}`), 8, 2000));
    htmls.push(...await throttledFetch(SUBDOMAINS.map(s => `https://${s}${foundDomain}`), 6, 2000));
    htmls.push(...await throttledFetch(SUBDOMAINS.map(s => `https://${s}www.${foundDomain}`), 6, 2000));
    const morePages = ['/index','/home','/default','/main','/en','/en-us','/id','/id-id','/en-gb','/fr','/de','/es','/it','/pt','/nl','/ru','/ja','/ko','/zh','/ar','/hi'];
    htmls.push(...await throttledFetch(morePages.map(p => `https://${foundDomain}${p}`), 6, 1500));
    const wmCurrent = await fetchUrl(`https://web.archive.org/web/2026/${foundDomain}/`, 3000);
    if (wmCurrent) htmls.push(wmCurrent);
    if (!htmls.length || !htmls.some(h => h.length > 500)) {
      const wmOld = await fetchUrl(`https://web.archive.org/web/2024/${foundDomain}/`, 3000);
      if (wmOld) htmls.push(wmOld);
    }
    const wmSubpages = await Promise.allSettled(SUBPAGES.slice(0,15).map(p => fetchUrl(`https://web.archive.org/web/2025/${foundDomain}${p}`, 2000)));
    htmls.push(...wmSubpages.filter(x => x.status==='fulfilled' && x.value).map(x => x.value));
    const sitemapHtml = await fetchUrl(`https://${foundDomain}/sitemap.xml`, 2000);
    if (sitemapHtml) {
      const urls = [...sitemapHtml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]).filter(u => !u.includes('.pdf') && !u.includes('.jpg') && !u.includes('.png')).slice(0,30);
      if (urls.length) htmls.push(...await throttledFetch(urls, 5, 2000));
    }
  }

  const combined = htmls.join(' ');
  const main = htmls[0] || combined;
  const side = htmls.slice(1).join(' ');
  const structured = extractStructuredData(combined);
  const people = extractPeople(combined);
  if (people.length) enriched.employees = people;

  if (!enriched.email || enriched.email === 'N/A') {
    if (structured.email) { enriched.email = structured.email; enriched._email_source = 'structured'; }
  }
  if (!enriched.email || enriched.email === 'N/A') {
    const all = extractEmails(combined);
    const best = all.filter(e => { const l = e.split('@')[0].toLowerCase(); return !HR_PREFIXES.some(p => l.includes(p)) && !['info','contact','support','admin','noreply','hello','mail','office'].includes(l); });
    if (best.length) { enriched.email = best[0]; enriched._email_source = 'scraped'; }
    else if (all.length) { enriched.email = all[0]; enriched._email_source = 'scraped_fallback'; }
  }
  if (!enriched.email || enriched.email === 'N/A') {
    if (foundDomain) { enriched.email_patterns = generateEmailPatterns(foundDomain, people); enriched.email = enriched.email_patterns[0]; enriched._email_source = 'generated'; }
  }
  if (foundDomain && !enriched.email_patterns) enriched.email_patterns = generateEmailPatterns(foundDomain, people);

  if (!enriched.phone || enriched.phone === 'N/A') {
    if (structured.phone) { enriched.phone = structured.phone.replace(/[^\d+]/g,''); enriched._phone_source = 'structured'; }
  }
  if (!enriched.phone || enriched.phone === 'N/A') {
    const phones = extractPhones(combined);
    if (phones.length) { enriched.phone = phones[0].replace(/[^\d+]/g,''); enriched._phone_source = 'scraped'; }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    if (structured.description) { enriched.description = structured.description; enriched._desc_source = 'structured'; }
  }
  if (!enriched.description || enriched.description === 'N/A') {
    const m = extractMeta(main, ['description']);
    if (m) { enriched.description = m; enriched._desc_source = 'meta'; }
  }

  if (!enriched.address || enriched.address === 'N/A') {
    if (structured.address) { enriched.address = structured.address; enriched._address_source = 'structured'; }
  }
  if (!enriched.address || enriched.address === 'N/A') {
    const a = extractSection(combined, ['Address','address','Location','Visit us','Find us','Headquarters','Corporate Office','Main Office','Office Address','Registered Office','Physical Address']);
    if (a) { enriched.address = a; enriched._address_source = 'scraped'; }
  }
  if (!enriched.address || enriched.address === 'N/A') {
    const a = extractSection(side, ['Address','address','Location','Headquarters','Office']);
    if (a) { enriched.address = a; enriched._address_source = 'scraped_subpage'; }
  }
  if (!enriched.address || enriched.address === 'N/A') {
    if (business.lat && business.lon) { enriched.address = `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)}`; enriched._address_source = 'coordinates'; }
  }

  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    if (structured.openingHours) { enriched.opening_hours = structured.openingHours; enriched._hours_source = 'structured'; }
  }
  if (!enriched.opening_hours || enriched.opening_hours === 'N/A') {
    const h = extractSection(combined, ['Opening Hours','Opening hours','Business hours','Hours of operation','Store hours','Open hours','opening_hours','Office Hours','Working Hours','Service Hours']);
    if (h) { enriched.opening_hours = h; enriched._hours_source = 'scraped'; }
  }

  if (!enriched.description || enriched.description === 'N/A') {
    const p = [];
    if (enriched.name) p.push(enriched.name);
    if (enriched.type && enriched.type !== 'N/A') p.push(`(${enriched.type})`);
    if (enriched.address && enriched.address !== 'Address not available' && !enriched.address.includes('(see map)')) p.push(`at ${enriched.address}`);
    if (enriched.cuisine) p.push(`cuisine: ${enriched.cuisine}`);
    if (enriched.brand) p.push(`brand: ${enriched.brand}`);
    if (enriched.employees?.length) p.push(`${enriched.employees.length} team members`);
    if (p.length) { enriched.description = p.join(' | '); enriched._desc_source = 'composite'; }
  }

  const social = extractSocialLinks(combined);
  const socialSide = extractSocialLinks(side);
  enriched.social_all = { ...social };
  for (const k of Object.keys(socialSide)) { if (socialSide[k]) enriched.social_all[k] = socialSide[k]; }
  const allSocialKeys = Object.keys(SOCIAL_PLATFORMS);
  for (const k of allSocialKeys) {
    if (!enriched[k]) enriched[k] = social[k] || socialSide[k] || '';
  }

  if (structured.sameAs?.length) {
    const socialDomainMap = {
      'facebook.com': 'facebook', 'fb.com': 'facebook',
      'instagram.com': 'instagram',
      'twitter.com': 'twitter', 'x.com': 'twitter',
      'linkedin.com': 'linkedin',
      'youtube.com': 'youtube', 'youtu.be': 'youtube',
      'tiktok.com': 'tiktok',
      'pinterest': 'pinterest',
      'snapchat.com': 'snapchat',
      'discord.com': 'discord',
      't.me': 'telegram', 'telegram.me': 'telegram',
      'whatsapp.com': 'whatsapp',
      'medium.com': 'medium',
      'github.com': 'github',
      'glassdoor.com': 'glassdoor',
      'crunchbase.com': 'crunchbase',
      'angel.co': 'angellist',
      'behance.net': 'behance',
      'dribbble.com': 'dribbble',
      'twitch.tv': 'twitch',
      'reddit.com': 'reddit',
      'yelp': 'yelp',
      'foursquare.com': 'foursquare',
      'tripadvisor': 'tripadvisor',
      'imdb.com': 'imdb',
      'etsy.com': 'etsy',
      'soundcloud.com': 'soundcloud',
      'spotify.com': 'spotify',
      'vimeo.com': 'vimeo',
      'patreon.com': 'patreon',
      'producthunt.com': 'producthunt',
      'trustpilot.com': 'trustpilot',
      'g2.com': 'g2'
    };
    for (const url of structured.sameAs) {
      const l = url.toLowerCase();
      for (const [domain, key] of Object.entries(socialDomainMap)) {
        if (!enriched[key] && l.includes(domain)) { enriched[key] = url; break; }
      }
    }
  }

  const payments = extractPaymentMethods(combined);
  if (payments.length && !enriched.payment) enriched.payment = payments.join(', ');

  if (!enriched.type || enriched.type === 'N/A' || !enriched.category || enriched.category === 'N/A') {
    const title = extractTitle(main);
    const text = `${title} ${main ? main.slice(0,3000) : ''}`;
    const tk = {
      restaurant: /restaurant|menu|catering|kitchen|chef|dining|bistro|eatery|food|grill|pizzeria|steakhouse/i,
      cafe: /cafe|café|coffee|bakery|pastry|espresso|tea\s*house|roastery/i,
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
    for (const [type, regex] of Object.entries(tk)) {
      if (regex.test(text)) { if (!enriched.type || enriched.type === 'N/A') enriched.type = type; if (!enriched.category || enriched.category === 'N/A') enriched.category = type; break; }
    }
  }
  if ((!enriched.type || enriched.type === 'N/A') && enriched.name) {
    const nl = enriched.name.toLowerCase();
    for (const [type, regex] of Object.entries({ restaurant: /restaurant|cafe|bistro|grill|kitchen|pizza|sushi|diner/i, hotel: /hotel|inn|resort|suites|motel/i, clinic: /clinic|medical|healthcare|med/i, pharmacy: /pharmacy|drugs?|chemist/i, school: /school|academy|preschool/i, bank: /bank|credit\s*union/i, shop: /shop|store|mart|boutique/i, dentist: /dentist|dental/i, bar: /bar|pub|tavern|brewery/i })) {
      if (regex.test(nl)) { enriched.type = type; enriched.category = type; break; }
    }
  }

  const isOffice = enriched.type === 'office' || (enriched.name && /\b(?:LLC|Inc|Corp|Ltd|GmbH|Pty|Limited|Company|Enterprise|Corporation|Incorporated|PLC|SA|AG|SE|BV|NV|SARL|SAS|GmbH|KG)\b/i.test(enriched.name));
  if (!enriched.type || enriched.type === 'N/A') { enriched.type = isOffice ? 'office' : 'business'; enriched.category = enriched.type; }

  const hrEmails = findHREmail(combined, foundDomain||'');
  let bestHr = '';
  if (hrEmails.length > 0) {
    const realHr = hrEmails.filter(e => !HR_PREFIXES.some(p => e === `${p}@${foundDomain}`));
    bestHr = realHr.length ? realHr[0] : hrEmails[0];
    enriched.hr_emails = hrEmails; enriched._has_hr = true;
    enriched._hr_source = realHr.length ? 'scraped' : 'pattern';
  }
  if (!bestHr && isOffice && foundDomain) {
    const candidates = HR_PREFIXES.map(p => `${p}@${foundDomain}`);
    const general = enriched.email;
    for (const hr of candidates) { if (hr !== general) { bestHr = hr; enriched._hr_source = 'auto'; break; } }
    enriched.hr_emails = candidates.filter(h => h !== general);
  }
  if (!bestHr && foundDomain && isOffice) { bestHr = `hr@${foundDomain}`; enriched._hr_source = 'default'; }
  if (bestHr && (!enriched.email || enriched.email === 'N/A' || bestHr !== enriched.email)) enriched.hr_email = bestHr;
  if (!enriched.hr_email && enriched.hr_emails?.length) {
    const first = enriched.hr_emails[0];
    if (first !== enriched.email) enriched.hr_email = first;
  }

  enriched._size_hint = extractSize(combined, enriched);
  if (structured.employees?.length) {
    enriched.employees = [...enriched.employees, ...structured.employees.filter(e => e.name && !enriched.employees.some(p => p.name === e.name))];
  }
  if (enriched.employees?.length) enriched._has_employees = true;

  const labels = {
    type: isOffice ? 'Office/Company' : 'Business', category: 'General',
    phone: 'Phone not listed', email: 'Email not available', website: 'Website not available',
    opening_hours: isOffice ? 'Mon-Fri 9:00 AM - 5:00 PM' : 'Hours not available',
    description: isOffice ? `Office/Company at ${enriched.address||`${business.lat?.toFixed(4)||''}, ${business.lon?.toFixed(4)||''}`}` : 'No description available',
    address: business.lat && business.lon ? `${business.lat.toFixed(4)}, ${business.lon.toFixed(4)}` : 'Address not available'
  };
  for (const f of ['type','category','subcategory','phone','address','website','email','opening_hours','description','brand','operator','cuisine','building']) {
    if (!enriched[f] || enriched[f].toString().trim() === '') enriched[f] = labels[f] || '';
  }

  if (!enriched.email && enriched.hr_email) { enriched.email = enriched.hr_email; enriched._email_source = 'from_hr'; }
  if (!enriched.email_patterns && foundDomain) enriched.email_patterns = generateEmailPatterns(foundDomain, enriched.employees);

  const comp = computeCompleteness(enriched);
  enriched._data_score = comp.pct;
  enriched._data_missing = comp.missing;
  enriched._data_complete = comp.pct === 100;

  delete enriched.all_tags;
  return enriched;
}

async function enrichSingle(business) {
  try { return await enrichBusiness(business); }
  catch (error) {
    console.error(`Enrich failed for ${business.name}:`, error);
    const fb = { ...business, _enriched_error: true, _enriched: true };
    for (const f of ['type','category','subcategory','phone','address','website','email','opening_hours','description']) {
      if (!fb[f] || fb[f].toString().trim() === '') fb[f] = f === 'description' ? 'No description available' : f === 'email' ? 'Email not available' : f === 'phone' ? 'Phone not listed' : f === 'address' ? `See map at ${fb.lat?.toFixed(4)}, ${fb.lon?.toFixed(4)}` : 'Not available';
    }
    return fb;
  }
}

export async function enrichAll(businesses, onProgress) {
  const results = [];
  for (let i=0; i<businesses.length; i+=5) {
    const batch = businesses.slice(i,i+5);
    const settled = await Promise.allSettled(batch.map(b => enrichSingle(b)));
    settled.forEach((r,idx) => results.push(r.status==='fulfilled' ? r.value : { ...batch[idx], _enriched_error: true, _enriched: true }));
    if (onProgress) onProgress(results.length, businesses.length);
  }
  return results;
}
