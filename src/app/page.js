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
  const [showPatterns, setShowPatterns] = useState({});
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
            m.hr_email = enr.hr_email || m.hr_email;
            m.hr_emails = enr.hr_emails || m.hr_emails;
            m.email_patterns = enr.email_patterns || m.email_patterns;
            m.email = enr.email && enr.email !== 'Email not available' ? enr.email : m.email;
            m.phone = enr.phone && enr.phone !== 'Phone not listed' ? enr.phone : m.phone;
            m.description = enr.description && enr.description !== 'No description available' ? enr.description : m.description;
            m.opening_hours = enr.opening_hours && enr.opening_hours !== 'Hours not available' ? enr.opening_hours : m.opening_hours;
            m.address = enr.address && enr.address !== 'Address not available' && !m.address ? enr.address : m.address;
            m.facebook = enr.facebook || m.facebook; m.instagram = enr.instagram || m.instagram;
            m.twitter = enr.twitter || m.twitter; m.linkedin = enr.linkedin || m.linkedin;
            m.youtube = enr.youtube || m.youtube; m.tiktok = enr.tiktok || m.tiktok;
            m.type = enr.type && enr.type !== 'Type not specified' ? enr.type : m.type;
            m.category = enr.category && enr.category !== 'Category not specified' ? enr.category : m.category;
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
        m.type = enr.type && enr.type !== 'Type not specified' ? enr.type : m.type;
        m.category = enr.category && enr.category !== 'Category not specified' ? enr.category : m.category;
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>A</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Advanced Business Finder</h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>Powered by OpenStreetMap</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 md:mt-0">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }}>v2.0</span>
            <button onClick={toggleTheme} className="p-2 rounded-lg transition-all hover:scale-110" style={{ background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)' }} title="Toggle theme">
              <ThemeIcon />
            </button>
          </div>
        </div>

        {/* Search Section */}
        <div className="rounded-xl shadow-lg mb-6 p-6" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <input ref={inputRef} type="text" value={place} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Enter a city, address, or location"
                className="p-3 rounded-lg w-full outline-none transition-all text-sm"
                style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }}
                autoComplete="off" />
              {enriching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4" style={{ color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              {suggestions.length > 0 && (
                <ul ref={suggestionsRef} className="absolute z-10 w-full mt-1 rounded-lg shadow-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  {suggestions.map((s, idx) => (
                    <li key={idx} className="px-4 py-2.5 cursor-pointer border-b text-sm transition-colors" style={{ borderColor: 'var(--border)' }}
                      onClick={() => handleSuggestionClick(s)}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div className="font-medium" style={{ color: 'var(--foreground)' }}>{s.display_name.split(',')[0]}</div>
                      <div className="text-xs" style={{ color: 'var(--muted)' }}>{s.display_name.split(',').slice(1).join(',')}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button onClick={() => searchBusinesses()} disabled={loading || !place.trim()}
              className="px-6 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : businesses.length > 0 ? 'Search Again' : 'Find Businesses'}
            </button>
          </div>

          {searchHistory.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Recent Searches:</label>
                <button onClick={clearHistory} className="text-xs hover:underline" style={{ color: '#ef4444' }}>Clear</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {searchHistory.map((h, idx) => (
                  <button key={idx} onClick={() => { setPlace(h); searchBusinesses(h); }}
                    className="px-2.5 py-1 text-xs rounded-lg transition-colors" style={{ background: 'var(--surface-alt)', color: 'var(--muted)' }}>
                    {h.length > 40 ? h.slice(0, 40) + '...' : h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Search Radius: <span className="font-bold" style={{ color: 'var(--primary)' }}>{searchRadius} km</span></label>
              <input type="range" min="1" max="20" value={searchRadius} onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer" style={{ accentColor: 'var(--primary)', background: 'var(--surface-alt)' }} />
              <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted)' }}><span>1 km</span><span>20 km</span></div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Business Categories:</label>
              <div className="flex flex-wrap gap-1.5">
                {businessCategories.map(cat => (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${selectedCategories.includes(cat) ? 'text-white' : ''}`}
                    style={selectedCategories.includes(cat) ? { background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white' } : { background: 'var(--surface-alt)', color: 'var(--muted)' }}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                {selectedCategories.length > 0 ? `Showing only: ${selectedCategories.join(', ')}` : 'Showing all business types'}
                {selectedCategories.length > 0 && <button onClick={() => setSelectedCategories([])} className="ml-2 hover:underline" style={{ color: 'var(--primary)' }}>Clear all</button>}
              </p>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-4" style={{ borderTop: '1px solid var(--border)' }}>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--muted)' }}>
              <input type="checkbox" checked={enrichEnabled} onChange={(e) => setEnrichEnabled(e.target.checked)}
                className="rounded" style={{ accentColor: 'var(--primary)' }} />
              Auto-enrich (find emails, phones, HR contacts from websites)
            </label>
            <span className={`text-xs px-2 py-0.5 rounded-full ${enrichEnabled ? 'text-green-500' : 'text-red-400'}`} style={{ background: 'var(--surface-alt)' }}>{enrichEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3 mb-6 flex items-start justify-between" style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#eab308' }}>
            <span className="text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-4 font-bold opacity-70 hover:opacity-100">&times;</button>
          </div>
        )}

        {/* Results */}
        {businesses.length > 0 && (
          <div className="rounded-xl shadow-lg overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ borderBottom: '1px solid var(--border)' }}>
              <nav className="flex flex-wrap -mb-px">
                <button onClick={() => setActiveTab('map')}
                  className={`py-3.5 px-6 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'map' ? '' : 'border-transparent'}`}
                  style={activeTab === 'map' ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                  Map View
                </button>
                <button onClick={() => setActiveTab('table')}
                  className={`py-3.5 px-6 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === 'table' ? '' : 'border-transparent'}`}
                  style={activeTab === 'table' ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : { color: 'var(--muted)' }}>
                  Table View ({filteredBusinesses.length} of {businesses.length})
                </button>
                <div className="ml-auto flex items-center gap-1.5 px-3 flex-wrap py-2">
                  {enriching && (
                    <span className="text-xs mr-1" style={{ color: 'var(--primary)' }}>
                      Enriching {enrichProgress.current}/{enrichProgress.total}...
                    </span>
                  )}
                  <button onClick={() => { enrichAbortRef.current = true; setEnriching(false); setEnrichProgress({ current: 0, total: 0 }); }}
                    disabled={!enriching}
                    className={`px-2 py-1.5 text-xs rounded-lg transition-colors ${enriching ? 'text-white' : 'opacity-30 cursor-not-allowed'}`}
                    style={enriching ? { background: '#d97706' } : { background: 'var(--surface-alt)' }}>
                    Stop
                  </button>
                  <button onClick={enrichCurrentResults} disabled={enriching || !businesses.length}
                    className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-all ${!enriching && businesses.length ? 'text-white' : 'opacity-30 cursor-not-allowed'}`}
                    style={!enriching && businesses.length ? { background: 'linear-gradient(135deg, var(--primary), var(--secondary))' } : { background: 'var(--surface-alt)' }}>
                    Enrich
                  </button>
                  <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filter..."
                    className="px-2.5 py-1.5 text-xs rounded-lg outline-none w-28"
                    style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }} />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                    className="px-2 py-1.5 text-xs rounded-lg outline-none"
                    style={{ background: 'var(--background)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="type">Type</option>
                    <option value="category">Category</option>
                  </select>
                  <button onClick={downloadCSV} className="flex items-center px-2.5 py-1.5 text-xs rounded-lg font-medium text-white"
                    style={{ background: '#059669' }} title="CSV">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    CSV
                  </button>
                  <button onClick={downloadJSON} className="flex items-center px-2.5 py-1.5 text-xs rounded-lg font-medium text-white"
                    style={{ background: '#7c3aed' }} title="JSON">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    JSON
                  </button>
                  <button onClick={clearResults}
                    className="flex items-center px-2 py-1.5 text-xs rounded-lg text-white" style={{ background: '#dc2626' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                  </button>
                </div>
              </nav>
            </div>

            <div className="p-4">
              {activeTab === 'map' && (
                <div className="space-y-6">
                  <div style={{ height: '500px', border: '1px solid var(--border)' }} className="rounded-lg overflow-hidden">
                    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                      <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {filteredBusinesses.map((b, idx) => (
                        <Marker key={b.id || idx} position={[b.lat, b.lon]}>
                          <Popup>
                            <div className="space-y-1 text-sm max-w-xs">
                              <h3 className="font-bold text-base">{b.name}</h3>
                              {b.type && b.type !== 'Type not specified' && <p><span className="font-medium">Type:</span> {b.type}</p>}
                              {b.category && b.category !== 'Category not specified' && <p><span className="font-medium">Category:</span> {b.category}</p>}
                              {b.phone && b.phone !== 'Phone not listed' && <p><span className="font-medium">Phone:</span> {b.phone}</p>}
                              {b.email && b.email !== 'Email not available' && <p><span className="font-medium">Email:</span> {b.email}</p>}
                              {b.hr_email && <p><span style={{ color: '#ef4444' }}><span className="font-medium">HR:</span> {b.hr_email}</span></p>}
                              {b.address && b.address !== 'Address not available' && <p><span className="font-medium">Address:</span> {b.address}</p>}
                              {b.website && b.website !== 'Website not available' && <p><span className="font-medium">Website:</span> <a href={b.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Open</a></p>}
                              {b.opening_hours && b.opening_hours !== 'Hours not available' && <p><span className="font-medium">Hours:</span> <span className="text-xs">{b.opening_hours}</span></p>}
                              {b.description && b.description !== 'No description available' && <p className="text-xs" style={{ color: 'var(--muted)' }}>{b.description}</p>}
                              <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-xs" style={{ color: 'var(--primary)' }}>View on Google Maps &rarr;</a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBusinesses.map((b, idx) => (
                      <div key={b.id || idx} className="rounded-xl overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02]" style={{ background: 'var(--background)', border: '1px solid var(--border)' }}>
                        <div className="h-36" style={{ background: 'var(--surface-alt)' }}>
                          <iframe src={b.google_maps_embed} width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" title={`Map of ${b.name}`}></iframe>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                            {b.name}
                            {b._enriched && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.2)', color: 'var(--primary-light)' }}>ENR</span>}
                            {b.hr_email && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>HR</span>}
                          </h3>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{b.type} {b.category && `\u2022 ${b.category}`}</p>
                          {b.address && b.address !== 'Address not available' && <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>{b.address}</p>}
                          {b.phone && b.phone !== 'Phone not listed' && <p className="text-xs mt-1" style={{ color: 'var(--foreground)' }}>{b.phone}</p>}
                          {b.email && b.email !== 'Email not available' && <p className="text-xs mt-1" style={{ color: 'var(--primary-light)' }}>{b.email}</p>}
                          {b.hr_email && <p className="text-xs mt-1"><span style={{ color: '#ef4444' }}>HR: {b.hr_email}</span></p>}
                          {b.website && b.website !== 'Website not available' && (
                            <p className="text-xs mt-1"><a href={b.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Website</a></p>
                          )}
                          {b.linkedin && <p className="text-xs mt-1"><a href={`https://${b.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0a66c2' }}>LinkedIn</a></p>}
                          {b.opening_hours && b.opening_hours !== 'Hours not available' && <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{b.opening_hours}</p>}
                          {b.cuisine && <p className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>Cuisine: {b.cuisine}</p>}
                          <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs inline-block mt-2" style={{ color: 'var(--primary)' }}>View Larger Map &rarr;</a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'table' && (
                <div className="overflow-x-auto">
                  <p className="mb-3 text-xs" style={{ color: 'var(--muted)' }}>
                    {searchTerm ? `Showing ${filteredBusinesses.length} of ${businesses.length} (filtered by "${searchTerm}")` : `Showing all ${businesses.length} businesses`}
                    {searchTerm && <button onClick={() => setSearchTerm('')} className="ml-2 hover:underline" style={{ color: 'var(--primary)' }}>Clear filter</button>}
                  </p>
                  <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        {['#', 'Name', 'Type', 'Contact Info', 'Location', 'Details', 'Map'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider" style={{ background: 'var(--surface-alt)', color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((b, idx) => (
                        <tr key={b.id || idx} className="transition-colors" style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>{b.name}</div>
                            {b.brand && <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Brand: {b.brand}</div>}
                            {b.operator && <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Op: {b.operator}</div>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs" style={{ color: 'var(--foreground)' }}><span className="font-medium">Type:</span> {b.type}</div>
                            <div className="text-xs" style={{ color: 'var(--muted)' }}><span className="font-medium">Cat:</span> {b.category}</div>
                            {b.subcategory && <div className="text-xs" style={{ color: 'var(--muted)' }}><span className="font-medium">Sub:</span> {b.subcategory}</div>}
                            {b.cuisine && <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{b.cuisine}</div>}
                          </td>
                          <td className="px-4 py-3">
                            {b.address && b.address !== 'Address not available' && <div className="text-xs" style={{ color: 'var(--foreground)' }}>{b.address}</div>}
                            {b.phone && b.phone !== 'Phone not listed' && <div className="text-xs mt-1" style={{ color: 'var(--foreground)' }}>{b.phone}</div>}
                            {b.email && b.email !== 'Email not available' && <div className="text-xs mt-1"><span className="font-medium">Email:</span> <span style={{ color: 'var(--primary-light)' }}>{b.email}</span></div>}
                            {b.hr_email && <div className="text-xs mt-1 px-1 rounded" style={{ background: 'rgba(239,68,68,0.15)' }}><span style={{ color: '#ef4444' }}>HR: {b.hr_email}</span></div>}
                            {b.website && b.website !== 'Website not available' && (
                              <div className="mt-1"><a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'var(--primary)' }}>Website</a></div>
                            )}
                            {b.facebook && <div className="mt-1"><a href={`https://facebook.com/${b.facebook}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#1877f2' }}>Facebook</a></div>}
                            {b.instagram && <div className="mt-1"><a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#e4405f' }}>Instagram</a></div>}
                            {b.linkedin && <div className="mt-1"><a href={`https://${b.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#0a66c2' }}>LinkedIn</a></div>}
                            {b.youtube && <div className="mt-1"><a href={`https://${b.youtube}`} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: '#ff0000' }}>YouTube</a></div>}
                            {(b._enriched && b.email_patterns && b.email_patterns.length > 0) && (
                              <div className="mt-1 text-[10px]" style={{ color: 'var(--muted)' }}>
                                <details>
                                  <summary className="cursor-pointer hover:opacity-80">Email patterns ({b.email_patterns.length})</summary>
                                  <div className="mt-0.5 space-y-0.5 max-h-32 overflow-y-auto">
                                    {b.email_patterns.map((ep, i) => (
                                      <div key={i} className={HR_PREFIXES.some(p => ep.startsWith(p)) ? '' : ''} style={HR_PREFIXES.some(p => ep.startsWith(p)) ? { color: '#ef4444' } : {}}>{ep}</div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-xs" style={{ color: 'var(--muted)' }}>
                              <div>Lat: {b.lat.toFixed(6)}</div>
                              <div>Lon: {b.lon.toFixed(6)}</div>
                            </div>
                            {b.opening_hours && b.opening_hours !== 'Hours not available' && (
                              <div className="mt-1.5 text-[10px]" style={{ color: 'var(--muted)' }}>
                                <div className="font-medium">Hours:</div>
                                <div className="whitespace-pre-wrap">{b.opening_hours}</div>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-xs space-y-0.5" style={{ color: 'var(--muted)' }}>
                              {b.wheelchair && <div>♿ {b.wheelchair}</div>}
                              {b.capacity && <div>Cap: {b.capacity}</div>}
                              {b.building && <div>Bld: {b.building}</div>}
                              {b.takeaway && <div>Take: {b.takeaway}</div>}
                              {b.delivery && <div>Del: {b.delivery}</div>}
                              {b.outdoor_seating && <div>Out: {b.outdoor_seating}</div>}
                              {b.smoking && <div>Smk: {b.smoking}</div>}
                              {b.wifi && <div>WiFi: {b.wifi}</div>}
                              {b.parking && <div>Pk: {b.parking}</div>}
                              {b.stars && <div>★ {b.stars}</div>}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs block mb-1" style={{ color: 'var(--primary)' }}>View Map</a>
                            <div className="h-20 w-32 rounded overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                              <iframe src={b.google_maps_embed} width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy" title={`Map of ${b.name}`}></iframe>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredBusinesses.length && (
                    <div className="text-center py-10 text-sm" style={{ color: 'var(--muted)' }}>
                      No results match your filter &quot;{searchTerm}&quot;
                      <button onClick={() => setSearchTerm('')} className="ml-2 hover:underline" style={{ color: 'var(--primary)' }}>Clear filter</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        {businesses.length > 0 && (
          <div className="mt-4 text-center text-xs" style={{ color: 'var(--muted)' }}>
            Found {filteredBusinesses.length} of {businesses.length} businesses in {place || 'current area'}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}

        {/* Empty */}
        {!businesses.length && !loading && !error && (
          <div className="rounded-xl p-12 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(6,182,212,0.2))' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" style={{ color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium" style={{ color: 'var(--foreground)' }}>Search for businesses</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Enter a location above and click Find Businesses to discover local services, shops, and more.</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="rounded-xl p-8 shadow-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <svg className="animate-spin h-10 w-10 mx-auto mb-4" style={{ color: 'var(--primary)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="font-medium" style={{ color: 'var(--foreground)' }}>Searching for businesses...</p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>This may take a moment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
