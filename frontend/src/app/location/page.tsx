'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';

type LatLng = { lat: number; lng: number; timestamp?: string };

type ApiLocation = {
  lat: number;
  lng: number;
  timestamp?: string;
  accuracy?: number;
  speed?: number;
};

function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is undefined'));
      return;
    }
    // Already loaded
    if ((window as any).google && (window as any).google.maps) {
      resolve((window as any).google);
      return;
    }
    const existing = document.getElementById('google-maps-js');
    if (existing) {
      (existing as HTMLScriptElement).addEventListener('load', () => resolve((window as any).google));
      (existing as HTMLScriptElement).addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
}

function generateCirclePoints(center: LatLng, radiusMeters: number, numPoints: number): LatLng[] {
  const points: LatLng[] = [];
  const latRadians = (center.lat * Math.PI) / 180;
  const metersPerDegLat = 111320; // approx
  const metersPerDegLng = 111320 * Math.cos(latRadians); // approx
  const dLat = radiusMeters / metersPerDegLat;
  const dLng = radiusMeters / metersPerDegLng;
  for (let i = 0; i < numPoints; i++) {
    const theta = (2 * Math.PI * i) / numPoints;
    const lat = center.lat + dLat * Math.sin(theta);
    const lng = center.lng + dLng * Math.cos(theta);
    points.push({ lat, lng });
  }
  return points;
}

function formatDateForAPI(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export default function LocationPage() {
  const { token } = useAuth();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState<LatLng[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const deviceId = 'd_123'; // Hardcoded for now

  useEffect(() => {
    async function fetchLocations() {
      if (!token || !deviceId) return;
      try {
        setLoading(true);
        setError(null);
        const dateStr = formatDateForAPI(new Date(selectedDate));
        const data = await fetchJson<ApiLocation[]>(
          `/locations?deviceId=${deviceId}&date=${dateStr}`,
          { method: 'GET' },
          token || undefined
        );
        const valid = Array.isArray(data) ? data.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number') : [];
        if (valid.length > 0) {
          setPoints(valid);
        } else {
          // Fallback demo: circle path in University of Malaya
          const umCenter = { lat: 3.1199, lng: 101.6544 };
          const circle = generateCirclePoints(umCenter, 300, 90);
          setPoints(circle);
        }
      } catch (e: any) {
        // On error, show demo circle
        const umCenter = { lat: 3.1199, lng: 101.6544 };
        const circle = generateCirclePoints(umCenter, 300, 90);
        setPoints(circle);
        setError(e?.message || 'Unable to load locations');
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, [selectedDate, token, deviceId]);

  useEffect(() => {
    // Don't render map while loading
    if (loading) return;

    async function render() {
      if (!apiKey) return;
      if (!containerRef.current) return;
      const g = await loadGoogleMaps(apiKey);

      // Initialize map once
      if (!mapRef.current) {
        mapRef.current = new g.maps.Map(containerRef.current, {
          mapTypeId: g.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        });
      }

      const map = mapRef.current!;

      // Clear existing overlays
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (markerRef.current) markerRef.current.setMap(null);

      if (!points || points.length === 0) {
        // Default center (Singapore) if no data
        map.setCenter({ lat: 1.3521, lng: 103.8198 });
        map.setZoom(11);
        return;
      }

      // Draw polyline
      polylineRef.current = new g.maps.Polyline({
        path: points.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.9,
        strokeWeight: 3,
      });
      polylineRef.current.setMap(map);

      // Latest point marker
      const latest = points[points.length - 1];
      markerRef.current = new g.maps.Marker({
        position: latest,
        map,
        title: 'Latest location',
      });

      // Fit bounds to all points
      const bounds = new g.maps.LatLngBounds();
      points.forEach(p => bounds.extend(new g.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds);
    }
    render();
  }, [apiKey, points, loading]);

  return (
    <div className="pb-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Location</h1>
        <p className="text-sm text-gray-500 mt-1">View movement path by selecting a date.</p>
      </div>

      {/* Date selector - more prominent */}
      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
        <label className="block text-sm font-semibold mb-2 text-gray-900">Select Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full sm:w-auto min-w-[200px] border-2 border-gray-300 rounded-xl px-4 py-3 bg-white text-gray-900 text-base font-medium focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition shadow-sm"
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div ref={containerRef} className="w-full h-[60vh] rounded-2xl border border-gray-200 bg-white overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
              <p className="text-sm text-gray-700 font-medium">Loading locations…</p>
            </div>
          </div>
        )}
      </div>

      {!apiKey && (
        <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </div>
      )}
    </div>
  );
}


