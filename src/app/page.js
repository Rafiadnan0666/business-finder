"use client"
import { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

export default function Home() {
  const [place, setPlace] = useState('');
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(false);
  let no = 1;

  const searchBusinesses = async () => {
    setLoading(true);
    try {
      // Step 1: Geocode the place
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: place,
          format: 'json',
          limit: 1
        },
        headers: { 'User-Agent': 'OSM-Business-Finder/1.0' }
      });

      if (!geo.data.length) throw new Error("Place not found");

      const { lat, lon } = geo.data[0];


        const query = `
        [out:json][timeout:60];
        (
          node["shop"](around:10000,${lat},${lon});
          node["office"="company"](around:10000,${lat},${lon});
          node["office"="business"](around:10000,${lat},${lon});
          node["office"](around:10000,${lat},${lon});
          node["craft"](around:10000,${lat},${lon});
          node["amenity"="restaurant"](around:10000,${lat},${lon});
          node["amenity"="cafe"](around:10000,${lat},${lon});
          node["amenity"="bar"](around:10000,${lat},${lon});
          node["amenity"="pub"](around:10000,${lat},${lon});
          node["amenity"="fast_food"](around:10000,${lat},${lon});
          node["amenity"="food_court"](around:10000,${lat},${lon});
          node["amenity"="pharmacy"](around:10000,${lat},${lon});
          node["amenity"="bank"](around:10000,${lat},${lon});
          node["amenity"="clinic"](around:10000,${lat},${lon});
          node["amenity"="hospital"](around:10000,${lat},${lon});
          node["amenity"="dentist"](around:10000,${lat},${lon});
          node["amenity"="doctors"](around:10000,${lat},${lon});
          node["amenity"="veterinary"](around:10000,${lat},${lon});
          node["amenity"="atm"](around:10000,${lat},${lon});
          node["amenity"="marketplace"](around:10000,${lat},${lon});
          node["amenity"="car_rental"](around:10000,${lat},${lon});
          node["amenity"="car_repair"](around:10000,${lat},${lon});
          node["amenity"="car_wash"](around:10000,${lat},${lon});
          node["amenity"="fuel"](around:10000,${lat},${lon});
          node["amenity"="parking"](around:10000,${lat},${lon});
          node["amenity"="hotel"](around:10000,${lat},${lon});
          node["amenity"="motel"](around:10000,${lat},${lon});
          node["amenity"="guest_house"](around:10000,${lat},${lon});
          node["amenity"="hostel"](around:10000,${lat},${lon});
          node["amenity"="hairdresser"](around:10000,${lat},${lon});
          node["amenity"="beauty_salon"](around:10000,${lat},${lon});
          node["amenity"="laundry"](around:10000,${lat},${lon});
          node["amenity"="dry_cleaning"](around:10000,${lat},${lon});
        );
        out body;
      `;
      const overpass = await axios.post(`https://overpass-api.de/api/interpreter`, query, {
        headers: { 'Content-Type': 'text/plain' }
      });

      const results = overpass.data.elements
        .filter(e => e.tags?.name)
        .map(e => ({
          name: e.tags.name,
          type: e.tags.shop || e.tags.office || e.tags.amenity || e.tags.craft || '',
          category: e.tags.cuisine || e.tags.shop || e.tags.office || e.tags.amenity || e.tags.craft || '',
          lat: e.lat,
          lon: e.lon,
          phone: cleanPhone(e.tags.phone),
          address: e.tags["addr:street"] || '',
          website: e.tags.website || ''
        }));


      setBusinesses(results);
    } catch (error) {
      alert("Error: " + error.message);
    }
    setLoading(false);
  };

  const cleanPhone = (phone) => {
    if (!phone) return '';
    return [...phone].filter(c => /\d|\+/.test(c)).join('');
  };

  const downloadCSV = () => {
    const csv = Papa.unparse(businesses);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'businesses.csv');
  };

  return (
    <div className="text-black  min-h-screen p-10 font-sans bg-gray-100">
      <h1 className="text-black  text-3xl font-bold mb-6">Business Finder</h1>

      <div className="text-black  mb-6 flex gap-4">
        <input
          type="text"
          value={place}
          onChange={e => setPlace(e.target.value)}
          placeholder="Enter a place (e.g. Jakarta)"
          className="text-black  p-2 border border-gray-300 rounded w-full"
        />
        <button
          onClick={searchBusinesses}
          className="text-black  px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          disabled={loading || !place}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {businesses.length > 0 && (
        <>
          <button
            onClick={downloadCSV}
            className="text-black  mb-4 px-4 py-2 bg-green-600 text-white rounded"
          >
            Download CSV
          </button>

          <div className="text-black  overflow-auto max-h-[500px] border rounded bg-white">
            <table className="text-black  min-w-full text-sm">
              <thead className="text-black  bg-gray-200">
                <tr>
                  <th>No</th>
                  <th className="text-black  p-2">Name</th>
                  <th className="text-black  p-2">Type</th>
                  <th className="text-black  p-2">Category</th>
                  <th className="text-black  p-2">Latitude</th>
                  <th className="text-black  p-2">Longitude</th>
                  <th className="text-black  p-2">Phone</th>
                  <th className="text-black  p-2">Address</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b, idx) => (
                  <tr key={idx} className="text-black  border-t">
                    <td className="text-black  p-2">{no++}</td>
                    <td className="text-black  p-2">{b.name}</td>
                    <td className="text-black  p-2"><span className='badge'>{b.type}</span></td>
                    <td className="text-black  p-2"><span className='badge'>{b.category}</span></td>
                    <td className="text-black  p-2">{b.lat}</td>
                    <td className="text-black  p-2">{b.lon}</td>
                    <td className="text-black  p-2">{b.phone}</td>
                    <td className="text-black  p-2">{b.address}</td>
                   <td className="text-black p-2 w-100 text-center">
                      <a href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lon}`} target="_blank" rel="noopener noreferrer">
                        View on Map
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
