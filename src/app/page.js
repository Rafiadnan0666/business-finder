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

const businessCategories = [
  'shop', 'restaurant', 'cafe', 'bar', 'hotel', 'pharmacy',
  'bank', 'clinic', 'hospital', 'dentist', 'car_rental',
  'supermarket', 'mall', 'office', 'school', 'university'
];

const STORAGE_KEY = 'appkind_search_history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 10)));
  } catch { /* ignore */ }
}

function getOverpassCategoryQuery(category, radius, lat, lon) {
  const r = radius * 1000;
  const map = {
    shop:            `node["shop"](around:${r},${lat},${lon});`,
    restaurant:      `node["amenity"="restaurant"](around:${r},${lat},${lon});`,
    cafe:            `node["amenity"="cafe"](around:${r},${lat},${lon});`,
    bar:             `node["amenity"="bar"](around:${r},${lat},${lon});`,
    hotel:           `node["amenity"="hotel"](around:${r},${lat},${lon});`,
    pharmacy:        `node["amenity"="pharmacy"](around:${r},${lat},${lon});`,
    bank:            `node["amenity"="bank"](around:${r},${lat},${lon});`,
    clinic:          `node["amenity"="clinic"](around:${r},${lat},${lon});`,
    hospital:        `node["amenity"="hospital"](around:${r},${lat},${lon});`,
    dentist:         `node["amenity"="dentist"](around:${r},${lat},${lon});`,
    car_rental:      `node["amenity"="car_rental"](around:${r},${lat},${lon});`,
    supermarket:     `node["shop"="supermarket"](around:${r},${lat},${lon});`,
    mall:            `node["building"="mall"](around:${r},${lat},${lon});node["shop"="mall"](around:${r},${lat},${lon});`,
    office:          `node["office"](around:${r},${lat},${lon});`,
    school:          `node["amenity"="school"](around:${r},${lat},${lon});`,
    university:      `node["amenity"="university"](around:${r},${lat},${lon});`,
  };
  return map[category] || '';
}

function getAllCategoryQuery(radius, lat, lon) {
  const r = radius * 1000;
  return `
    node["shop"](around:${r},${lat},${lon});
    node["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|pharmacy|bank|clinic|hospital|dentist|doctors|veterinary|atm|marketplace|car_rental|car_repair|car_wash|fuel|parking|hotel|motel|guest_house|hostel|hairdresser|beauty_salon|laundry|dry_cleaning|school|university|college"](around:${r},${lat},${lon});
    node["office"](around:${r},${lat},${lon});
    node["craft"](around:${r},${lat},${lon});
    node["building"="mall"](around:${r},${lat},${lon});
    node["shop"="mall"](around:${r},${lat},${lon});
    node["shop"="supermarket"](around:${r},${lat},${lon});
  `;
}

function processOverpassResults(elements) {
  return elements
    .filter(e => e.tags?.name)
    .map(e => {
      const tags = e.tags || {};
      return {
        id: e.id,
        name: tags.name,
        type: tags.shop || tags.amenity || tags.office || tags.leisure || tags.tourism || tags.craft || tags.building || '',
        category: tags.shop || tags.amenity || tags.office || tags.craft || tags.building || '',
        subcategory: tags.cuisine || tags.shop || tags.office || tags.amenity || tags.craft || '',
        lat: e.lat,
        lon: e.lon,
        phone: cleanPhone(tags.phone || tags['contact:phone']),
        address: [
          tags['addr:street'],
          tags['addr:housenumber'],
          tags['addr:city'],
          tags['addr:postcode'],
          tags['addr:country']
        ].filter(Boolean).join(', '),
        website: tags.website || tags['contact:website'] || '',
        email: tags.email || tags['contact:email'] || '',
        opening_hours: tags.opening_hours || '',
        description: getDescription(tags),
        google_maps_url: `https://www.google.com/maps?q=${e.lat},${e.lon}`,
        google_maps_embed: `https://maps.google.com/maps?q=${e.lat},${e.lon}&z=15&output=embed`,
        brand: tags.brand || '',
        operator: tags.operator || '',
        facebook: tags['contact:facebook'] || '',
        instagram: tags['contact:instagram'] || '',
        twitter: tags['contact:twitter'] || '',
        linkedin: tags['contact:linkedin'] || tags.linkedin || '',
        youtube: tags['contact:youtube'] || tags.youtube || '',
        tiktok: tags['contact:tiktok'] || tags.tiktok || '',
        wheelchair: tags.wheelchair || '',
        capacity: tags.capacity || '',
        building: tags.building || '',
        cuisine: tags.cuisine || '',
        diet_vegetarian: tags['diet:vegetarian'] || '',
        diet_vegan: tags['diet:vegan'] || '',
        organic: tags.organic || '',
        takeaway: tags.takeaway || '',
        delivery: tags.delivery || '',
        outdoor_seating: tags['outdoor_seating'] || '',
        smoking: tags.smoking || '',
        internet_access: tags['internet_access'] || '',
        wifi: tags.wifi || '',
        payment: tags.payment || '',
        drive_through: tags['drive_through'] || '',
        parking: tags.parking || '',
        stars: tags.stars || '',
        all_tags: JSON.stringify(tags)
      };
    });
}

