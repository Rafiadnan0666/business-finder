"use client"
import { useState, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';

const S = {
  section: { background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '5px 5px 0px var(--border)', padding: '20px', marginBottom: '20px' },
  label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '8px' },
  input: { background: 'var(--bg)', color: 'var(--fg)', border: '3px solid var(--border)', padding: '12px 16px', fontSize: '14px', fontWeight: 600, outline: 'none', width: '100%' },
  muted: { color: 'var(--muted)', fontSize: '12px' },
  pill: { display: 'inline-block', padding: '2px 10px', fontSize: '10px', fontWeight: 700, border: '2px solid var(--border)', textTransform: 'uppercase' },
};

function Btn({ children, onClick, disabled, color, small }) {
  const bg = color || 'var(--accent)';
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? 'var(--surface2)' : bg, color: disabled ? 'var(--muted)' : '#fff',
        border: '3px solid var(--border)', boxShadow: disabled ? 'none' : '3px 3px 0px var(--border)',
        fontWeight: 700, fontSize: small ? '11px' : '13px', padding: small ? '6px 14px' : '10px 24px',
        cursor: disabled ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
      }}
      onMouseDown={e => { if (!disabled) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '1px 1px 0px var(--border)'; }}}
      onMouseUp={e => { if (!disabled) { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--border)'; }}}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--border)'; }}}
    >
      {children}
    </button>
  );
}

function Card({ children, style }) {
  return <div style={{ background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '4px 4px 0px var(--border)', padding: '14px', ...style }}>{children}</div>;
}

function Badge({ children, bg, fg }) {
  return <span style={{ ...S.pill, background: bg || 'var(--surface2)', color: fg || 'var(--fg)' }}>{children}</span>;
}

function Tab({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      style={{
        padding: '10px 20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
        background: active ? 'var(--fg)' : 'var(--surface)',
        color: active ? 'var(--bg)' : 'var(--fg)',
        border: '3px solid var(--border)', borderBottom: active ? '3px solid var(--fg)' : '3px solid var(--border)',
        marginBottom: '-3px', cursor: 'pointer'
      }}>
      {children}
    </button>
  );
}

export default function OSINTPage() {
  const [activeTab, setActiveTab] = useState('photo');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', background: '#dc2626', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '20px' }}>OS</div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--fg)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>OSINT Search</h1>
              <p style={{ ...S.muted, margin: 0 }}>Advanced People & Identity Intelligence</p>
            </div>
          </div>
          <Link href="/" style={{ ...S.pill, background: 'var(--surface)', color: 'var(--fg)', textDecoration: 'none', padding: '6px 16px', fontSize: '12px' }}>&larr; BUSINESS FINDER</Link>
        </div>

        <div style={{ display: 'flex', borderBottom: '3px solid var(--border)', marginBottom: '20px', flexWrap: 'wrap', gap: '4px' }}>
          {[
            { id: 'photo', label: '📷 Photo Search' },
            { id: 'username', label: '🔍 Username Search' },
            { id: 'email', label: '📧 Email OSINT' },
            { id: 'phone', label: '📞 Phone OSINT' },
          ].map(tab => (
            <Tab key={tab.id} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}>{tab.label}</Tab>
          ))}
        </div>

        {activeTab === 'photo' && <PhotoSearch />}
        {activeTab === 'username' && <UsernameSearch />}
        {activeTab === 'email' && <EmailOSINT />}
        {activeTab === 'phone' && <PhoneOSINT />}
      </div>
    </div>
  );
}

