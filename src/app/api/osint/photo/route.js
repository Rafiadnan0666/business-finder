import { createHash } from 'crypto';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

function buildMultipart(fields) {
  const boundary = '----' + Math.random().toString(36).slice(2);
  const parts = [];
  for (const { name, filename, contentType, data } of fields) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"${filename ? `; filename="${filename}"` : ''}\r\nContent-Type: ${contentType || 'application/octet-stream'}\r\n\r\n`));
    parts.push(typeof data === 'string' ? Buffer.from(data) : data);
    parts.push(Buffer.from('\r\n'));
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(parts) };
}

async function identifyViaSearch4Faces(imageBuffer) {
  try {
    const { boundary, body } = buildMultipart([
      { name: 'file', filename: 'face.jpg', contentType: 'image/jpeg', data: imageBuffer }
    ]);
    const resp = await fetch('https://search4faces.com/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'User-Agent': UA, 'Accept': 'application/json' },
      body,
      signal: AbortSignal.timeout(30000)
    });
    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      if (data.faces?.length) {
        return {
          success: true, source: 'Search4Faces',
          faces: data.faces.slice(0, 25).map(f => ({
            photo: f.photo || null, url: f.url || null,
            similarity: f.similarity || f.score || null,
            name: f.name || null, source_site: f.site || f.platform || 'unknown'
          })),
          raw_count: data.faces.length
        };
      }
      return { success: true, source: 'Search4Faces', faces: [], raw_count: 0 };
    } catch {
      const lower = text.toLowerCase();
      if (lower.includes('face') || lower.includes('found')) {
        return { success: true, source: 'Search4Faces', faces: [], raw_count: 0, note: 'no_faces_found' };
      }
      return { success: false, source: 'Search4Faces', error: 'parse_error', raw: text.slice(0,300) };
    }
  } catch (err) {
    return { success: false, source: 'Search4Faces', error: err.cause?.code || err.message };
  }
}

async function uploadToImgBB(imageBuffer) {
  try {
    const b64 = imageBuffer.toString('base64');
    const resp = await fetch('https://api.imgbb.com/1/upload?key=1e8c9f0a3b6d4e7f2c5a8b0d9e1f3c7a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image: b64 }),
      signal: AbortSignal.timeout(10000)
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.data?.url) return { success: true, url: data.data.url, display_url: data.data.display_url || data.data.url };
    }
    return { success: false };
  } catch {
    return { success: false };
  }
}

async function tryTinEye(imageBuffer) {
  try {
    const { boundary, body } = buildMultipart([
      { name: 'image', filename: 'search.jpg', contentType: 'image/jpeg', data: imageBuffer }
    ]);
    const resp = await fetch('https://tineye.com/rest/search/', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'User-Agent': UA },
      body,
      signal: AbortSignal.timeout(20000)
    });
    const text = await resp.text();
    try {
      const data = JSON.parse(text);
      const matches = (data.results || []).slice(0, 10).map(m => ({
        url: m.url || m.image_url || null,
        source_url: m.backlinks?.[0]?.url || m.source_url || null,
        score: m.score || m.similarity || null
      }));
      return { success: true, source: 'TinEye', total_results: data.total_results || 0, matches, search_url: 'https://tineye.com/search' };
    } catch {
      return { success: false, source: 'TinEye', error: 'parse_error' };
    }
  } catch (err) {
    return { success: false, source: 'TinEye', error: err.message };
  }
}

function getMetadata(buf) {
  return {
    size_kb: (buf.length / 1024).toFixed(1),
    md5: createHash('md5').update(buf).digest('hex'),
    sha1: createHash('sha1').update(buf).digest('hex'),
    format: 'jpeg'
  };
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: 'No image file' }, { status: 400 });
    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const meta = getMetadata(buf);
    const imgbb = await uploadToImgBB(buf);
    const [s4f, tineye] = await Promise.allSettled([
      identifyViaSearch4Faces(buf),
      tryTinEye(buf)
    ]);
    const faceSearch = s4f.status === 'fulfilled' ? s4f.value : { success: false, source: 'Search4Faces', error: 'timeout' };
    const tinEyeResult = tineye.status === 'fulfilled' ? tineye.value : { success: false, source: 'TinEye', error: 'timeout' };
    const found = [];
    if (faceSearch.success && faceSearch.faces) {
      for (const f of faceSearch.faces) {
        found.push({
          type: 'face_match', source: 'Search4Faces',
          photo_url: f.photo, profile_url: f.url,
          similarity: f.similarity, name: f.name,
          platform: f.source_site
        });
      }
    }
    if (tinEyeResult.success && tinEyeResult.matches?.length) {
      for (const m of tinEyeResult.matches) {
        found.push({ type: 'image_match', source: 'TinEye', image_url: m.url, source_url: m.source_url, score: m.score });
      }
    }
    const searchUrls = [
      ...(imgbb.success ? [
        { name: 'Google Lens', url: `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imgbb.display_url)}`, type: 'face' },
        { name: 'Yandex', url: `https://yandex.com/images/search?url=${encodeURIComponent(imgbb.display_url)}&rpt=imageview`, type: 'face' },
        { name: 'TinEye', url: `https://tineye.com/search?url=${encodeURIComponent(imgbb.display_url)}`, type: 'general' },
      ] : []),
      { name: 'Search4Faces', url: 'https://search4faces.com', type: 'face' },
      { name: 'PimEyes', url: 'https://pimeyes.com/en', type: 'face' },
      { name: 'FaceCheck', url: 'https://facecheck.id', type: 'face' },
      { name: 'Bing Visual', url: 'https://bing.com/images/search?q=reverse+image+search', type: 'general' },
    ];
    return Response.json({
      image: meta,
      image_hosted: imgbb.success ? { url: imgbb.url, display_url: imgbb.display_url } : null,
      search_urls: searchUrls.filter(Boolean),
      face_search: faceSearch,
      tineye: tinEyeResult,
      found_profiles: found,
      profile_count: found.length
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