function getDescription(tags) {
  const desc = [];
  if (tags.cuisine) desc.push(`Cuisine: ${tags.cuisine}`);
  if (tags.brand) desc.push(`Brand: ${tags.brand}`);
  if (tags['contact:facebook']) desc.push(`Facebook: ${tags['contact:facebook']}`);
  if (tags['contact:instagram']) desc.push(`Instagram: ${tags['contact:instagram']}`);
  if (tags['contact:twitter']) desc.push(`Twitter: ${tags['contact:twitter']}`);
  if (tags.wheelchair) desc.push(`Wheelchair: ${tags.wheelchair}`);
  if (tags.capacity) desc.push(`Capacity: ${tags.capacity}`);
  if (tags.stars) desc.push(`Stars: ${tags.stars}`);
  return desc.join(' | ');
}

function cleanPhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d+]/g, '');
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
  const enrichAbortRef = useRef(false);
  const inputRef = useRef();
  const suggestionsRef = useRef();

  useEffect(() => {
    setSearchHistory(loadHistory());
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) && inputRef.current && !inputRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setPlace(value);
    setError('');
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: value, format: 'json', addressdetails: 1, limit: 5 }
      });
      setSuggestions(res.data);
    } catch {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setPlace(suggestion.display_name);
    setSuggestions([]);
    inputRef.current.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && place.trim()) {
      searchBusinesses();
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const searchBusinesses = async (historyPlace) => {
    const searchQuery = historyPlace || place;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSuggestions([]);
    setError('');
    setSearchTerm('');
    try {
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: searchQuery, format: 'json', limit: 1 }
      });
      if (!geo.data.length) throw new Error("Place not found. Try a different location name.");
      const { lat, lon } = geo.data[0];
      setCenter([parseFloat(lat), parseFloat(lon)]);
      let queryParts = [];
      if (selectedCategories.length === 0) {
        queryParts = [getAllCategoryQuery(searchRadius, lat, lon)];
      } else {
        selectedCategories.forEach(cat => {
          const q = getOverpassCategoryQuery(cat, searchRadius, lat, lon);
          if (q) queryParts.push(q);
        });
      }
      const query = `
        [out:json][timeout:60];
        (${queryParts.join('\n')});
        out body;
        >;
        out skel qt;
      `;
      const overpass = await axios.post(`https://overpass-api.de/api/interpreter`, query, {
        headers: { 'Content-Type': 'text/plain' },
        timeout: 70000
      });
      const results = processOverpassResults(overpass.data.elements);
      setBusinesses(results);
      if (results.length === 0) {
        setError('No businesses found in this area. Try increasing the radius or changing categories.');
      }
      if (results.length > 0 && enrichEnabled) {
        try {
          setEnriching(true);
          setEnrichProgress({ current: 0, total: results.length });
          const enrichRes = await axios.post('/api/enrich', {
            businesses: results.filter(b => b.name && b.name !== 'N/A')
          }, { timeout: 120000 });
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
            m.facebook = enr.facebook || m.facebook;
            m.instagram = enr.instagram || m.instagram;
            m.twitter = enr.twitter || m.twitter;
            m.linkedin = enr.linkedin || m.linkedin;
            m.youtube = enr.youtube || m.youtube;
            m.tiktok = enr.tiktok || m.tiktok;
            m.type = enr.type && enr.type !== 'Type not specified' ? enr.type : m.type;
            m.category = enr.category && enr.category !== 'Category not specified' ? enr.category : m.category;
            m._enriched = true;
            return m;
          });
          setBusinesses(merged);
        } catch (err) {
          console.error('Auto-enrichment error:', err);
        }
        setEnriching(false);
        setEnrichProgress({ current: 0, total: 0 });
      }
      const updatedHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
      setSearchHistory(updatedHistory);
      saveHistory(updatedHistory);
    } catch (error) {
      console.error("Search error:", error);
      if (error.code === 'ECONNABORTED') {
        setError("Request timed out. The area may be too large. Try a smaller radius.");
      } else if (error.response?.status === 504) {
        setError("The Overpass API timed out. Try a smaller radius or fewer categories.");
      } else {
        setError(error.message || "Search failed. Please try again.");
      }
    }
    setLoading(false);
  };

  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.name.toLowerCase().includes(term) ||
        b.type.toLowerCase().includes(term) ||
        b.category.toLowerCase().includes(term) ||
        b.address.toLowerCase().includes(term) ||
        b.phone.includes(term) ||
        b.email.toLowerCase().includes(term) ||
        (b.hr_email || '').toLowerCase().includes(term) ||
        b.description.toLowerCase().includes(term) ||
        b.cuisine.toLowerCase().includes(term) ||
        b.brand.toLowerCase().includes(term) ||
        b.operator.toLowerCase().includes(term) ||
        b.linkedin.toLowerCase().includes(term) ||
        b.youtube.toLowerCase().includes(term) ||
        b.facebook.toLowerCase().includes(term) ||
        b.instagram.toLowerCase().includes(term) ||
        b.twitter.toLowerCase().includes(term)
      );
    }
    switch (sortBy) {
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'type': result.sort((a, b) => a.type.localeCompare(b.type)); break;
      case 'category': result.sort((a, b) => a.category.localeCompare(b.category)); break;
    }
    return result;
  }, [businesses, searchTerm, sortBy]);

  const downloadCSV = () => {
    if (filteredBusinesses.length === 0) return;
    const csvData = filteredBusinesses.map(b => ({
      Name: b.name,
      Type: b.type,
      Category: b.category,
      Subcategory: b.subcategory,
      Latitude: b.lat,
      Longitude: b.lon,
      Phone: b.phone,
      Address: b.address,
      Website: b.website,
      Email: b.email,
      'HR Email': b.hr_email || '',
      'Opening Hours': b.opening_hours,
      Description: b.description,
      'Google Maps Link': b.google_maps_url,
      Brand: b.brand,
      Operator: b.operator,
      Facebook: b.facebook,
      Instagram: b.instagram,
      Twitter: b.twitter,
      LinkedIn: b.linkedin || '',
      YouTube: b.youtube || '',
      TikTok: b.tiktok || '',
      Wheelchair: b.wheelchair,
      Capacity: b.capacity,
      Building: b.building,
      Cuisine: b.cuisine,
      'Vegetarian Options': b.diet_vegetarian,
      'Vegan Options': b.diet_vegan,
      Organic: b.organic,
      Takeaway: b.takeaway,
      Delivery: b.delivery,
      'Outdoor Seating': b.outdoor_seating,
      Smoking: b.smoking,
      'Internet Access': b.internet_access,
      WiFi: b.wifi,
      Payment: b.payment,
      'Drive Through': b.drive_through,
      Parking: b.parking,
      'All Tags': b.all_tags,
      'Email Patterns': b.email_patterns ? b.email_patterns.join('; ') : '',
      'HR Emails': b.hr_emails ? b.hr_emails.join('; ') : '',
      Enriched: b._enriched ? 'Yes' : 'No'
    }));
    const csv = Papa.unparse(csvData);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `businesses_${place.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  const downloadJSON = () => {
    if (filteredBusinesses.length === 0) return;
    const blob = new Blob([JSON.stringify(filteredBusinesses, null, 2)], { type: 'application/json' });
    saveAs(blob, `businesses_${place.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`);
  };

  const clearHistory = () => {
    setSearchHistory([]);
    saveHistory([]);
  };

  const clearResults = () => {
    setBusinesses([]);
    setError('');
    setSearchTerm('');
  };

  const enrichCurrentResults = useCallback(async () => {
    if (businesses.length === 0) return;
    setEnriching(true);
    setEnrichProgress({ current: 0, total: businesses.length });
    enrichAbortRef.current = false;
    try {
      const response = await axios.post('/api/enrich', {
        businesses: businesses.filter(b => b.name && b.name !== 'N/A')
      }, { timeout: 120000 });
      if (enrichAbortRef.current) return;
      const enriched = response.data.businesses || [];
      const merged = businesses.map((orig, idx) => {
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
        m.facebook = enr.facebook || m.facebook;
        m.instagram = enr.instagram || m.instagram;
        m.twitter = enr.twitter || m.twitter;
        m.linkedin = enr.linkedin || m.linkedin;
        m.youtube = enr.youtube || m.youtube;
        m.tiktok = enr.tiktok || m.tiktok;
        m.type = enr.type && enr.type !== 'Type not specified' ? enr.type : m.type;
        m.category = enr.category && enr.category !== 'Category not specified' ? enr.category : m.category;
        m._enriched = true;
        return m;
      });
      setBusinesses(merged);
    } catch (err) {
      if (!enrichAbortRef.current) {
        console.error('Enrichment error:', err);
      }
    }
    setEnriching(false);
    setEnrichProgress({ current: 0, total: 0 });
  }, [businesses]);

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Advanced Business Finder</h1>
          <p className="text-sm text-gray-500 mt-1 md:mt-0">Powered by OpenStreetMap</p>
        </div>

        {/* Search Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={place}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter a city, address, or location"
                  className="p-3 border border-gray-300 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                {enriching && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              {suggestions.length > 0 && (
                <ul ref={suggestionsRef} className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((s, idx) => (
                    <li
                      key={idx}
                      className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSuggestionClick(s)}
                    >
                      <div className="font-medium">{s.display_name.split(',')[0]}</div>
                      <div className="text-sm text-gray-500">{s.display_name.split(',').slice(1).join(',')}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={() => searchBusinesses()}
              disabled={loading || !place.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : businesses.length > 0 ? 'Search Again' : 'Find Businesses'}
            </button>
          </div>

          {/* Search History */}
          {searchHistory.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">Recent Searches:</label>
                <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700">Clear</button>
              </div>
              <div className="flex flex-wrap gap-1">
                {searchHistory.map((h, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setPlace(h); searchBusinesses(h); }}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    {h.length > 40 ? h.slice(0, 40) + '...' : h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Radius: <span className="font-bold">{searchRadius} km</span>
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 km</span>
              <span>20 km</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Categories:</label>
            <div className="flex flex-wrap gap-2">
              {businessCategories.map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedCategories.includes(category)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2 text-gray-500">
              {selectedCategories.length > 0
                ? `Showing only: ${selectedCategories.join(', ')}`
                : 'Showing all business types'}
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear all
                </button>
              )}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={enrichEnabled}
                onChange={(e) => setEnrichEnabled(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Auto-enrich results (find emails, phones, HR contacts from websites)
            </label>
            <span className="text-xs text-gray-400">
              {enrichEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6 flex items-start justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-yellow-600 hover:text-yellow-800 ml-4">&times;</button>
          </div>
        )}

        {/* Results Section */}
        {businesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex flex-wrap -mb-px">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'map'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'table'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Table View ({filteredBusinesses.length} of {businesses.length} businesses)
                </button>
                <div className="ml-auto flex items-center gap-2 pr-4 flex-wrap py-2">
                  {enriching && (
                    <span className="text-xs text-blue-600 mr-1">
                      Enriching {enrichProgress.current}/{enrichProgress.total}...
                    </span>
                  )}
                  <button
                    onClick={() => { enrichAbortRef.current = true; setEnriching(false); setEnrichProgress({ current: 0, total: 0 }); }}
                    disabled={!enriching}
                    className={`flex items-center px-2 py-1 text-xs rounded transition-colors ${enriching ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    title="Cancel enrichment"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Stop
                  </button>
                  <button
                    onClick={enrichCurrentResults}
                    disabled={enriching || businesses.length === 0}
                    className={`flex items-center px-2 py-1 text-xs rounded transition-colors ${!enriching && businesses.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                    title="Enrich all results with contact info, emails, and HR data"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    Enrich
                  </button>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter results..."
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40"
                  />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="type">Type</option>
                    <option value="category">Category</option>
                  </select>
                  <button
                    onClick={downloadCSV}
                    className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                    title="Export as CSV"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={downloadJSON}
                    className="flex items-center px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm"
                    title="Export as JSON"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    JSON
                  </button>
                  <button
                    onClick={clearResults}
                    className="flex items-center px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
                    title="Clear results"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </nav>
            </div>

            <div className="p-4">
              {activeTab === 'map' && (
                <div className="space-y-6">
                  <div style={{ height: '500px' }} className="rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                      <TileLayer
                        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {filteredBusinesses.map((b, idx) => (
                        <Marker key={b.id || idx} position={[b.lat, b.lon]}>
                          <Popup>
                            <div className="space-y-1 text-sm max-w-xs">
                              <h3 className="font-bold text-base">{b.name}</h3>
                              {b.type && b.type !== 'N/A' && <p><span className="font-medium">Type:</span> {b.type}</p>}
                              {b.category && b.category !== 'N/A' && <p><span className="font-medium">Category:</span> {b.category}</p>}
                              {b.phone && b.phone !== 'N/A' && <p><span className="font-medium">Phone:</span> {b.phone}</p>}
                              {b.email && b.email !== 'N/A' && <p><span className="font-medium">Email:</span> {b.email}</p>}
                              {b.hr_email && <p><span className="font-medium text-red-500">HR:</span> <span className="text-red-500">{b.hr_email}</span></p>}
                              {b.address && b.address !== 'N/A' && <p><span className="font-medium">Address:</span> {b.address}</p>}
                              {b.website && b.website !== 'N/A' && <p><span className="font-medium">Website:</span> <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open</a></p>}
                              {b.opening_hours && b.opening_hours !== 'N/A' && <p><span className="font-medium">Hours:</span> {b.opening_hours}</p>}
                              {b.description && b.description !== 'N/A' && <p className="text-gray-600 text-xs">{b.description}</p>}
                              <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-block mt-1 text-xs">
                                View on Google Maps &rarr;
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>

                  {searchTerm && (
                    <div className="text-sm text-gray-500">
                      Filtered to {filteredBusinesses.length} of {businesses.length} results
                      <button onClick={() => setSearchTerm('')} className="ml-2 text-blue-600 hover:underline">Clear filter</button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBusinesses.map((b, idx) => (
                      <div key={b.id || idx} className="border rounded-lg overflow-auto shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-40 bg-gray-100">
                          <iframe
                            src={b.google_maps_embed}
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen=""
                            loading="lazy"
                            title={`Map of ${b.name}`}
                          ></iframe>
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900">
                            {b.name}
                            {b._enriched && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Enriched</span>}
                            {b.hr_email && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">HR</span>}
                          </h3>
                          <p className="text-sm text-gray-600">{b.type} {b.category && `\u2022 ${b.category}`}</p>
                          {b.address && <p className="text-sm mt-1 text-gray-500">{b.address}</p>}
                          {b.phone && b.phone !== 'N/A' && <p className="text-sm mt-1">{b.phone}</p>}
                          {b.email && b.email !== 'N/A' && <p className="text-sm mt-1 text-blue-600">{b.email}</p>}
                          {b.hr_email && <p className="text-sm mt-1"><span className="text-xs font-semibold text-red-500">HR:</span> <span className="text-red-600">{b.hr_email}</span></p>}
                          {b.website && b.website !== 'N/A' && b.website !== 'Website not available' && (
                            <p className="text-sm mt-1">
                              <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Website</a>
                            </p>
                          )}
                          {b.linkedin && <p className="text-xs mt-1"><a href={`https://${b.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">LinkedIn</a></p>}
                          {b.youtube && <p className="text-xs mt-1"><a href={`https://${b.youtube}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">YouTube</a></p>}
                          {b.opening_hours && b.opening_hours !== 'N/A' && b.opening_hours !== 'Hours not available' && <p className="text-sm mt-1 text-gray-500">{b.opening_hours}</p>}
                          {b.cuisine && <p className="text-xs mt-1 text-gray-500">Cuisine: {b.cuisine}</p>}
                          <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline inline-block mt-2">
                            View Larger Map &rarr;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'table' && (
                <div className="overflow-x-auto">
                  <div className="mb-4 text-sm text-gray-500">
                    {searchTerm
                      ? `Showing ${filteredBusinesses.length} of ${businesses.length} businesses (filtered by "${searchTerm}")`
                      : `Showing all ${businesses.length} businesses`}
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="ml-2 text-blue-600 hover:underline">Clear filter</button>
                    )}
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Category</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Map</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredBusinesses.map((b, idx) => (
                        <tr key={b.id || idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{b.name}</div>
                            {b.brand && <div className="text-xs text-gray-500">Brand: {b.brand}</div>}
                            {b.operator && <div className="text-xs text-gray-500">Operator: {b.operator}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900"><span className="font-medium">Type:</span> {b.type}</div>
                            <div className="text-sm text-gray-500"><span className="font-medium">Category:</span> {b.category}</div>
                            {b.subcategory && <div className="text-sm text-gray-500"><span className="font-medium">Sub:</span> {b.subcategory}</div>}
                            {b.cuisine && <div className="text-xs text-gray-500 mt-1">Cuisine: {b.cuisine}</div>}
                          </td>
                          <td className="px-6 py-4">
                            {b.address && b.address !== 'N/A' && <div className="text-sm text-gray-900">{b.address}</div>}
                            {b.phone && b.phone !== 'N/A' && <div className="text-sm mt-1">{b.phone}</div>}
                            {b.email && b.email !== 'N/A' && <div className="text-sm mt-1"><span className="font-medium">Email:</span> {b.email}</div>}
                            {b.hr_email && <div className="text-sm mt-1 bg-red-50 px-1 rounded"><span className="font-medium text-red-600">HR:</span> <span className="text-red-500">{b.hr_email}</span></div>}
                            {b.website && b.website !== 'N/A' && b.website !== 'Website not available' && (
                              <div className="mt-1">
                                <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Website</a>
                              </div>
                            )}
                            {b.facebook && (
                              <div className="mt-1">
                                <a href={`https://facebook.com/${b.facebook}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Facebook</a>
                              </div>
                            )}
                            {b.instagram && (
                              <div className="mt-1">
                                <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">Instagram</a>
                              </div>
                            )}
                            {b.linkedin && (
                              <div className="mt-1">
                                <a href={`https://${b.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">LinkedIn</a>
                              </div>
                            )}
                            {b.youtube && (
                              <div className="mt-1">
                                <a href={`https://${b.youtube}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline text-sm">YouTube</a>
                              </div>
                            )}
                            {b._enriched && b.email_patterns && b.email_patterns.length > 0 && (
                              <div className="mt-1 text-xs text-gray-400">
                                <details>
                                  <summary className="cursor-pointer hover:text-gray-600">All email patterns ({b.email_patterns.length})</summary>
                                  <div className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                                    {b.email_patterns.map((ep, i) => (
                                      <div key={i} className={`${HR_PREFIXES.some(p => ep.startsWith(p)) ? 'text-red-400 font-medium' : ''}`}>{ep}</div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                            {b._enriched && b.hr_emails && b.hr_emails.length > 0 && !b.email_patterns && (
                              <div className="mt-1 text-xs text-gray-400">
                                <details>
                                  <summary className="cursor-pointer hover:text-gray-600">HR emails ({b.hr_emails.length})</summary>
                                  <div className="mt-1 space-y-0.5">
                                    {b.hr_emails.map((ep, i) => (
                                      <div key={i} className="text-red-400">{ep}</div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              <div>Lat: {b.lat.toFixed(6)}</div>
                              <div>Lon: {b.lon.toFixed(6)}</div>
                            </div>
                            {b.opening_hours && (
                              <div className="mt-2 text-xs text-gray-500">
                                <div className="font-medium">Hours:</div>
                                {b.opening_hours}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 space-y-1">
                              {b.wheelchair && <div>Wheelchair: {b.wheelchair}</div>}
                              {b.capacity && <div>Capacity: {b.capacity}</div>}
                              {b.building && <div>Building: {b.building}</div>}
                              {b.takeaway && <div>Takeaway: {b.takeaway}</div>}
                              {b.delivery && <div>Delivery: {b.delivery}</div>}
                              {b.outdoor_seating && <div>Outdoor: {b.outdoor_seating}</div>}
                              {b.smoking && <div>Smoking: {b.smoking}</div>}
                              {b.wifi && <div>WiFi: {b.wifi}</div>}
                              {b.parking && <div>Parking: {b.parking}</div>}
                              {b.stars && <div>Stars: {b.stars}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 block mb-1">
                              View Map
                            </a>
                            <div className="h-24 w-40">
                              <iframe
                                src={b.google_maps_embed}
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen=""
                                loading="lazy"
                                title={`Map of ${b.name}`}
                              ></iframe>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredBusinesses.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No results match your filter &quot;{searchTerm}&quot;
                      <button onClick={() => setSearchTerm('')} className="ml-2 text-blue-600 hover:underline">Clear filter</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {businesses.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Found {filteredBusinesses.length} of {businesses.length} businesses in {place || 'current area'}
            {searchTerm && ` matching "${searchTerm}"`}
          </div>
        )}

        {/* Empty State */}
        {businesses.length === 0 && !loading && !error && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-medium text-gray-600">Search for businesses</h2>
            <p className="mt-2 text-gray-400">Enter a location above and click Find Businesses to discover local services, shops, and more.</p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-xl text-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-700 font-medium">Searching for businesses...</p>
              <p className="text-gray-400 text-sm mt-1">This may take a moment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