function PhotoSearch() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [exif, setExif] = useState(null);
  const [dominantColors, setDominantColors] = useState([]);
  const [qrResult, setQrResult] = useState(null);
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setExif(null);
    setDominantColors([]);
    setQrResult(null);
    extractExif(file);
    extractColors(file);
  }

  function extractExif(file) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const info = {
        width: img.width, height: img.height,
        aspect: (img.width / img.height).toFixed(2),
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        name: file.name,
      };
      setExif(info);
    };
    img.src = URL.createObjectURL(file);
  }

  function extractColors(file) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;
      const colorMap = {};
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i+1] / 32) * 32;
        const b = Math.round(data[i+2] / 32) * 32;
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }
      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
      setDominantColors(sorted.map(([k]) => {
        const [r,g,b] = k.split(',').map(Number);
        return `rgb(${r},${g},${b})`;
      }));
    };
    img.src = URL.createObjectURL(file);
  }

  const searchEngines = [
    { name: 'Google Images', url: (preview) => `https://lens.google.com/uploadbyurl?url=UPLOAD` },
    { name: 'Yandex', url: () => `https://yandex.com/images/search?rpt=imageview` },
    { name: 'TinEye', url: () => `https://tineye.com/search` },
    { name: 'Bing', url: () => `https://bing.com/images/search?q=reverse+image+search` },
  ];

  return (
    <div style={S.section}>
      <div style={S.label}>Upload a photo to search across the internet</div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 280px' }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: '280px', height: '280px', border: '3px dashed var(--border)',
              background: preview ? 'transparent' : 'var(--surface2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', overflow: 'hidden', position: 'relative'
            }}>
            {preview ? (
              <img src={preview} alt="Upload" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                <svg style={{ width: '48px', height: '48px', margin: '0 auto 8px', display: 'block' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p style={{ fontWeight: 700, margin: 0 }}>CLICK TO UPLOAD</p>
                <p style={{ ...S.muted, margin: '4px 0 0' }}>JPG, PNG, WEBP</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>

        {preview && (
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={S.label}>Image Analysis</div>
            {exif && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', ...S.muted, fontSize: '11px', marginBottom: '16px' }}>
                <div><strong>Name:</strong> {exif.name}</div>
                <div><strong>Size:</strong> {exif.size}</div>
                <div><strong>Dimensions:</strong> {exif.width} x {exif.height}</div>
                <div><strong>Aspect:</strong> {exif.aspect}</div>
                <div><strong>Type:</strong> {exif.type}</div>
              </div>
            )}

            <div style={S.label}>Dominant Colors</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {dominantColors.map((c, i) => (
                <div key={i} style={{ width: '36px', height: '36px', background: c, border: '2px solid var(--border)', borderRadius: '50%' }} title={c} />
              ))}
            </div>

            <div style={S.label}>Reverse Image Search</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="https://lens.google.com" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', color: 'var(--fg)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#4285f4', color: '#fff', padding: '0 6px', fontWeight: 900 }}>G</span> Google Lens
              </a>
              <a href="https://yandex.com/images/search?rpt=imageview" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', color: 'var(--fg)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#fc3f1d', color: '#fff', padding: '0 6px', fontWeight: 900 }}>Y</span> Yandex
              </a>
              <a href="https://tineye.com" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', color: 'var(--fg)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#000', color: '#fff', padding: '0 6px', fontWeight: 900 }}>T</span> TinEye
              </a>
              <a href="https://bing.com/images/search?q=reverse+image+search" target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', color: 'var(--fg)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ background: '#008373', color: '#fff', padding: '0 6px', fontWeight: 900 }}>B</span> Bing Visual Search
              </a>
            </div>

            <div style={{ ...S.muted, marginTop: '12px', fontSize: '11px' }}>
              <strong>Tip:</strong> Save the image first, then drag into Google Lens or TinEye for matching across the web.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsernameSearch() {
  const [username, setUsername] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  async function handleSearch() {
    if (!username.trim() || username.trim().length < 2) { setError('Enter at least 2 characters'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await axios.post('/api/osint/username', { username: username.trim() });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    }
    setLoading(false);
  }

  const displayResults = results?.results || [];
  const categories = [...new Set(displayResults.map(r => r.category))].sort();
  const filtered = filter === 'all' ? displayResults : displayResults.filter(r => r.category === filter);

  return (
    <div style={S.section}>
      <div style={S.label}>Search a username across 250+ platforms</div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <input type="text" value={username} onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter username (e.g. johnsmith)"
            style={S.input} />
        </div>
        <Btn onClick={handleSearch} disabled={loading}>SEARCH</Btn>
      </div>
      {error && <div style={{ ...S.muted, color: '#ef4444', marginBottom: '12px', fontWeight: 700 }}>{error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <svg className="animate-spin" style={{ width: '32px', height: '32px', color: 'var(--accent)', margin: '0 auto 8px', display: 'block' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p style={{ fontWeight: 700, color: 'var(--fg)' }}>Scanning {results?.total_checked || 250}+ platforms...</p>
        </div>
      )}

      {results && !loading && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <Badge bg="rgba(34,197,94,0.2)" fg="#22c55e">Found: {results.found}</Badge>
            <Badge bg="rgba(239,68,68,0.2)" fg="#ef4444">Not found: {results.not_found}</Badge>
            <Badge>Checked: {results.total_checked}</Badge>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button onClick={() => setFilter('all')}
                style={{ ...S.pill, background: filter === 'all' ? 'var(--fg)' : 'var(--surface)', color: filter === 'all' ? 'var(--bg)' : 'var(--fg)', cursor: 'pointer' }}>
                ALL
              </button>
              {categories.map(c => (
                <button key={c} onClick={() => setFilter(c)}
                  style={{ ...S.pill, background: filter === c ? 'var(--fg)' : 'var(--surface)', color: filter === c ? 'var(--bg)' : 'var(--fg)', cursor: 'pointer' }}>
                  {c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', ...S.muted }}>
              No profiles found for this category
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px' }}>
              {filtered.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--surface)', border: '2px solid var(--border)',
                    boxShadow: '2px 2px 0px var(--border)', textDecoration: 'none',
                    transition: 'all 0.05s linear'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translate(-1px,-1px)'; e.currentTarget.style.boxShadow = '4px 4px 0px var(--border)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '2px 2px 0px var(--border)'; }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--fg)' }}>{r.name}</div>
                    <div style={{ ...S.muted, fontSize: '10px' }}>{r.category}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {r.status === 403 ? (
                      <span style={{ ...S.pill, background: 'rgba(234,179,8,0.2)', color: '#eab308', fontSize: '8px' }}>BLOCKED</span>
                    ) : (
                      <span style={{ ...S.pill, background: 'rgba(34,197,94,0.2)', color: '#22c55e', fontSize: '8px' }}>LIVE</span>
                    )}
                    <svg style={{ width: '14px', height: '14px', color: 'var(--muted)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmailOSINT() {
  const [email, setEmail] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!email.includes('@')) { setError('Enter a valid email'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await axios.post('/api/osint/email', { email: email.trim() });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    }
    setLoading(false);
  }

  return (
    <div style={S.section}>
      <div style={S.label}>Email address intelligence & breach check</div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter email (e.g. john@example.com)"
            style={S.input} />
        </div>
        <Btn onClick={handleSearch} disabled={loading}>INVESTIGATE</Btn>
      </div>
      {error && <div style={{ ...S.muted, color: '#ef4444', marginBottom: '12px', fontWeight: 700 }}>{error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ fontWeight: 700, color: 'var(--fg)' }}>Investigating email...</p></div>}

      {results && !loading && (
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <Badge bg="rgba(34,197,94,0.2)" fg="#22c55e">Valid Format</Badge>
            {results.reputation.is_disposable && <Badge bg="rgba(239,68,68,0.2)" fg="#ef4444">Disposable</Badge>}
            {results.reputation.is_role_based && <Badge bg="rgba(234,179,8,0.2)" fg="#eab308">Role Account</Badge>}
            {results.pwned.breaches > 0 && <Badge bg="rgba(239,68,68,0.2)" fg="#ef4444">{results.pwned.breach_count} Breaches</Badge>}
            {results.gravatar.exists && <Badge bg="rgba(99,102,241,0.2)" fg="#818cf8">Has Gravatar</Badge>}
            <Badge>{results.domain}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <div style={S.label}>Pwned / Breaches</div>
              {results.pwned.breaches ? (
                <div>
                  <p style={{ fontWeight: 700, color: '#ef4444', fontSize: '14px', margin: '0 0 8px' }}>
                    Found in {results.pwned.breach_count} breach{results.pwned.breach_count > 1 ? 'es' : ''}
                  </p>
                  {results.pwned.breach_names?.slice(0, 8).map((name, i) => (
                    <div key={i} style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', marginBottom: '4px', fontWeight: 700, fontSize: '11px' }}>{name}</div>
                  ))}
                </div>
              ) : (
                <p style={{ ...S.muted }}>No known breaches found (limited check)</p>
              )}
              <p style={{ ...S.muted, fontSize: '10px', marginTop: '8px' }}>
                <a href={`https://haveibeenpwned.com/account/${email}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>CHECK FULL HIBP &rarr;</a>
              </p>
            </Card>

            <Card>
              <div style={S.label}>Gravatar</div>
              {results.gravatar.exists ? (
                <div>
                  <img src={results.gravatar.avatar_url} alt="" style={{ width: '80px', height: '80px', border: '3px solid var(--border)', marginBottom: '8px' }} />
                  {results.gravatar.display_name && <p style={{ fontWeight: 700, fontSize: '13px', margin: '0 0 4px' }}>{results.gravatar.display_name}</p>}
                  {results.gravatar.about && <p style={{ ...S.muted, fontSize: '11px', margin: '0 0 4px' }}>{results.gravatar.about}</p>}
                  {results.gravatar.urls?.length > 0 && (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase', marginBottom: '4px' }}>Links:</div>
                      {results.gravatar.urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>{url}</a>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ ...S.muted }}>No Gravatar profile found</p>
              )}
            </Card>

            <Card>
              <div style={S.label}>Name Guesses</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.name_guesses.map((name, i) => (
                  <div key={i} style={{ padding: '6px 10px', background: 'var(--surface2)', border: '2px solid var(--border)', fontWeight: 700, fontSize: '12px' }}>{name}</div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={S.label}>Possible Other Emails</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.email_variations.filter(e => e !== results.email).map((e, i) => (
                  <div key={i} style={{ padding: '4px 8px', background: 'var(--surface2)', border: '2px solid var(--border)', fontSize: '11px', fontWeight: 700, fontFamily: 'monospace' }}>{e}</div>
                ))}
              </div>
            </Card>
          </div>

          <div style={{ marginTop: '16px' }}>
            <Card>
              <div style={S.label}>Social Search Links</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                {results.social_search.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      padding: '8px 12px', background: 'var(--surface)', border: '2px solid var(--border)',
                      textDecoration: 'none', fontSize: '11px', fontWeight: 700, color: 'var(--fg)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                    <span>{s.name}</span>
                    <span style={{ ...S.pill, fontSize: '8px', background: s.reachable ? 'rgba(34,197,94,0.2)' : 'var(--surface2)', color: s.reachable ? '#22c55e' : 'var(--muted)' }}>
                      {s.reachable ? 'OK' : 'BLOCKED'}
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneOSINT() {
  const [phone, setPhone] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch() {
    if (!phone.trim()) { setError('Enter a phone number'); return; }
    setLoading(true); setError(''); setResults(null);
    try {
      const res = await axios.post('/api/osint/phone', { phone: phone.trim() });
      setResults(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed');
    }
    setLoading(false);
  }

  return (
    <div style={S.section}>
      <div style={S.label}>Phone number lookup & verification</div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Enter phone (e.g. +628123456789)"
            style={S.input} />
        </div>
        <Btn onClick={handleSearch} disabled={loading}>LOOKUP</Btn>
      </div>
      {error && <div style={{ ...S.muted, color: '#ef4444', marginBottom: '12px', fontWeight: 700 }}>{error}</div>}

      {loading && <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ fontWeight: 700, color: 'var(--fg)' }}>Looking up phone...</p></div>}

      {results && !loading && (
        <div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {results.valid_length && <Badge bg="rgba(34,197,94,0.2)" fg="#22c55e">Valid Format</Badge>}
            {results.country && <Badge bg="rgba(99,102,241,0.2)" fg="#818cf8">{results.country.name}</Badge>}
            {results.whatsapp.reachable && <Badge bg="rgba(37,211,102,0.2)" fg="#25d366">WhatsApp</Badge>}
            {results.telegram.reachable && <Badge bg="rgba(0,136,204,0.2)" fg="#0088cc">Telegram</Badge>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Card>
              <div style={S.label}>Details</div>
              <div style={{ ...S.muted, fontSize: '11px' }}>
                <p><strong>Original:</strong> {results.phone}</p>
                <p><strong>Digits:</strong> {results.digits}</p>
                <p><strong>Length:</strong> {results.digits.length} digits</p>
                {results.country && <p><strong>Country:</strong> {results.country.name} ({results.country.code})</p>}
              </div>
            </Card>

            <Card>
              <div style={S.label}>Format Suggestions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {results.format_suggestions.slice(0, 5).map((f, i) => (
                  <div key={i} style={{
                    padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700, fontSize: '12px',
                    background: 'var(--surface2)', border: '2px solid var(--border)',
                    cursor: 'pointer'
                  }} onClick={() => { navigator.clipboard?.writeText(f); }}>{f}</div>
                ))}
              </div>
            </Card>

            <Card>
              <div style={S.label}>Messaging</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '12px' }}>WhatsApp</p>
                  {results.whatsapp.reachable ? (
                    <a href={results.whatsapp.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#25d366', color: '#fff', fontWeight: 700, border: '3px solid var(--border)', textDecoration: 'none', display: 'inline-block', fontSize: '12px' }}>OPEN WHATSAPP &rarr;</a>
                  ) : <p style={{ ...S.muted, fontSize: '11px' }}>Not detected on WhatsApp</p>}
                </div>
                <div>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '12px' }}>Telegram</p>
                  {results.telegram.reachable ? (
                    <a href={results.telegram.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#0088cc', color: '#fff', fontWeight: 700, border: '3px solid var(--border)', textDecoration: 'none', display: 'inline-block', fontSize: '12px' }}>OPEN TELEGRAM &rarr;</a>
                  ) : <p style={{ ...S.muted, fontSize: '11px' }}>Not detected on Telegram</p>}
                </div>
                <div>
                  <p style={{ fontWeight: 700, margin: '0 0 4px', fontSize: '12px' }}>Truecaller</p>
                  {results.truecaller.reachable ? (
                    <a href={results.truecaller.url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: '#e67e22', color: '#fff', fontWeight: 700, border: '3px solid var(--border)', textDecoration: 'none', display: 'inline-block', fontSize: '12px' }}>OPEN TRUECALLER &rarr;</a>
                  ) : <p style={{ ...S.muted, fontSize: '11px' }}>Not found on Truecaller</p>}
                </div>
              </div>
            </Card>

            {results.sos && (
              <Card>
                <div style={S.label}>Tip</div>
                <p style={{ ...S.muted, fontSize: '11px' }}>{results.sos.note}</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
