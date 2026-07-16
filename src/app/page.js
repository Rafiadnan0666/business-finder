"use client"
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

const HR_PREFIXES = ['hr', 'careers', 'recruitment', 'jobs', 'hiring', 'talent', 'people', 'personnel', 'hrteam', 'hrdept', 'humanresources', 'employement', 'staffing', 'workwithus', 'joinus', 'career', 'job', 'recruiter', 'talentacquisition'];
const businessCategories = ['shop', 'restaurant', 'cafe', 'bar', 'hotel', 'pharmacy', 'bank', 'clinic', 'hospital', 'dentist', 'car_rental', 'supermarket', 'mall', 'office', 'school', 'university'];
const STORAGE_KEY = 'appkind_search_history';
const THEME_KEY = 'appkind_theme';

function loadHistory() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(0, 10))); } catch {}
}
function loadTheme() {
  try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch { return 'dark'; }
}
function saveTheme(t) {
  try { localStorage.setItem(THEME_KEY, t); } catch {}
}

function getOverpassCategoryQuery(category, radius, lat, lon) {
  const r = radius * 1000;
  const map = {
    shop: `node["shop"](around:${r},${lat},${lon});`,
    restaurant: `node["amenity"="restaurant"](around:${r},${lat},${lon});`,
    cafe: `node["amenity"="cafe"](around:${r},${lat},${lon});`,
    bar: `node["amenity"="bar"](around:${r},${lat},${lon});`,
    hotel: `node["amenity"="hotel"](around:${r},${lat},${lon});`,
    pharmacy: `node["amenity"="pharmacy"](around:${r},${lat},${lon});`,
    bank: `node["amenity"="bank"](around:${r},${lat},${lon});`,
    clinic: `node["amenity"="clinic"](around:${r},${lat},${lon});`,
    hospital: `node["amenity"="hospital"](around:${r},${lat},${lon});`,
    dentist: `node["amenity"="dentist"](around:${r},${lat},${lon});`,
    car_rental: `node["amenity"="car_rental"](around:${r},${lat},${lon});`,
    supermarket: `node["shop"="supermarket"](around:${r},${lat},${lon});`,
    mall: `node["building"="mall"](around:${r},${lat},${lon});node["shop"="mall"](around:${r},${lat},${lon});`,
    office: `node["office"](around:${r},${lat},${lon});`,
    school: `node["amenity"="school"](around:${r},${lat},${lon});`,
    university: `node["amenity"="university"](around:${r},${lat},${lon});`
  };
  return map[category] || '';
}

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ie/api/interpreter'
];

function getAllCategoryQuery(radius, lat, lon) {
  const r = radius * 1000;
  const amens = ['restaurant','cafe','bar','pub','fast_food','pharmacy','bank','clinic','hospital','dentist','school','university','college','fuel','parking','hotel','motel','hostel'];
  const lines = amens.map(a => `node["amenity"="${a}"](around:${r},${lat},${lon});`);
  lines.push(`node["shop"](around:${r},${lat},${lon});`);
  lines.push(`node["office"](around:${r},${lat},${lon});`);
  lines.push(`node["craft"](around:${r},${lat},${lon});`);
  lines.push(`node["building"="mall"](around:${r},${lat},${lon});`);
  lines.push(`node["shop"="supermarket"](around:${r},${lat},${lon});`);
  return lines.join('\n');
}

async function queryOverpass(query, attempt = 0) {
  const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
  try {
    return await axios.post(endpoint, query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: Math.min(30000 + attempt * 15000, 90000)
    });
  } catch (err) {
    if (attempt < 2) return queryOverpass(query, attempt + 1);
    throw err;
  }
}

function processOverpassResults(elements) {
  return elements.filter(e => e.tags?.name && (e.lat ?? e.center?.lat)).map(e => {
    const tags = e.tags || {};
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    return {
      id: e.id, name: tags.name,
      type: tags.shop || tags.amenity || tags.office || tags.leisure || tags.tourism || tags.craft || tags.building || '',
      category: tags.shop || tags.amenity || tags.office || tags.craft || tags.building || '',
      subcategory: tags.cuisine || tags.shop || tags.office || tags.amenity || tags.craft || '',
      lat, lon,
      phone: cleanPhone(tags.phone || tags['contact:phone']),
      address: [tags['addr:street'], tags['addr:housenumber'], tags['addr:city'], tags['addr:postcode'], tags['addr:country']].filter(Boolean).join(', '),
      website: tags.website || tags['contact:website'] || '',
      email: tags.email || tags['contact:email'] || '',
      opening_hours: tags.opening_hours || '',
      description: getDescription(tags),
      google_maps_url: `https://www.google.com/maps?q=${lat},${lon}`,
      google_maps_embed: `https://maps.google.com/maps?q=${lat},${lon}&z=15&output=embed`,
      brand: tags.brand || '', operator: tags.operator || '',
      facebook: tags['contact:facebook'] || '', instagram: tags['contact:instagram'] || '',
      twitter: tags['contact:twitter'] || '', linkedin: tags['contact:linkedin'] || tags.linkedin || '',
      youtube: tags['contact:youtube'] || tags.youtube || '', tiktok: tags['contact:tiktok'] || tags.tiktok || '',
      wheelchair: tags.wheelchair || '', capacity: tags.capacity || '',
      building: tags.building || '', cuisine: tags.cuisine || '',
      diet_vegetarian: tags['diet:vegetarian'] || '', diet_vegan: tags['diet:vegan'] || '',
      organic: tags.organic || '', takeaway: tags.takeaway || '',
      delivery: tags.delivery || '', outdoor_seating: tags['outdoor_seating'] || '',
      smoking: tags.smoking || '', internet_access: tags['internet_access'] || '',
      wifi: tags.wifi || '', payment: tags.payment || '',
      drive_through: tags['drive_through'] || '', parking: tags.parking || '',
      stars: tags.stars || '',
      all_tags: JSON.stringify(tags)
    };
  });
}

