const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractDomain(email) {
  return email.split('@')[1]?.toLowerCase() || '';
}

function emailToUsername(email) {
  return email.split('@')[0];
}

async function checkHaveIBeenPwned(email) {
  try {
    const hash = Array.from(new TextEncoder().encode(email)).map(b => b.toString(16).padStart(2,'0')).join('');
    const resp = await fetch(`https://haveibeenpwned.com/account/${hash}`, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': UA }
    });
    const html = await resp.text();
    const breachCount = (html.match(/breach/i) || []).length;
    const breachNames = [];
    const pwndSites = html.match(/<h2[^>]*>([^<]+)<\/h2>/gi);
    if (pwndSites) {
      for (const s of pwndSites.slice(0,10)) {
        const name = s.replace(/<[^>]+>/g,'').trim();
        if (name && name.length < 50) breachNames.push(name);
      }
    }
    return { checked: true, breaches: breachCount > 0, breach_count: breachCount, breach_names: breachNames };
  } catch {
    return { checked: true, breaches: false, breach_count: 0, breach_names: [] };
  }
}

async function checkGravatar(email) {
  try {
    const hash = Array.from(new TextEncoder().encode(email.trim().toLowerCase())).map(b => b.toString(16).padStart(2,'0')).join('');
    const resp = await fetch(`https://gravatar.com/${hash}.json`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': UA }
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        exists: true,
        profile_url: `https://gravatar.com/${hash}`,
        avatar_url: `https://gravatar.com/avatar/${hash}?s=400`,
        display_name: data.entry?.[0]?.displayName || '',
        about: data.entry?.[0]?.aboutMe || '',
        urls: data.entry?.[0]?.urls?.map(u => u.value) || []
      };
    }
    return { exists: false };
  } catch {
    return { exists: false };
  }
}

async function checkEmailReputation(email) {
  const domain = extractDomain(email);
  const info = {
    domain,
    is_disposable: false,
    is_role_based: false,
    mx_exists: false,
    domain_age_days: null
  };
  const disposable = ['mailinator.com','guerrillamail.com','tempmail.com','yopmail.com','throwaway.email','10minutemail.com','sharklasers.com','trashmail.com','mailnator.com','getnada.com','emailfake.com','temp-mail.org','tempmail.net','fakeinbox.com','maildrop.cc','spamgourmet.com','mytrashmail.com'];
  info.is_disposable = disposable.includes(domain);
  const rolePrefixes = ['admin','info','contact','support','sales','help','office','mail','webmaster','postmaster','hostmaster','noreply','no-reply','donotreply','abuse','marketing','billing','payments','jobs','hr','recruitment','careers','pr','media','press','legal','complaints','feedback','test'];
  info.is_role_based = rolePrefixes.includes(emailToUsername(email).toLowerCase());
  return info;
}

async function searchGoogleSocials(email) {
  const socials = [];
  const queries = [
    { name: 'GitHub', url: `https://github.com/search?q=${encodeURIComponent(email)}&type=users` },
    { name: 'Twitter/X', url: `https://twitter.com/search?q=${encodeURIComponent(email)}&f=user` },
    { name: 'Reddit', url: `https://reddit.com/search/?q=${encodeURIComponent(email)}` },
    { name: 'Medium', url: `https://medium.com/search?q=${encodeURIComponent(email)}` },
    { name: 'LinkedIn', url: `https://linkedin.com/pub/dir/?first=&last=&search=${encodeURIComponent(email)}` },
    { name: 'Facebook', url: `https://facebook.com/public/?query=${encodeURIComponent(email)}` },
    { name: 'Instagram', url: `https://instagram.com/web/search/topsearch/?query=${encodeURIComponent(email)}` },
  ];
  for (const q of queries) {
    try {
      const resp = await fetch(q.url, {
        signal: AbortSignal.timeout(3000),
        headers: { 'User-Agent': UA }
      });
      socials.push({ name: q.name, url: q.url, reachable: resp.ok || resp.status === 429 ? true : false });
    } catch {
      socials.push({ name: q.name, url: q.url, reachable: false });
    }
  }
  return socials;
}

export async function POST(req) {
  const { email } = await req.json();
  if (!email || !validateEmail(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }
  const clean = email.trim().toLowerCase();
  const [pwned, gravatar, reputation, socials] = await Promise.all([
    checkHaveIBeenPwned(clean),
    checkGravatar(clean),
    checkEmailReputation(clean),
    searchGoogleSocials(clean)
  ]);
  const username = emailToUsername(clean);
  const domain = extractDomain(clean);
  return Response.json({
    email: clean,
    username,
    domain,
    valid_format: true,
    pwned,
    gravatar,
    reputation,
    social_search: socials,
    name_guesses: [
      username.replace(/[._-]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase()).trim(),
      username.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      username.split(/[._-]/)[0]?.charAt(0).toUpperCase() + username.split(/[._-]/)[0]?.slice(1) || '',
    ].filter(Boolean),
    email_variations: [
      `${username}@gmail.com`,
      `${username}@yahoo.com`,
      `${username}@outlook.com`,
      `${username}@hotmail.com`,
      `${username}@protonmail.com`,
      `${username}@icloud.com`,
    ]
  });
}
