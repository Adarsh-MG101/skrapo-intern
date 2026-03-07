'use client';

import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical leaflet marker icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface CustomerMapProps {
  location: { lat: number; lng: number } | null;
  onChange?: (loc: { lat: number; lng: number }) => void;
  addressQuery?: string;
}

function LocationPicker({ onChange, location }: { onChange?: (loc: any) => void; location: any }) {
  useMapEvents({
    click(e) {
      if (onChange) {
        onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });

  return location ? <Marker position={[location.lat, location.lng]} /> : null;
}

function MapRecenter({ location }: { location: [number, number] }) {
  const map = useMap();
  const prevLoc = useRef<string>('');

  useEffect(() => {
    const locStr = location.join(',');
    if (locStr !== prevLoc.current) {
      map.setView(location, 16);
      prevLoc.current = locStr;
    }
  }, [location, map]);
  
  return null;
}

export default function CustomerMap({ location, onChange, addressQuery }: CustomerMapProps) {
  const [center, setCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India
  const [zoom, setZoom] = useState(4);
  const [isSearching, setIsSearching] = useState(false);
  const hasManuallySet = useRef(false);

  // Initial location / Geolocation
  useEffect(() => {
    if (location) {
      setCenter([location.lat, location.lng]);
      setZoom(16);
    } else if ("geolocation" in navigator && !addressQuery) {
      handleLocateMe();
    }
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
        setCenter([newLoc.lat, newLoc.lng]);
        if (onChange) onChange(newLoc);
        setIsSearching(false);
      },
      (err) => {
        console.error('Geolocation failed', err);
        setIsSearching(false);
      }
    );
  };

  // Sync with address text
  useEffect(() => {
    if (!addressQuery || addressQuery.length < 5 || !onChange) return;
    
    // Only auto-search if the user hasn't manually clicked somewhere else yet
    // to avoid fighting with their manual adjustments
    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Try searching for the address. We refine the query to increase accuracy.
        const query = addressQuery.includes('India') ? addressQuery : `${addressQuery}, India`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
        
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.5',
            'User-Agent': 'Skrapo-App-v1'
          }
        });
        const data = await res.json();
        
        if (data && data.length > 0) {
          const newLoc = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          console.log('📍 Geocoding success:', newLoc);
          onChange(newLoc);
        }
      } catch (err) {
        console.error('❌ Geocoding failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [addressQuery]);

  return (
    <div className="w-full h-48 md:h-64 rounded-2xl overflow-hidden border-2 border-gray-100 mt-4 relative z-0 shadow-inner group">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationPicker location={location} onChange={(loc) => {
          hasManuallySet.current = true;
          if (onChange) onChange(loc);
        }} />
        {location && <MapRecenter location={[location.lat, location.lng]} />}
      </MapContainer>
      
      {/* Locate Me Button */}
      <button 
        type="button"
        onClick={handleLocateMe}
        className="absolute top-4 right-4 z-[1000] bg-white p-2 rounded-xl shadow-lg border border-gray-100 hover:bg-gray-50 transition-all active:scale-95 group/btn"
        title="Use current location"
      >
        <span className="text-xl group-hover/btn:scale-110 transition-transform inline-block">🎯</span>
      </button>
      
      {isSearching && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[1001] flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 animate-fade-in">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Updating Map...</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-[1000] bg-white/80 backdrop-blur-sm px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-md pointer-events-none transition-opacity duration-300 group-hover:opacity-0 text-gray-500">
        Tap to pinpoint exact location
      </div>
    </div>
  );
}