function getDescription(tags) {
  const d = [];
  if (tags.cuisine) d.push(`Cuisine: ${tags.cuisine}`);
  if (tags.brand) d.push(`Brand: ${tags.brand}`);
  if (tags['contact:facebook']) d.push(`FB: ${tags['contact:facebook']}`);
  if (tags['contact:instagram']) d.push(`IG: ${tags['contact:instagram']}`);
  if (tags['contact:twitter']) d.push(`TW: ${tags['contact:twitter']}`);
  if (tags['contact:linkedin']) d.push(`LI: ${tags['contact:linkedin']}`);
  if (tags.wheelchair) d.push(`♿ ${tags.wheelchair}`);
  if (tags.capacity) d.push(`Capacity: ${tags.capacity}`);
  if (tags.stars) d.push(`★ ${tags.stars}`);
  if (tags.operator) d.push(`Operator: ${tags.operator}`);
  return d.join(' | ');
}

function cleanPhone(p) { return p ? p.replace(/[^\d+]/g, '') : ''; }

function BrutalCard({ children, className = '', style = {} }) {
  return (
    <div className={className} style={{ background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '5px 5px 0px var(--border)', ...style }}>
      {children}
    </div>
  );
}

function BrutalBtn({ children, color, onClick, disabled, small, className = '', style = {} }) {
  const bg = color || 'var(--accent)';
  return (
    <button onClick={onClick} disabled={disabled}
      className={className}
      style={{
        background: disabled ? 'var(--surface2)' : bg,
        color: disabled ? 'var(--muted)' : '#fff',
        border: `3px solid var(--border)`,
        boxShadow: disabled ? 'none' : '3px 3px 0px var(--border)',
        fontWeight: 700,
        fontSize: small ? '11px' : '13px',
        padding: small ? '6px 14px' : '10px 24px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.05s linear',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        ...style
      }}
      onMouseDown={e => { if (!disabled) { e.currentTarget.style.transform = 'translate(2px,2px)'; e.currentTarget.style.boxShadow = '1px 1px 0px var(--border)'; }}}
      onMouseUp={e => { if (!disabled) { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--border)'; }}}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.transform = 'translate(0,0)'; e.currentTarget.style.boxShadow = '3px 3px 0px var(--border)'; }}}
    >
      {children}
    </button>
  );
}

function BrutalBadge({ children, bg, fg }) {
  return (
    <span style={{
      display: 'inline-block',
      background: bg || 'var(--surface2)',
      color: fg || 'var(--fg)',
      border: '2px solid var(--border)',
      fontWeight: 700,
      fontSize: '10px',
      padding: '2px 8px',
      textTransform: 'uppercase'
    }}>
      {children}
    </span>
  );
}

export default function Home() {
  const [place, setPlace] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [center, setCenter] = useState([0, 0]);
  const [activeTab, setActiveTab] = useState('map');
  const [searchRadius, setSearchRadius] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
  const [enrichEnabled, setEnrichEnabled] = useState(true);
  const [theme, setThemeState] = useState('dark');
  const enrichAbortRef = useRef(false);
  const inputRef = useRef();
  const suggestionsRef = useRef();

  useEffect(() => {
    setSearchHistory(loadHistory());
    const t = loadTheme();
    setThemeState(t);
    if (t === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    saveTheme(next);
    if (next === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  };

  useEffect(() => {
    function handleClick(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) setSuggestions([]);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = async (e) => {
    const v = e.target.value;
    setPlace(v); setError('');
    if (v.length < 2) { setSuggestions([]); return; }
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search`, { params: { q: v, format: 'json', addressdetails: 1, limit: 5 } });
      setSuggestions(res.data);
    } catch { setSuggestions([]); }
  };

  const handleSuggestionClick = (s) => { setPlace(s.display_name); setSuggestions([]); inputRef.current.blur(); };
  const handleKeyDown = (e) => { if (e.key === 'Enter' && place.trim()) searchBusinesses(); };
  const toggleCategory = (c) => setSelectedCategories(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);

  const searchBusinesses = async (historyPlace) => {
    const sq = historyPlace || place;
    if (!sq.trim()) return;
    setLoading(true); setSuggestions([]); setError(''); setSearchTerm('');
    try {
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search`, { params: { q: sq, format: 'json', limit: 1 } });
      if (!geo.data.length) throw new Error("Place not found. Try a different location name.");
      const { lat, lon } = geo.data[0];
      setCenter([parseFloat(lat), parseFloat(lon)]);
      let qp = [];
      const maxSize = Math.min(50000000, 2000000 + searchRadius * 2000000);
      if (selectedCategories.length === 0) {
        qp = [getAllCategoryQuery(searchRadius, lat, lon)];
      } else {
        selectedCategories.forEach(c => { const q = getOverpassCategoryQuery(c, searchRadius, lat, lon); if (q) qp.push(q); });
      }
      const query = `[out:json][timeout:90][maxsize:${maxSize}];(${qp.join('\n')});out center 60;`;
      const overpass = await queryOverpass(query);
      const results = processOverpassResults(overpass.data.elements);
      setBusinesses(results);
      if (results.length === 0) setError('No businesses found in this area. Try increasing the radius or changing categories.');
      if (results.length > 0 && enrichEnabled) {
        try {
          setEnriching(true);
          const toEnrich = results.filter(b => b.name && b.name !== 'N/A').slice(0, 30);
          setEnrichProgress({ current: 0, total: toEnrich.length });
          const enrichRes = await axios.post('/api/enrich', { businesses: toEnrich }, { timeout: 300000 });
          const enriched = enrichRes.data.businesses || [];
          const merged = results.map((orig, idx) => {
            const enr = enriched.find(e => e.id === orig.id) || enriched[idx];
            if (!enr) return { ...orig, _enriched: true };
            const m = { ...orig };
            m.hr_email = enr.hr_email || m.hr_email; m.hr_emails = enr.hr_emails || m.hr_emails;
            m.email_patterns = enr.email_patterns || m.email_patterns;
            m.email = enr.email && enr.email !== 'Email not available' ? enr.email : m.email;
            m.phone = enr.phone && enr.phone !== 'Phone not listed' ? enr.phone : m.phone;
            m.description = enr.description && enr.description !== 'No description available' ? enr.description : m.description;
            m.opening_hours = enr.opening_hours && enr.opening_hours !== 'Hours not available' ? enr.opening_hours : m.opening_hours;
            m.address = enr.address && enr.address !== 'Address not available' && !m.address ? enr.address : m.address;
            m.facebook = enr.facebook || m.facebook; m.instagram = enr.instagram || m.instagram;
            m.twitter = enr.twitter || m.twitter; m.linkedin = enr.linkedin || m.linkedin;
            m.youtube = enr.youtube || m.youtube; m.tiktok = enr.tiktok || m.tiktok;
            m.pinterest = enr.pinterest || m.pinterest; m.snapchat = enr.snapchat || m.snapchat;
            m.discord = enr.discord || m.discord; m.telegram = enr.telegram || m.telegram;
            m.whatsapp = enr.whatsapp || m.whatsapp;
            m.medium = enr.medium || m.medium; m.github = enr.github || m.github;
            m.glassdoor = enr.glassdoor || m.glassdoor; m.crunchbase = enr.crunchbase || m.crunchbase;
            m.angellist = enr.angellist || m.angellist; m.behance = enr.behance || m.behance;
            m.dribbble = enr.dribbble || m.dribbble; m.twitch = enr.twitch || m.twitch;
            m.reddit = enr.reddit || m.reddit; m.yelp = enr.yelp || m.yelp;
            m.foursquare = enr.foursquare || m.foursquare; m.tripadvisor = enr.tripadvisor || m.tripadvisor;
            m.imdb = enr.imdb || m.imdb; m.etsy = enr.etsy || m.etsy;
            m.soundcloud = enr.soundcloud || m.soundcloud; m.spotify = enr.spotify || m.spotify;
            m.vimeo = enr.vimeo || m.vimeo; m.patreon = enr.patreon || m.patreon;
            m.producthunt = enr.producthunt || m.producthunt; m.trustpilot = enr.trustpilot || m.trustpilot;
            m.g2 = enr.g2 || m.g2;
            m.type = enr.type && enr.type !== 'Type not specified' ? enr.type : m.type;
            m.category = enr.category && enr.category !== 'Category not specified' ? enr.category : m.category;
            m.employees = enr.employees || m.employees; m._data_score = enr._data_score || m._data_score;
            m._data_missing = enr._data_missing || m._data_missing; m._size_hint = enr._size_hint || m._size_hint;
            m._has_employees = enr._has_employees || m._has_employees;
            m._enriched = true;
            return m;
          });
          setBusinesses(merged);
        } catch (err) {
          console.error('Auto-enrichment error:', err);
          setError('Enrichment partially failed — some results may have incomplete data. Try clicking Enrich again.');
        }
        setEnriching(false);
        setEnrichProgress({ current: 0, total: 0 });
      }
      const uh = [sq, ...searchHistory.filter(h => h !== sq)].slice(0, 10);
      setSearchHistory(uh); saveHistory(uh);
    } catch (error) {
      console.error("Search error:", error);
      if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
        setError("Query timed out for this area. Try a smaller radius (3-8 km) or fewer categories, or try a more specific location.");
      } else setError(error.message || "Search failed. Please try again.");
    }
    setLoading(false);
  };

  const filteredBusinesses = useMemo(() => {
    let r = [...businesses];
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      r = r.filter(b => b.name.toLowerCase().includes(t) || b.type.toLowerCase().includes(t) || b.category.toLowerCase().includes(t) || b.address.toLowerCase().includes(t) || b.phone.includes(t) || b.email.toLowerCase().includes(t) || (b.hr_email || '').toLowerCase().includes(t) || b.description.toLowerCase().includes(t) || b.cuisine.toLowerCase().includes(t) || b.brand.toLowerCase().includes(t) || b.operator.toLowerCase().includes(t) || b.linkedin.toLowerCase().includes(t) || b.youtube.toLowerCase().includes(t) || b.facebook.toLowerCase().includes(t) || b.instagram.toLowerCase().includes(t) || b.twitter.toLowerCase().includes(t));
    }
    switch (sortBy) {
      case 'name-asc': r.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': r.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'type': r.sort((a, b) => a.type.localeCompare(b.type)); break;
      case 'category': r.sort((a, b) => a.category.localeCompare(b.category)); break;
    }
    return r;
  }, [businesses, searchTerm, sortBy]);

  const downloadCSV = () => {
    if (!filteredBusinesses.length) return;
    const csvData = filteredBusinesses.map(b => ({
      Name: b.name, Type: b.type, Category: b.category, Subcategory: b.subcategory,
      Latitude: b.lat, Longitude: b.lon, Phone: b.phone, Address: b.address,
      Website: b.website, Email: b.email, 'HR Email': b.hr_email || '',
      'Opening Hours': b.opening_hours, Description: b.description,
      'Google Maps Link': b.google_maps_url, Brand: b.brand, Operator: b.operator,
      Facebook: b.facebook, Instagram: b.instagram, Twitter: b.twitter,
      LinkedIn: b.linkedin || '', YouTube: b.youtube || '', TikTok: b.tiktok || '',
      Wheelchair: b.wheelchair, Capacity: b.capacity, Building: b.building,
      Cuisine: b.cuisine, 'Vegetarian': b.diet_vegetarian, 'Vegan': b.diet_vegan,
      Organic: b.organic, Takeaway: b.takeaway, Delivery: b.delivery,
      'Outdoor Seating': b.outdoor_seating, Smoking: b.smoking, 'Internet': b.internet_access,
      WiFi: b.wifi, Payment: b.payment, 'Drive Through': b.drive_through, Parking: b.parking,
      'All Tags': b.all_tags,
      'Email Patterns': b.email_patterns ? b.email_patterns.join('; ') : '',
      'HR Emails': b.hr_emails ? b.hr_emails.join('; ') : '',
      Pinterest: b.pinterest || '', Snapchat: b.snapchat || '',
      Discord: b.discord || '', Telegram: b.telegram || '',
      WhatsApp: b.whatsapp || '',
      Medium: b.medium || '', GitHub: b.github || '',
      Glassdoor: b.glassdoor || '', Crunchbase: b.crunchbase || '',
      AngelList: b.angellist || '', Behance: b.behance || '',
      Dribbble: b.dribbble || '', Twitch: b.twitch || '',
      Reddit: b.reddit || '', Yelp: b.yelp || '',
      Foursquare: b.foursquare || '', TripAdvisor: b.tripadvisor || '',
      IMDb: b.imdb || '', Etsy: b.etsy || '',
      SoundCloud: b.soundcloud || '', Spotify: b.spotify || '',
      Vimeo: b.vimeo || '', Patreon: b.patreon || '',
      ProductHunt: b.producthunt || '', Trustpilot: b.trustpilot || '',
      G2: b.g2 || '',
      Employees: b.employees?.length ? b.employees.map(e => `${e.name}${e.title ? ` (${e.title})` : ''}${e.email ? ` - ${e.email}` : ''}`).join('; ') : '',
      'Data Score': b._data_score !== undefined ? `${b._data_score}%` : '',
      'Size Hint': b._size_hint || '',
      Enriched: b._enriched ? 'Yes' : 'No'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `businesses_${place.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const downloadJSON = () => {
    if (!filteredBusinesses.length) return;
    const blob = new Blob([JSON.stringify(filteredBusinesses, null, 2)], { type: 'application/json' });
    saveAs(blob, `businesses_${place.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
  };

  const clearHistory = () => { setSearchHistory([]); saveHistory([]); };
  const clearResults = () => { setBusinesses([]); setError(''); setSearchTerm(''); };

  const enrichCurrentResults = useCallback(async () => {
    if (!businesses.length) return;
    const toEnrich = businesses.filter(b => b.name && b.name !== 'N/A').slice(0, 30);
    setEnriching(true); setEnrichProgress({ current: 0, total: toEnrich.length });
    enrichAbortRef.current = false;
    try {
      const response = await axios.post('/api/enrich', { businesses: toEnrich }, { timeout: 300000 });
      if (enrichAbortRef.current) return;
      const enriched = response.data.businesses || [];
      const merged = businesses.map((orig, idx) => {
        const enr = enriched.find(e => e.id === orig.id) || enriched[idx];
        if (!enr) return { ...orig, _enriched: true };
        const m = { ...orig };
        m.hr_email = enr.hr_email || m.hr_email; m.hr_emails = enr.hr_emails || m.hr_emails;
        m.email_patterns = enr.email_patterns || m.email_patterns;
        m.email = enr.email && enr.email !== 'Email not available' ? enr.email : m.email;
        m.phone = enr.phone && enr.phone !== 'Phone not listed' ? enr.phone : m.phone;
        m.description = enr.description && enr.description !== 'No description available' ? enr.description : m.description;
        m.opening_hours = enr.opening_hours && enr.opening_hours !== 'Hours not available' ? enr.opening_hours : m.opening_hours;
        m.address = enr.address && enr.address !== 'Address not available' && !m.address ? enr.address : m.address;
        m.facebook = enr.facebook || m.facebook; m.instagram = enr.instagram || m.instagram;
        m.twitter = enr.twitter || m.twitter; m.linkedin = enr.linkedin || m.linkedin;
        m.youtube = enr.youtube || m.youtube; m.tiktok = enr.tiktok || m.tiktok;
        m.pinterest = enr.pinterest || m.pinterest; m.snapchat = enr.snapchat || m.snapchat;
        m.discord = enr.discord || m.discord; m.telegram = enr.telegram || m.telegram;
        m.whatsapp = enr.whatsapp || m.whatsapp;
        m.medium = enr.medium || m.medium; m.github = enr.github || m.github;
        m.glassdoor = enr.glassdoor || m.glassdoor; m.crunchbase = enr.crunchbase || m.crunchbase;
        m.angellist = enr.angellist || m.angellist; m.behance = enr.behance || m.behance;
        m.dribbble = enr.dribbble || m.dribbble; m.twitch = enr.twitch || m.twitch;
        m.reddit = enr.reddit || m.reddit; m.yelp = enr.yelp || m.yelp;
        m.foursquare = enr.foursquare || m.foursquare; m.tripadvisor = enr.tripadvisor || m.tripadvisor;
        m.imdb = enr.imdb || m.imdb; m.etsy = enr.etsy || m.etsy;
        m.soundcloud = enr.soundcloud || m.soundcloud; m.spotify = enr.spotify || m.spotify;
        m.vimeo = enr.vimeo || m.vimeo; m.patreon = enr.patreon || m.patreon;
        m.producthunt = enr.producthunt || m.producthunt; m.trustpilot = enr.trustpilot || m.trustpilot;
        m.g2 = enr.g2 || m.g2;
        m.type = enr.type && enr.type !== 'Type not specified' ? enr.type : m.type;
        m.category = enr.category && enr.category !== 'Category not specified' ? enr.category : m.category;
        m.employees = enr.employees || m.employees; m._data_score = enr._data_score || m._data_score;
        m._data_missing = enr._data_missing || m._data_missing; m._size_hint = enr._size_hint || m._size_hint;
        m._has_employees = enr._has_employees || m._has_employees;
        m._enriched = true;
        return m;
      });
      setBusinesses(merged);
    } catch (err) {
      if (!enrichAbortRef.current) {
        console.error('Enrichment error:', err);
        setError('Enrichment failed. The target websites may be blocking requests. Data enrichment was skipped.');
      }
    }
    setEnriching(false); setEnrichProgress({ current: 0, total: 0 });
  }, [businesses]);

  const ThemeIcon = () => theme === 'dark' ?
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
    :
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>;

  const S = {
    section: { background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '5px 5px 0px var(--border)', padding: '20px', marginBottom: '20px' },
    label: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--muted)', marginBottom: '8px' },
    input: { background: 'var(--bg)', color: 'var(--fg)', border: '3px solid var(--border)', padding: '12px 16px', fontSize: '14px', fontWeight: 600, outline: 'none', width: '100%' },
    muted: { color: 'var(--muted)', fontSize: '12px' },
  };

  const TH_STYLE = { padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--surface2)', color: 'var(--fg)', borderBottom: '3px solid var(--border)' };
  const TD_STYLE = { padding: '12px 16px', fontSize: '13px', borderBottom: '2px solid var(--border)' };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 16px' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', background: 'var(--accent)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '20px' }}>A</div>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--fg)', margin: 0, textTransform: 'uppercase', letterSpacing: '-0.5px' }}>AppKind</h1>
              <p style={{ ...S.muted, margin: 0 }}>Business Finder · OpenStreetMap</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BrutalBadge>v3.0</BrutalBadge>
            <button onClick={toggleTheme} style={{ width: '40px', height: '40px', background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ThemeIcon />
            </button>
          </div>
        </div>

        {/* SEARCH */}
        <div style={S.section}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
              <input ref={inputRef} type="text" value={place} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Enter city, address, or location..."
                style={S.input} autoComplete="off" />
              {enriching && (
                <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                  <svg className="animate-spin" style={{ width: '18px', height: '18px', color: 'var(--accent)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
              {suggestions.length > 0 && (
                <ul ref={suggestionsRef} style={{ position: 'absolute', zIndex: 10, width: '100%', marginTop: '4px', background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '5px 5px 0px var(--border)', listStyle: 'none', padding: 0 }}>
                  {suggestions.map((s, idx) => (
                    <li key={idx} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: idx < suggestions.length - 1 ? '2px solid var(--border)' : 'none' }}
                      onClick={() => handleSuggestionClick(s)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--fg)' }}>{s.display_name.split(',')[0]}</div>
                      <div style={{ ...S.muted }}>{s.display_name.split(',').slice(1).join(',')}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <BrutalBtn onClick={() => searchBusinesses()} disabled={loading || !place.trim()} color="var(--accent)">
              {loading ? 'SEARCHING...' : businesses.length > 0 ? 'SEARCH AGAIN' : 'FIND BUSINESSES'}
            </BrutalBtn>
          </div>

          {searchHistory.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ ...S.label }}>Recent</span>
                <button onClick={clearHistory} style={{ ...S.muted, textDecoration: 'underline', fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>CLEAR</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {searchHistory.map((h, idx) => (
                  <button key={idx} onClick={() => { setPlace(h); searchBusinesses(h); }}
                    style={{ padding: '4px 12px', fontSize: '11px', fontWeight: 700, background: 'var(--surface)', border: '2px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}>
                    {h.length > 40 ? h.slice(0, 40) + '...' : h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div style={S.label}>Radius: <span style={{ color: 'var(--accent)' }}>{searchRadius} km</span></div>
              <input type="range" min="1" max="20" value={searchRadius} onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', height: '8px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', ...S.muted, marginTop: '4px' }}><span>1 km</span><span>20 km</span></div>
            </div>
            <div>
              <div style={S.label}>Categories</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {businessCategories.map(cat => (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '4px 12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      background: selectedCategories.includes(cat) ? 'var(--accent)' : 'var(--surface)',
                      color: selectedCategories.includes(cat) ? '#fff' : 'var(--fg)',
                      border: '2px solid var(--border)',
                      cursor: 'pointer'
                    }}>
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <div style={{ ...S.muted, marginTop: '6px' }}>
                {selectedCategories.length > 0 ? `Showing: ${selectedCategories.join(', ')}` : 'All types'}
                {selectedCategories.length > 0 && <button onClick={() => setSelectedCategories([])} style={{ marginLeft: '8px', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '11px' }}>CLEAR</button>}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: '16px', borderTop: '3px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', ...S.muted, cursor: 'pointer', fontWeight: 700 }}>
              <input type="checkbox" checked={enrichEnabled} onChange={(e) => setEnrichEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
              AUTO-ENRICH
            </label>
            <span style={{ padding: '2px 10px', fontSize: '10px', fontWeight: 700, border: '2px solid var(--border)', background: enrichEnabled ? 'rgba(16,185,129,0.15)' : 'var(--surface2)', color: enrichEnabled ? '#10b981' : 'var(--muted)' }}>
              {enrichEnabled ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{ ...S.section, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#d97706' }}>{error}</span>
            <button onClick={() => setError('')} style={{ fontWeight: 900, fontSize: '18px', background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', padding: '0 0 0 12px' }}>&times;</button>
          </div>
        )}

        {/* RESULTS */}
        {businesses.length > 0 && (
          <div style={S.section}>
            {/* TABS */}
            <div style={{ display: 'flex', borderBottom: '3px solid var(--border)', marginBottom: '16px', flexWrap: 'wrap', gap: '4px' }}>
              {['map', 'table'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 20px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
                    background: activeTab === tab ? 'var(--fg)' : 'var(--surface)',
                    color: activeTab === tab ? 'var(--bg)' : 'var(--fg)',
                    border: '3px solid var(--border)',
                    borderBottom: activeTab === tab ? '3px solid var(--fg)' : '3px solid var(--border)',
                    marginBottom: '-3px',
                    cursor: 'pointer'
                  }}>
                  {tab === 'map' ? 'Map View' : `Table (${filteredBusinesses.length}/${businesses.length})`}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '4px 0' }}>
                {enriching && <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>ENRICHING {enrichProgress.current}/{enrichProgress.total}...</span>}
                <BrutalBtn small onClick={() => { enrichAbortRef.current = true; setEnriching(false); setEnrichProgress({ current: 0, total: 0 }); }} disabled={!enriching} color="#d97706">STOP</BrutalBtn>
                <BrutalBtn small onClick={enrichCurrentResults} disabled={enriching || !businesses.length} color="var(--accent)">ENRICH</BrutalBtn>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="FILTER..."
                  style={{ ...S.input, padding: '6px 10px', fontSize: '11px', width: '100px' }} />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  style={{ ...S.input, padding: '6px 10px', fontSize: '11px', width: '110px', cursor: 'pointer' }}>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                  <option value="type">Type</option>
                  <option value="category">Category</option>
                </select>
                <BrutalBtn small onClick={downloadCSV} color="#059669">CSV</BrutalBtn>
                <BrutalBtn small onClick={downloadJSON} color="#7c3aed">JSON</BrutalBtn>
                <button onClick={clearResults} style={{ width: '36px', height: '36px', background: '#dc2626', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 900, fontSize: '16px' }}>&times;</button>
              </div>
            </div>

            {/* MAP VIEW */}
            {activeTab === 'map' && (
              <div>
                <div style={{ height: '450px', border: '3px solid var(--border)', marginBottom: '20px' }}>
                  <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {filteredBusinesses.map((b, idx) => (
                      <Marker key={b.id || idx} position={[b.lat, b.lon]}>
                        <Popup>
                          <div style={{ fontSize: '13px', maxWidth: '260px' }}>
                            <h3 style={{ fontWeight: 900, fontSize: '15px', margin: '0 0 4px' }}>{b.name}</h3>
                            {b.type && b.type !== 'Type not specified' && <p style={{ margin: '2px 0' }}><strong>Type:</strong> {b.type}</p>}
                            {b.category && b.category !== 'Category not specified' && <p style={{ margin: '2px 0' }}><strong>Cat:</strong> {b.category}</p>}
                            {b.phone && b.phone !== 'Phone not listed' && <p style={{ margin: '2px 0' }}><strong>Phone:</strong> {b.phone}</p>}
                            {b.email && b.email !== 'Email not available' && <p style={{ margin: '2px 0' }}><strong>Email:</strong> {b.email}</p>}
                            {b.hr_email && <p style={{ margin: '2px 0', color: '#ef4444' }}><strong>HR:</strong> {b.hr_email}</p>}
                            {b.address && b.address !== 'Address not available' && <p style={{ margin: '2px 0' }}><strong>Address:</strong> {b.address}</p>}
                            {b.website && b.website !== 'Website not available' && <p style={{ margin: '2px 0' }}><strong>Website:</strong> <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700 }}>OPEN</a></p>}
                            {b.opening_hours && b.opening_hours !== 'Hours not available' && <p style={{ margin: '2px 0', fontSize: '11px' }}><strong>Hours:</strong> {b.opening_hours}</p>}
                            <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '12px', marginTop: '4px', display: 'inline-block' }}>VIEW ON GOOGLE MAPS &rarr;</a>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                  {filteredBusinesses.map((b, idx) => (
                    <div key={b.id || idx} style={{ background: 'var(--surface)', border: '3px solid var(--border)', boxShadow: '4px 4px 0px var(--border)', overflow: 'hidden' }}>
                      <div style={{ height: '140px', borderBottom: '3px solid var(--border)' }}>
                        <iframe src={b.google_maps_embed} width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen="" loading="lazy" title={`Map of ${b.name}`} />
                      </div>
                      <div style={{ padding: '14px' }}>
                        <h3 style={{ fontWeight: 900, fontSize: '14px', margin: '0 0 2px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {b.name}
                          {b._enriched && <BrutalBadge bg="rgba(99,102,241,0.15)" fg="var(--accent)">ENR</BrutalBadge>}
                          {b.hr_email && <BrutalBadge bg="rgba(239,68,68,0.15)" fg="#ef4444">HR</BrutalBadge>}
                          {b._data_score !== undefined && (
                            <span style={{
                              display: 'inline-block', padding: '2px 6px', fontSize: '10px', fontWeight: 700,
                              border: '2px solid var(--border)',
                              background: b._data_score >= 70 ? 'rgba(34,197,94,0.2)' : b._data_score >= 40 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
                              color: b._data_score >= 70 ? '#22c55e' : b._data_score >= 40 ? '#eab308' : '#ef4444'
                            }}>{b._data_score}%</span>
                          )}
                          {b._has_employees && <BrutalBadge bg="rgba(99,102,241,0.15)" fg="var(--accent)">👥{b.employees?.length}</BrutalBadge>}
                        </h3>
                        <p style={{ ...S.muted, margin: '4px 0' }}>{b.type}{b.category ? ` · ${b.category}` : ''}</p>
                        {b.address && b.address !== 'Address not available' && <p style={{ ...S.muted, margin: '2px 0' }}>{b.address}</p>}
                        {b.phone && b.phone !== 'Phone not listed' && <p style={{ fontWeight: 700, fontSize: '12px', margin: '4px 0', color: 'var(--fg)' }}>{b.phone}</p>}
                        {b.email && b.email !== 'Email not available' && <p style={{ fontWeight: 700, fontSize: '12px', margin: '2px 0', color: 'var(--accent)' }}>{b.email}</p>}
                        {b.hr_email && <p style={{ fontWeight: 700, fontSize: '12px', margin: '2px 0', color: '#ef4444' }}>HR: {b.hr_email}</p>}
                        {b.website && b.website !== 'Website not available' && <p style={{ margin: '4px 0' }}><a href={b.website} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent)' }}>WEBSITE</a></p>}
                        {b.linkedin && <p style={{ margin: '2px 0' }}><a href={`https://${b.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '12px', color: '#0a66c2' }}>LINKEDIN</a></p>}
                        {b.github && <p style={{ margin: '2px 0' }}><a href={`https://${b.github}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#333' }}>GITHUB</a></p>}
                        {b.glassdoor && <p style={{ margin: '2px 0' }}><a href={`https://${b.glassdoor}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#0caa41' }}>GLASSDOOR</a></p>}
                        {b.crunchbase && <p style={{ margin: '2px 0' }}><a href={`https://${b.crunchbase}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#0288d1' }}>CRUNCHBASE</a></p>}
                        {b.yelp && <p style={{ margin: '2px 0' }}><a href={`https://${b.yelp}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#d32323' }}>YELP</a></p>}
                        {b.tripadvisor && <p style={{ margin: '2px 0' }}><a href={`https://${b.tripadvisor}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#00af87' }}>TRIPADVISOR</a></p>}
                        {b.reddit && <p style={{ margin: '2px 0' }}><a href={`https://${b.reddit}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#ff4500' }}>REDDIT</a></p>}
                        {b.medium && <p style={{ margin: '2px 0' }}><a href={`https://${b.medium}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#000' }}>MEDIUM</a></p>}
                        {b.opening_hours && b.opening_hours !== 'Hours not available' && <p style={{ ...S.muted, fontSize: '11px', margin: '4px 0' }}>{b.opening_hours}</p>}
                        {b.cuisine && <p style={{ ...S.muted, fontSize: '10px', margin: '2px 0' }}>Cuisine: {b.cuisine}</p>}
                        <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: 'var(--accent)', marginTop: '8px', display: 'inline-block' }}>VIEW LARGER MAP &rarr;</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TABLE VIEW */}
            {activeTab === 'table' && (
              <div style={{ overflowX: 'auto' }}>
                <p style={{ ...S.muted, marginBottom: '10px' }}>
                  {searchTerm ? `Showing ${filteredBusinesses.length} of ${businesses.length} (filtered by "${searchTerm}")` : `Showing all ${businesses.length} businesses`}
                  {searchTerm && <button onClick={() => setSearchTerm('')} style={{ marginLeft: '8px', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' }}>CLEAR</button>}
                </p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['#', 'Name', 'Type', 'Contact Info', 'Location', 'Details', 'Map'].map(h => (
                        <th key={h} style={TH_STYLE}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBusinesses.map((b, idx) => (
                      <tr key={b.id || idx}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ ...TD_STYLE, color: 'var(--muted)', fontWeight: 700, width: '30px' }}>{idx + 1}</td>
                        <td style={TD_STYLE}>
                          <div style={{ fontWeight: 900, fontSize: '14px', color: 'var(--fg)' }}>{b.name}</div>
                          {b.brand && <div style={{ ...S.muted, fontSize: '10px' }}>Brand: {b.brand}</div>}
                          {b.operator && <div style={{ ...S.muted, fontSize: '10px' }}>Op: {b.operator}</div>}
                        </td>
                        <td style={TD_STYLE}>
                          <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--fg)' }}>{b.type}</div>
                          <div style={{ ...S.muted, fontSize: '10px' }}>{b.category}{b.subcategory ? ` / ${b.subcategory}` : ''}</div>
                          {b.cuisine && <div style={{ ...S.muted, fontSize: '10px' }}>{b.cuisine}</div>}
                        </td>
                        <td style={TD_STYLE}>
                          {b.address && b.address !== 'Address not available' && <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--fg)' }}>{b.address}</div>}
                          {b.phone && b.phone !== 'Phone not listed' && <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--fg)', marginTop: '4px' }}>{b.phone}</div>}
                          {b.email && b.email !== 'Email not available' && <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent)', marginTop: '4px' }}>{b.email}</div>}
                          {b.hr_email && <div style={{ fontWeight: 700, fontSize: '11px', color: '#ef4444', marginTop: '4px', background: 'rgba(239,68,68,0.1)', padding: '2px 6px', border: '2px solid #ef4444', display: 'inline-block' }}>HR: {b.hr_email}</div>}
                          {b.website && b.website !== 'Website not available' && <div style={{ marginTop: '4px' }}><a href={b.website} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent)' }}>WEBSITE</a></div>}
                          {b.facebook && <div style={{ marginTop: '2px' }}><a href={`https://facebook.com/${b.facebook}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#1877f2' }}>FB</a></div>}
                          {b.instagram && <div style={{ marginTop: '2px' }}><a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#e4405f' }}>IG</a></div>}
                          {b.linkedin && <div style={{ marginTop: '2px' }}><a href={`https://${b.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#0a66c2' }}>LI</a></div>}
                          {b.youtube && <div style={{ marginTop: '2px' }}><a href={`https://${b.youtube}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#ff0000' }}>YT</a></div>}
                          {b.pinterest && <div style={{ marginTop: '2px' }}><a href={`https://${b.pinterest}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#e60023' }}>PIN</a></div>}
                          {b.snapchat && <div style={{ marginTop: '2px' }}><a href={`https://${b.snapchat}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#fffc00' }}>SC</a></div>}
                          {b.discord && <div style={{ marginTop: '2px' }}><a href={`https://${b.discord}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#5865f2' }}>DC</a></div>}
                          {b.telegram && <div style={{ marginTop: '2px' }}><a href={`https://${b.telegram}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#0088cc' }}>TG</a></div>}
                          {b.whatsapp && <div style={{ marginTop: '2px' }}><a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#25d366' }}>WA</a></div>}
                          {b.medium && <div style={{ marginTop: '2px' }}><a href={`https://${b.medium}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#000' }}>MED</a></div>}
                          {b.github && <div style={{ marginTop: '2px' }}><a href={`https://${b.github}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#333' }}>GH</a></div>}
                          {b.glassdoor && <div style={{ marginTop: '2px' }}><a href={`https://${b.glassdoor}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#0caa41' }}>GLASS</a></div>}
                          {b.crunchbase && <div style={{ marginTop: '2px' }}><a href={`https://${b.crunchbase}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#0288d1' }}>CB</a></div>}
                          {b.yelp && <div style={{ marginTop: '2px' }}><a href={`https://${b.yelp}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#d32323' }}>YELP</a></div>}
                          {b.tripadvisor && <div style={{ marginTop: '2px' }}><a href={`https://${b.tripadvisor}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#00af87' }}>TA</a></div>}
                          {b.reddit && <div style={{ marginTop: '2px' }}><a href={`https://${b.reddit}`} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: '#ff4500' }}>RED</a></div>}
                          {(b._enriched && b.email_patterns && b.email_patterns.length > 0) && (
                            <div style={{ marginTop: '6px', fontSize: '10px' }}>
                              <details>
                                <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--muted)' }}>EMAIL PATTERNS ({b.email_patterns.length})</summary>
                                <div style={{ marginTop: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                                  {b.email_patterns.map((ep, i) => (
                                    <div key={i} style={{ padding: '1px 0', fontWeight: HR_PREFIXES.some(p => ep.startsWith(p)) ? 700 : 400, color: HR_PREFIXES.some(p => ep.startsWith(p)) ? '#ef4444' : 'var(--fg)' }}>{ep}</div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          )}
                          {b._has_employees && b.employees?.length > 0 && (
                            <div style={{ marginTop: '6px', fontSize: '10px' }}>
                              <details>
                                <summary style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--accent)' }}>👥 {b.employees.length} PEOPLE</summary>
                                <div style={{ marginTop: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                                  {b.employees.slice(0, 15).map((emp, i) => (
                                    <div key={i} style={{ padding: '3px 0', borderBottom: i < Math.min(15, b.employees.length) - 1 ? '1px solid var(--border)' : 'none' }}>
                                      <div style={{ fontWeight: 700, color: 'var(--fg)' }}>{emp.name}</div>
                                      {emp.title && <div style={{ ...S.muted }}>{emp.title}</div>}
                                      {emp.email && <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{emp.email}</div>}
                                    </div>
                                  ))}
                                  {b.employees.length > 15 && <div style={{ textAlign: 'center', opacity: 0.6, padding: '4px', ...S.muted }}>...and {b.employees.length - 15} more</div>}
                                </div>
                              </details>
                            </div>
                          )}
                        </td>
                        <td style={TD_STYLE}>
                          <div style={{ ...S.muted, fontSize: '11px' }}>
                            <div style={{ fontWeight: 700 }}>Lat: {b.lat.toFixed(6)}</div>
                            <div style={{ fontWeight: 700 }}>Lon: {b.lon.toFixed(6)}</div>
                          </div>
                          {b.opening_hours && b.opening_hours !== 'Hours not available' && (
                            <div style={{ marginTop: '8px', fontSize: '10px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--fg)' }}>HOURS</div>
                              <div style={{ whiteSpace: 'pre-wrap', color: 'var(--muted)' }}>{b.opening_hours}</div>
                            </div>
                          )}
                        </td>
                        <td style={TD_STYLE}>
                          <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {b._data_score !== undefined && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{
                                  padding: '1px 6px', fontSize: '10px', fontWeight: 700, border: '2px solid var(--border)',
                                  background: b._data_score >= 70 ? 'rgba(34,197,94,0.2)' : b._data_score >= 40 ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)',
                                  color: b._data_score >= 70 ? '#22c55e' : b._data_score >= 40 ? '#eab308' : '#ef4444'
                                }}>{b._data_score}%</span>
                                <span style={{ ...S.muted, fontSize: '9px' }}>{b._data_missing?.length ? `${b._data_missing.length} missing` : 'COMPLETE'}</span>
                              </div>
                            )}
                            {b._has_employees && <span style={{ fontWeight: 700, fontSize: '10px', color: 'var(--accent)' }}>👥 {b.employees?.length} people</span>}
                            {b._size_hint && <span style={{ ...S.muted, fontSize: '9px' }} title={b._size_hint}>📊 {b._size_hint}</span>}
                            {b.wheelchair && <span>♿ {b.wheelchair}</span>}
                            {b.capacity && <span>Cap: {b.capacity}</span>}
                            {b.building && <span>Bld: {b.building}</span>}
                            {b.takeaway && <span>Take: {b.takeaway}</span>}
                            {b.delivery && <span>Del: {b.delivery}</span>}
                            {b.outdoor_seating && <span>Out: {b.outdoor_seating}</span>}
                            {b.smoking && <span>Smk: {b.smoking}</span>}
                            {b.wifi && <span>WiFi: {b.wifi}</span>}
                            {b.parking && <span>Pk: {b.parking}</span>}
                            {b.stars && <span>★ {b.stars}</span>}
                          </div>
                        </td>
                        <td style={TD_STYLE}>
                          <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, fontSize: '11px', color: 'var(--accent)', display: 'block', marginBottom: '6px' }}>MAP</a>
                          <div style={{ width: '120px', height: '70px', border: '2px solid var(--border)' }}>
                            <iframe src={b.google_maps_embed} width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen="" loading="lazy" title={`Map of ${b.name}`} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filteredBusinesses.length && (
                  <div style={{ textAlign: 'center', padding: '40px 0', ...S.muted }}>
                    No results match your filter &ldquo;{searchTerm}&rdquo;
                    <button onClick={() => setSearchTerm('')} style={{ marginLeft: '8px', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>CLEAR</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SUMMARY */}
        {businesses.length > 0 && (
          <div style={{ textAlign: 'center', padding: '12px', ...S.muted, border: '2px solid var(--border)', background: 'var(--surface)', boxShadow: '3px 3px 0px var(--border)' }}>
            Found <strong>{filteredBusinesses.length}</strong> of <strong>{businesses.length}</strong> businesses{place ? ` in ${place}` : ''}{searchTerm ? ` matching "${searchTerm}"` : ''}
          </div>
        )}

        {/* EMPTY STATE */}
        {!businesses.length && !loading && !error && (
          <div style={{ ...S.section, textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--surface2)', border: '3px solid var(--border)', boxShadow: '3px 3px 0px var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg style={{ width: '30px', height: '30px', color: 'var(--fg)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--fg)', margin: '0 0 6px', textTransform: 'uppercase' }}>Find Businesses</h2>
            <p style={{ ...S.muted, fontSize: '14px' }}>Enter a location and click FIND BUSINESSES to discover local services, shops, and more.</p>
          </div>
        )}

        {/* LOADING OVERLAY */}
        {loading && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ ...S.section, textAlign: 'center', padding: '32px 48px' }}>
              <svg className="animate-spin" style={{ width: '36px', height: '36px', color: 'var(--accent)', margin: '0 auto 12px', display: 'block' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p style={{ fontWeight: 900, fontSize: '16px', color: 'var(--fg)', margin: 0 }}>SEARCHING...</p>
              <p style={{ ...S.muted, margin: '4px 0 0' }}>This may take a moment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
