import { create } from 'zustand';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  fetchLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  latitude: null,
  longitude: null,
  loading: false,
  error: null,
  fetchLocation: async () => {
    if (get().loading || (get().latitude && get().longitude)) return; // Prevent multiple fetches if already fetching or done
    
    set({ loading: true, error: null });

    const fetchIpLocation = async () => {
      try {
        let lat: number | null = null;
        let lon: number | null = null;

        try {
          const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
          const data = await res.json();
          if (data.latitude && data.longitude) {
            lat = parseFloat(data.latitude);
            lon = parseFloat(data.longitude);
          }
        } catch (e) { console.warn("GeoJS failed", e); }

        if (!lat || !lon) {
          try {
            const res = await fetch("https://freeipapi.com/api/json");
            const data = await res.json();
            if (data.latitude && data.longitude) {
              lat = data.latitude;
              lon = data.longitude;
            }
          } catch (e) { console.warn("FreeIPAPI failed", e); }
        }

        if (!lat || !lon) {
          try {
            const res = await fetch("https://ipapi.co/json/");
            const data = await res.json();
            if (data.latitude && data.longitude) {
              lat = data.latitude;
              lon = data.longitude;
            }
          } catch (e) { console.warn("ipapi.co failed", e); }
        }

        if (lat && lon) {
          set({ latitude: lat, longitude: lon, loading: false });
        } else {
          throw new Error("All IP location services failed");
        }
      } catch (e) {
        console.error("Critical IP Location fallback failed", e);
        set({ latitude: 40.7128, longitude: -74.0060, loading: false, error: "Failed to get location. Defaulting to NYC." }); // Default to NYC
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          set({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, loading: false });
        },
        async (err) => {
          console.warn("Browser location denied or failed, falling back to IP location...", err);
          await fetchIpLocation();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      await fetchIpLocation();
    }
  }
}));
