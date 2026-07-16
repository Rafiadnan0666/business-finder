const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

const COUNTRY_CODES = {
  '1': { name: 'US/Canada', pattern: /^1\d{10}$/ },
  '44': { name: 'UK', pattern: /^44\d{10}$/ },
  '91': { name: 'India', pattern: /^91\d{10}$/ },
  '62': { name: 'Indonesia', pattern: /^62\d{9,12}$/ },
  '61': { name: 'Australia', pattern: /^61\d{9}$/ },
  '49': { name: 'Germany', pattern: /^49\d{10,11}$/ },
  '33': { name: 'France', pattern: /^33\d{9}$/ },
  '39': { name: 'Italy', pattern: /^39\d{10}$/ },
  '34': { name: 'Spain', pattern: /^34\d{9}$/ },
  '55': { name: 'Brazil', pattern: /^55\d{10,11}$/ },
  '7': { name: 'Russia', pattern: /^7\d{10}$/ },
  '81': { name: 'Japan', pattern: /^81\d{10}$/ },
  '86': { name: 'China', pattern: /^86\d{11}$/ },
  '82': { name: 'South Korea', pattern: /^82\d{10}$/ },
  '31': { name: 'Netherlands', pattern: /^31\d{9}$/ },
  '46': { name: 'Sweden', pattern: /^46\d{9}$/ },
  '47': { name: 'Norway', pattern: /^47\d{8}$/ },
  '45': { name: 'Denmark', pattern: /^45\d{8}$/ },
  '358': { name: 'Finland', pattern: /^358\d{9}$/ },
  '30': { name: 'Greece', pattern: /^30\d{10}$/ },
  '351': { name: 'Portugal', pattern: /^351\d{9}$/ },
  '353': { name: 'Ireland', pattern: /^353\d{9}$/ },
  '32': { name: 'Belgium', pattern: /^32\d{9}$/ },
  '43': { name: 'Austria', pattern: /^43\d{10}$/ },
  '41': { name: 'Switzerland', pattern: /^41\d{9}$/ },
  '48': { name: 'Poland', pattern: /^48\d{9}$/ },
  '420': { name: 'Czech Republic', pattern: /^420\d{9}$/ },
  '36': { name: 'Hungary', pattern: /^36\d{9}$/ },
  '40': { name: 'Romania', pattern: /^40\d{9}$/ },
  '359': { name: 'Bulgaria', pattern: /^359\d{9}$/ },
  '381': { name: 'Serbia', pattern: /^381\d{9}$/ },
  '90': { name: 'Turkey', pattern: /^90\d{10}$/ },
  '972': { name: 'Israel', pattern: /^972\d{9}$/ },
  '966': { name: 'Saudi Arabia', pattern: /^966\d{9}$/ },
  '971': { name: 'UAE', pattern: /^971\d{9}$/ },
  '20': { name: 'Egypt', pattern: /^20\d{10}$/ },
  '27': { name: 'South Africa', pattern: /^27\d{9}$/ },
  '52': { name: 'Mexico', pattern: /^52\d{10}$/ },
  '54': { name: 'Argentina', pattern: /^54\d{10}$/ },
  '56': { name: 'Chile', pattern: /^56\d{9}$/ },
  '57': { name: 'Colombia', pattern: /^57\d{10}$/ },
  '51': { name: 'Peru', pattern: /^51\d{9}$/ },
  '63': { name: 'Philippines', pattern: /^63\d{10}$/ },
  '66': { name: 'Thailand', pattern: /^66\d{9}$/ },
  '84': { name: 'Vietnam', pattern: /^84\d{9}$/ },
  '60': { name: 'Malaysia', pattern: /^60\d{9,10}$/ },
  '65': { name: 'Singapore', pattern: /^65\d{8}$/ },
  '64': { name: 'New Zealand', pattern: /^64\d{9}$/ },
  '92': { name: 'Pakistan', pattern: /^92\d{10}$/ },
  '880': { name: 'Bangladesh', pattern: /^880\d{10}$/ },
  '94': { name: 'Sri Lanka', pattern: /^94\d{9}$/ },
};

function detectCountry(digits) {
  for (const [code, info] of Object.entries(COUNTRY_CODES)) {
    if (digits.startsWith(code) && info.pattern.test(digits)) {
      return { code: `+${code}`, name: info.name };
    }
  }
  for (const [code, info] of Object.entries(COUNTRY_CODES)) {
    if (digits.startsWith(code)) {
      return { code: `+${code}`, name: info.name, confidence: 'partial' };
    }
  }
  return null;
}

async function checkWhatsApp(phone) {
  try {
    const clean = phone.replace(/[^\d+]/g,'');
    const resp = await fetch(`https://wa.me/${clean}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': UA }
    });
    return { reachable: resp.ok || resp.status < 500, url: `https://wa.me/${clean}` };
  } catch {
    return { reachable: false };
  }
}

async function checkTelegram(phone) {
  try {
    const clean = phone.replace(/[^\d+]/g,'');
    const resp = await fetch(`https://t.me/+${clean}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': UA }
    });
    return { reachable: resp.ok || resp.status < 500, url: `https://t.me/+${clean}` };
  } catch {
    return { reachable: false };
  }
}

async function checkTruecaller(phone) {
  try {
    const clean = phone.replace(/[^\d+]/g,'');
    const resp = await fetch(`https://truecaller.com/search/${clean.replace('+','')}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': UA }
    });
    return { reachable: resp.ok, url: `https://truecaller.com/search/${clean.replace('+','')}` };
  } catch {
    return { reachable: false };
  }
}

export async function POST(req) {
  const { phone } = await req.json();
  if (!phone) {
    return Response.json({ error: 'Phone number required' }, { status: 400 });
  }
  const raw = phone.trim();
  const digits = raw.replace(/[^\d]/g,'');
  if (digits.length < 7 || digits.length > 15) {
    return Response.json({ error: 'Invalid phone number length' }, { status: 400 });
  }
  const country = detectCountry(digits);
  const hasPlus = raw.startsWith('+');
  const [whatsapp, telegram, truecaller] = await Promise.all([
    checkWhatsApp(raw),
    checkTelegram(raw),
    checkTruecaller(raw)
  ]);
  const formats = [];
  if (digits.length >= 10) formats.push(`+${digits}`);
  if (country && digits.length >= 10) {
    const local = digits.slice(country.code.length - 1);
    formats.push(`0${local}`);
    formats.push(local);
  }
  formats.push(digits);
  return Response.json({
    phone: raw,
    digits,
    valid_length: digits.length >= 7 && digits.length <= 15,
    country,
    has_plus: hasPlus,
    format_suggestions: [...new Set(formats)],
    whatsapp,
    telegram,
    truecaller,
    carriers: country?.name ? [`Likely carrier in: ${country.name}`] : [],
    sos: country ? null : { note: 'Add + and country code for better results (e.g. +1 for US)' }
  });
}
