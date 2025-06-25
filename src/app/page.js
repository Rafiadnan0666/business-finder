"use client"
import { useState, useRef } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

// Leaflet imports with dynamic loading
import dynamic from 'next/dynamic';
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

export default function Home() {
  const [place, setPlace] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState([0, 0]);
  const [activeTab, setActiveTab] = useState('map');
  const [searchRadius, setSearchRadius] = useState(5); // in km
  const [selectedCategories, setSelectedCategories] = useState([]);
  const inputRef = useRef();

  const businessCategories = [
    'shop', 'restaurant', 'cafe', 'bar', 'hotel', 'pharmacy',
    'bank', 'clinic', 'hospital', 'dentist', 'car_rental',
    'supermarket', 'mall', 'office', 'school', 'university'
  ];

  const handleInputChange = async (e) => {
    const value = e.target.value;
    setPlace(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: value,
          format: 'json',
          addressdetails: 1,
          limit: 5
        },
        headers: { 'User-Agent': 'Business-Finder-App/1.0' }
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

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const searchBusinesses = async () => {
    setLoading(true);
    setSuggestions([]);
    try {
      // Step 1: Geocode the place
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: place,
          format: 'json',
          limit: 1
        },
        headers: { 'User-Agent': 'Business-Finder-App/1.0' }
      });

      if (!geo.data.length) throw new Error("Place not found");

      const { lat, lon } = geo.data[0];
      setCenter([parseFloat(lat), parseFloat(lon)]);

      // Step 2: Build Overpass API query based on selected categories
      let queryParts = [];
      
      // If no categories selected, search all business types
      if (selectedCategories.length === 0) {
        queryParts = [
          'node["shop"](around:{radius},{lat},{lon});',
          'node["amenity"~"restaurant|cafe|bar|pub|fast_food|food_court|pharmacy|bank|clinic|hospital|dentist|doctors|veterinary|atm|marketplace|car_rental|car_repair|car_wash|fuel|parking|hotel|motel|guest_house|hostel|hairdresser|beauty_salon|laundry|dry_cleaning"](around:{radius},{lat},{lon});',
          'node["office"~"company|business"](around:{radius},{lat},{lon});',
          'node["craft"](around:{radius},{lat},{lon});'
        ];
      } else {
        // Search only selected categories
        selectedCategories.forEach(category => {
          if (['restaurant', 'cafe', 'bar', 'hotel', 'pharmacy', 'bank', 'clinic', 'hospital', 'dentist', 'car_rental'].includes(category)) {
            queryParts.push(`node["amenity"="${category}"](around:{radius},{lat},{lon});`);
          } else if (category === 'shop') {
            queryParts.push('node["shop"](around:{radius},{lat},{lon});');
          } else if (category === 'office') {
            queryParts.push('node["office"~"company|business"](around:{radius},{lat},{lon});');
          } else if (category === 'supermarket') {
            queryParts.push('node["shop"="supermarket"](around:{radius},{lat},{lon});');
          } else if (category === 'mall') {
            queryParts.push('node["building"="mall"](around:{radius},{lat},{lon});');
          }
        });
      }

      const query = `
        [out:json][timeout:60];
        (
          ${queryParts.join('\n')}
        );
        out body;
        >;
        out skel qt;
      `.replace(/{radius}/g, searchRadius * 1000)
       .replace(/{lat}/g, lat)
       .replace(/{lon}/g, lon);

      const overpass = await axios.post(`https://overpass-api.de/api/interpreter`, query, {
        headers: { 'Content-Type': 'text/plain' }
      });

      // Process results with more comprehensive data extraction
      const results = overpass.data.elements
        .filter(e => e.tags?.name)
        .map(e => {
          const tags = e.tags || {};
          return {
            id: e.id,
            name: tags.name,
            type: tags.shop || tags.amenity || tags.office || tags.leisure || tags.tourism || tags.craft || '',
            category: tags.shop || tags.amenity || tags.office || tags.craft || '',
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
            // Additional fields
            brand: tags.brand || '',
            operator: tags.operator || '',
            facebook: tags['contact:facebook'] || '',
            instagram: tags['contact:instagram'] || '',
            twitter: tags['contact:twitter'] || '',
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
            all_tags: JSON.stringify(tags) // Store all tags as JSON string
          };
        });

      setBusinesses(results);
    } catch (error) {
      console.error("Search error:", error);
      alert("Error: " + (error.response?.data || error.message));
    }
    setLoading(false);
  };

  const getDescription = (tags) => {
    const desc = [];
    if (tags.cuisine) desc.push(`Cuisine: ${tags.cuisine}`);
    if (tags.brand) desc.push(`Brand: ${tags.brand}`);
    if (tags['contact:facebook']) desc.push(`Facebook: ${tags['contact:facebook']}`);
    if (tags['contact:instagram']) desc.push(`Instagram: ${tags['contact:instagram']}`);
    if (tags['contact:twitter']) desc.push(`Twitter: ${tags['contact:twitter']}`);
    if (tags.wheelchair) desc.push(`Wheelchair: ${tags.wheelchair}`);
    if (tags.capacity) desc.push(`Capacity: ${tags.capacity}`);
    return desc.join(' | ');
  };

  const cleanPhone = (phone) => {
    if (!phone) return '';
    // Remove all non-digit characters except +
    return phone.replace(/[^\d+]/g, '');
  };

  const downloadCSV = () => {
    const csvData = businesses.map(b => ({
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
      'Opening Hours': b.opening_hours,
      Description: b.description,
      'Google Maps Link': b.google_maps_url,
      Brand: b.brand,
      Operator: b.operator,
      Facebook: b.facebook,
      Instagram: b.instagram,
      Twitter: b.twitter,
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
      'All Tags': b.all_tags
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `businesses_${place.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Advanced Business Finder</h1>
        
        {/* Search Section */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={place}
                onChange={handleInputChange}
                placeholder="Enter a city, address, or location"
                className="p-3 border border-gray-300 rounded w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded shadow-lg max-h-60 overflow-auto">
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
              onClick={searchBusinesses}
              disabled={loading || !place}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Searching...
                </span>
              ) : 'Find Businesses'}
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Radius: {searchRadius} km</label>
            <input
              type="range"
              min="1"
              max="20"
              value={searchRadius}
              onChange={(e) => setSearchRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Categories:</label>
            <div className="flex flex-wrap gap-2">
              {businessCategories.map(category => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm ${selectedCategories.includes(category) 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  {category}
                </button>
              ))}
            </div>
            <p className="text-xs mt-2">
              {selectedCategories.length > 0 
                ? `Showing only: ${selectedCategories.join(', ')}`
                : 'Showing all business types'}
            </p>
          </div>
        </div>

        {/* Results Section */}
        {businesses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'map' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${activeTab === 'table' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                  Table View ({businesses.length} businesses found)
                </button>
                <div className="ml-auto flex items-center pr-4">
                  <button
                    onClick={downloadCSV}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Export CSV
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
                      {businesses.map((b, idx) => (
                        <Marker key={idx} position={[b.lat, b.lon]}>
                          <Popup>
                            <div className="space-y-1">
                              <h3 className="font-bold text-lg">{b.name}</h3>
                              {b.type && <p><span className="font-medium">Type:</span> {b.type}</p>}
                              {b.category && <p><span className="font-medium">Category:</span> {b.category}</p>}
                              {b.subcategory && <p><span className="font-medium">Subcategory:</span> {b.subcategory}</p>}
                              {b.phone && <p><span className="font-medium">Phone:</span> {b.phone}</p>}
                              {b.address && <p><span className="font-medium">Address:</span> {b.address}</p>}
                              {b.website && <p><span className="font-medium">Website:</span> <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Link</a></p>}
                              {b.description && <p><span className="font-medium">Details:</span> {b.description}</p>}
                              <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-block mt-2">
                                View on Google Maps
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ">
                    {businesses.map((b, idx) => (
                      <div key={idx} className="border rounded-lg overflow-auto shadow-sm">
                        <div className="h-40">
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
                          <h3 className="font-bold">{b.name}</h3>
                          <p className="text-sm text-gray-600">{b.type} • {b.category}</p>
                          {b.address && <p className="text-sm mt-1">{b.address}</p>}
                          {b.phone && <p className="text-sm mt-1">📞 {b.phone}</p>}
                          {b.website && <p className="text-sm mt-1">🌐 <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Website</a></p>}
                          {b.opening_hours && <p className="text-sm mt-1">🕒 {b.opening_hours}</p>}
                          <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline inline-block mt-2">
                            View Larger Map
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'table' && (
                <div className="overflow-x-auto">
                  <div className="mb-4 text-sm text-gray-600">
                    Showing all {businesses.length} businesses with complete data
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
                      {businesses.map((b, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{b.name}</div>
                            {b.brand && <div className="text-xs text-gray-500">Brand: {b.brand}</div>}
                            {b.operator && <div className="text-xs text-gray-500">Operator: {b.operator}</div>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <span className="font-medium">Type:</span> {b.type}
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">Category:</span> {b.category}
                            </div>
                            {b.subcategory && (
                              <div className="text-sm text-gray-500">
                                <span className="font-medium">Subcategory:</span> {b.subcategory}
                              </div>
                            )}
                            {b.cuisine && (
                              <div className="text-xs text-gray-500 mt-1">
                                Cuisine: {b.cuisine}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {b.address && <div className="text-sm text-gray-900">{b.address}</div>}
                            {b.phone && <div className="text-sm mt-1">📞 {b.phone}</div>}
                            {b.email && <div className="text-sm mt-1">✉️ {b.email}</div>}
                            {b.website && (
                              <div className="mt-1">
                                <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                  Website
                                </a>
                              </div>
                            )}
                            {b.facebook && (
                              <div className="mt-1">
                                <a href={`https://facebook.com/${b.facebook}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                  Facebook
                                </a>
                              </div>
                            )}
                            {b.instagram && (
                              <div className="mt-1">
                                <a href={`https://instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                  Instagram
                                </a>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              <div>Lat: {b.lat.toFixed(6)}</div>
                              <div>Lon: {b.lon.toFixed(6)}</div>
                            </div>
                            {b.opening_hours && (
                              <div className="mt-2 text-xs">
                                <div className="font-medium">Hours:</div>
                                {b.opening_hours}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {b.wheelchair && <div>♿ {b.wheelchair}</div>}
                              {b.capacity && <div>Capacity: {b.capacity}</div>}
                              {b.building && <div>Building: {b.building}</div>}
                              {b.takeaway && <div>Takeaway: {b.takeaway}</div>}
                              {b.delivery && <div>Delivery: {b.delivery}</div>}
                              {b.outdoor_seating && <div>Outdoor: {b.outdoor_seating}</div>}
                              {b.smoking && <div>Smoking: {b.smoking}</div>}
                              {b.wifi && <div>WiFi: {b.wifi}</div>}
                              {b.parking && <div>Parking: {b.parking}</div>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <a href={b.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900">
                              View Map
                            </a>
                            <div className="mt-1 h-24 w-40">
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}