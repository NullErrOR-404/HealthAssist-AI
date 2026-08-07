import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Menu, User, LocateFixed, Search } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useLocationStore } from '@/store/locationStore';
import logo from '@/assets/Logo.png';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AuthButton } from '@/components/ui/AuthButton';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { BottomMenu } from '@/components/ui/BottomMenu';

// Fix Leaflet's default icon issue in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Facility {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string;
  type: "hospital" | "clinic" | "pharmacy";
}

// Custom Icons
const createIcon = (colorClass: string) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="${colorClass} w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

const redIcon = createIcon('bg-red-500');
const yellowIcon = createIcon('bg-yellow-400');
const userIcon = createIcon('bg-blue-600');

// Component to dynamically update map center
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

const Maps = () => {
  const { toggleToolsDrawer } = useSettingsStore();
  const navigate = useNavigate();
  const { latitude, longitude, fetchLocation, loading: locationLoading } = useLocationStore();
  const [position, setPosition] = useState<[number, number]>([40.7128, -74.0060]); // Default to NYC
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  useEffect(() => {
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
      fetchNearbyHospitals(latitude, longitude);
    }
  }, [latitude, longitude]);

  const handleLocateMe = async () => {
    await fetchLocation();
    if (latitude && longitude) {
      setPosition([latitude, longitude]);
      fetchNearbyHospitals(latitude, longitude);
    }
  };

  const fetchNearbyHospitals = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const query = `
        [out:json];
        (
          node["amenity"="hospital"](around:4000, ${lat}, ${lon});
          node["amenity"="clinic"](around:4000, ${lat}, ${lon});
          node["amenity"="pharmacy"](around:4000, ${lat}, ${lon});
        );
        out center;
      `;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.elements) {
        const parsed = data.elements.map((item: any) => ({
          id: item.id.toString(),
          name: item.tags?.name || (item.tags?.amenity === "pharmacy" ? "Pharmacy" : "Medical Facility"),
          lat: item.lat,
          lon: item.lon,
          type: item.tags?.amenity || "clinic",
          address: item.tags?.['addr:street'] 
            ? `${item.tags['addr:housenumber'] || ''} ${item.tags['addr:street']}, ${item.tags['addr:city'] || ''}`
            : (item.tags?.amenity || "Medical Center")
        }));
        setFacilities(parsed);
      }
    } catch (error) {
      console.error("Failed to fetch facilities", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setPosition([lat, lon]);
        fetchNearbyHospitals(lat, lon);
      } else {
        alert("Location not found. Try a different city name.");
      }
    } catch (err) {
      console.error("Search failed", err);
      alert("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      {/* Header section with clinical aesthetic */}
      <header className="pt-10 pb-6 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => toggleToolsDrawer(true)} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center overflow-hidden border border-border">
             <img src={logo} alt="HealthAssist AI" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground leading-tight">HealthAssist</h1>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">Location Services</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <AuthButton />
          <ThemeToggle />
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm hover:scale-110 hover:-translate-y-1 transition-all duration-300">
            <User size={18} />
          </button>
        </div>
      </header>

      {/* Map Area */}
      <main className="flex-1 w-full relative z-0">
        {/* Search Bar Overlay */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] w-[90%] max-w-md">
          <form onSubmit={handleSearch} className="flex items-center bg-background/90 backdrop-blur-md rounded-full shadow-lg border border-border overflow-hidden px-2 py-1.5">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search city (e.g. London, Tokyo)..." 
              className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button type="submit" className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors">
              <Search size={16} />
            </button>
          </form>
        </div>

        <MapContainer center={position} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <ChangeView center={position} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User Location Marker */}
          <Marker position={position} icon={userIcon}>
            <Popup>
              <div className="font-bold text-blue-600">You are here</div>
            </Popup>
          </Marker>

          {/* Facilities */}
          {facilities.map(facility => (
            <Marker 
              key={facility.id} 
              position={[facility.lat, facility.lon]}
              icon={facility.type === 'pharmacy' ? yellowIcon : redIcon}
            >
              <Popup className="rounded-xl overflow-hidden">
                <div className="flex flex-col min-w-[150px]">
                  <div className={`p-2 text-white font-bold text-sm rounded-t-md ${facility.type === 'pharmacy' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {facility.type === 'pharmacy' ? '💊 Pharmacy' : '🏥 Medical Facility'}
                  </div>
                  <div className="p-3 bg-card">
                    <strong className="block text-base text-foreground mb-1">{facility.name}</strong>
                    <span className="text-xs text-muted-foreground block">{facility.address.split(',').slice(0, 3).join(', ')}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background/90 text-foreground px-4 py-2 rounded-full shadow-lg border border-border text-sm font-bold animate-pulse z-[400]">
            Searching for nearby medical facilities...
          </div>
        )}

        {/* Floating GPS Button */}
        <button 
          onClick={handleLocateMe}
          title="My Location"
          className="absolute bottom-24 right-6 z-[400] w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all border-4 border-background/50 backdrop-blur-md"
        >
          <LocateFixed size={24} />
        </button>
      </main>

      {/* Persistent Bottom Nav */}
      <BottomMenu />
    </div>
  );
};

export default Maps;
