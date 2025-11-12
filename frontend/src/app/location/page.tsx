'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';
import { MapPin, Clock, Download, Radio } from 'lucide-react';

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
    if ((window as unknown as { google?: typeof google }).google?.maps) {
      resolve((window as unknown as { google: typeof google }).google);
      return;
    }
    const existing = document.getElementById('google-maps-js');
    if (existing) {
      (existing as HTMLScriptElement).addEventListener('load', () => resolve((window as unknown as { google: typeof google }).google));
      (existing as HTMLScriptElement).addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-js';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.onload = () => resolve((window as unknown as { google: typeof google }).google);
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
  const liveMapRef = useRef<HTMLDivElement | null>(null);
  const historyMapRef = useRef<HTMLDivElement | null>(null);
  const liveMapInstanceRef = useRef<google.maps.Map | null>(null);
  const historyMapInstanceRef = useRef<google.maps.Map | null>(null);
  const livePolylineRef = useRef<google.maps.Polyline | null>(null);
  const historyPolylineRef = useRef<google.maps.Polyline | null>(null);
  const liveMarkerRef = useRef<google.maps.Marker | null>(null);
  const historyMarkerRef = useRef<google.maps.Marker | null>(null);
  const [activeView, setActiveView] = useState<'live' | 'history'>('live');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [livePoints, setLivePoints] = useState<LatLng[]>([]);
  const [historyPoints, setHistoryPoints] = useState<LatLng[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD format
  });
  const deviceId = 'd_123'; // Hardcoded for now

  // Fetch live location (today's data)
  useEffect(() => {
    async function fetchLiveLocation() {
      if (!token || !deviceId) return;
      try {
        const today = new Date();
        const dateStr = formatDateForAPI(today);
        const data = await fetchJson<ApiLocation[]>(
          `/locations?deviceId=${deviceId}&date=${dateStr}`,
          { method: 'GET' },
          token || undefined
        );
        const valid = Array.isArray(data) ? data.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number') : [];
        if (valid.length > 0) {
          setLivePoints(valid);
        } else {
          // Fallback demo: circle path in University of Malaya
          const umCenter = { lat: 3.1199, lng: 101.6544 };
          const circle = generateCirclePoints(umCenter, 300, 90);
          setLivePoints(circle);
        }
      } catch (e) {
        const umCenter = { lat: 3.1199, lng: 101.6544 };
        const circle = generateCirclePoints(umCenter, 300, 90);
        setLivePoints(circle);
      }
    }
    fetchLiveLocation();
  }, [token, deviceId]);

  // Fetch history location (selected date)
  useEffect(() => {
    async function fetchHistoryLocation() {
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
          setHistoryPoints(valid);
        } else {
          // Fallback demo: circle path in University of Malaya
          const umCenter = { lat: 3.1199, lng: 101.6544 };
          const circle = generateCirclePoints(umCenter, 300, 90);
          setHistoryPoints(circle);
        }
      } catch (e) {
        const umCenter = { lat: 3.1199, lng: 101.6544 };
        const circle = generateCirclePoints(umCenter, 300, 90);
        setHistoryPoints(circle);
        setError(e instanceof Error ? e.message : 'Unable to load locations');
      } finally {
        setLoading(false);
      }
    }
    fetchHistoryLocation();
  }, [selectedDate, token, deviceId]);

  // Render Live Map
  useEffect(() => {
    async function renderLiveMap() {
      if (!apiKey || !liveMapRef.current || livePoints.length === 0) return;
      const g = await loadGoogleMaps(apiKey);

      if (!liveMapInstanceRef.current) {
        liveMapInstanceRef.current = new g.maps.Map(liveMapRef.current, {
          mapTypeId: g.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        } as google.maps.MapOptions);
      }

      const map = liveMapInstanceRef.current!;

      // Clear existing overlays
      if (livePolylineRef.current) livePolylineRef.current.setMap(null);
      if (liveMarkerRef.current) liveMarkerRef.current.setMap(null);

      // Draw polyline with gradient effect
      livePolylineRef.current = new g.maps.Polyline({
        path: livePoints.map((p: LatLng) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#06b6d4',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });
      livePolylineRef.current.setMap(map);

      // Latest point marker with pulsing effect
      const latest = livePoints[livePoints.length - 1];
      liveMarkerRef.current = new g.maps.Marker({
        position: latest,
        map,
        title: 'Current location',
      } as google.maps.MarkerOptions);

      // Fit bounds
      const bounds = new g.maps.LatLngBounds();
      livePoints.forEach((p: LatLng) => bounds.extend(new g.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds);
    }
    renderLiveMap();
  }, [apiKey, livePoints]);

  // Render History Map
  useEffect(() => {
    async function renderHistoryMap() {
      if (!apiKey || !historyMapRef.current || historyPoints.length === 0) return;
      const g = await loadGoogleMaps(apiKey);

      if (!historyMapInstanceRef.current) {
        historyMapInstanceRef.current = new g.maps.Map(historyMapRef.current, {
          mapTypeId: g.maps.MapTypeId.ROADMAP,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        } as google.maps.MapOptions);
      }

      const map = historyMapInstanceRef.current!;

      // Clear existing overlays
      if (historyPolylineRef.current) historyPolylineRef.current.setMap(null);
      if (historyMarkerRef.current) historyMarkerRef.current.setMap(null);

      // Draw polyline with gradient effect
      historyPolylineRef.current = new g.maps.Polyline({
        path: historyPoints.map((p: LatLng) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#8b5cf6',
        strokeOpacity: 0.7,
        strokeWeight: 4,
      });
      historyPolylineRef.current.setMap(map);

      // End point marker
      const latest = historyPoints[historyPoints.length - 1];
      historyMarkerRef.current = new g.maps.Marker({
        position: latest,
        map,
        title: 'End location',
      } as google.maps.MarkerOptions);

      // Fit bounds
      const bounds = new g.maps.LatLngBounds();
      historyPoints.forEach((p: LatLng) => bounds.extend(new g.maps.LatLng(p.lat, p.lng)));
      map.fitBounds(bounds);
    }
    renderHistoryMap();
  }, [apiKey, historyPoints, loading]);

  return (
    <div className="pb-20 min-h-screen">
      {/* Header */}
      <div className="relative z-10 pt-4 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Location</h1>
      </div>

      {/* Tab Switcher */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl rounded-[20px] p-2 shadow-xl border border-purple-400/30 inline-flex gap-2">
          <button
            onClick={() => setActiveView('live')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
              activeView === 'live'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/40 scale-105'
                : 'text-white hover:bg-white/10 hover:scale-102'
            }`}
          >
            <Radio className={`w-5 h-5 ${activeView === 'live' ? 'animate-pulse' : ''}`} />
            <span>Live</span>
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 ${
              activeView === 'history'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/40 scale-105'
                : 'text-white hover:bg-white/10 hover:scale-102'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>History</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-4 p-4 rounded-3xl border border-red-400/30 bg-gradient-to-br from-red-500/20 to-rose-500/10 backdrop-blur-2xl text-white text-sm shadow-xl shadow-red-500/20">
          {error}
        </div>
      )}

      {/* Live Location Panel */}
      {activeView === 'live' && (
        <div className="px-4 animate-fadeIn">
          <div className="rounded-[24px] border border-cyan-400/30 bg-gradient-to-br from-cyan-500/20 to-blue-500/10 backdrop-blur-2xl p-6 shadow-2xl shadow-cyan-500/20 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl -z-0" />
            
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 relative">
                  <MapPin className="w-6 h-6 text-white" strokeWidth={2.5} />
                  {/* Radar pulse animation */}
                  <div className="absolute inset-0 rounded-2xl bg-cyan-500/30 animate-ping" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">📍 Live Location</h2>
                  <p className="text-xs text-cyan-200">Real-time position tracking</p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-95 transition-all duration-200">
                Track
              </button>
            </div>

            {/* Map Container */}
            <div className="relative rounded-[20px] overflow-hidden shadow-xl border border-cyan-400/30">
              <div ref={liveMapRef} className="w-full h-[50vh]" />
              {/* Overlay info */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="bg-cyan-900/90 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-cyan-400/30">
                  <p className="text-xs text-cyan-200">Last updated</p>
                  <p className="text-sm font-semibold text-white">{new Date().toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location History Panel */}
      {activeView === 'history' && (
        <div className="px-4 animate-fadeIn">
          <div className="rounded-[24px] border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-blue-500/10 backdrop-blur-2xl p-6 shadow-2xl shadow-purple-500/20 relative overflow-hidden">
            {/* Decorative gradient overlay */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -z-0" />
            
            {/* Card Header */}
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">🕓 Location History</h2>
                  <p className="text-xs text-purple-200">Past routes and movements</p>
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-purple-400/30 text-white text-sm font-medium hover:bg-white/20 hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Date Picker */}
            <div className="mb-4 relative z-10">
              <label className="block text-sm font-semibold mb-2 text-white">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto min-w-[240px] border border-purple-400/30 rounded-2xl px-4 py-3 bg-white/10 backdrop-blur-xl text-white text-base font-medium focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 focus:shadow-lg transition-all duration-300"
              />
            </div>

            {/* Map Container */}
            <div className="relative rounded-[20px] overflow-hidden shadow-xl border border-purple-400/30">
              <div ref={historyMapRef} className="w-full h-[50vh]" />
              {loading && (
                <div className="absolute inset-0 bg-purple-900/80 backdrop-blur-md flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-400 border-t-transparent mb-3"></div>
                    <p className="text-sm text-white font-medium">Loading location history…</p>
                  </div>
                </div>
              )}
              {/* Overlay info */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end gap-2">
                <div className="bg-purple-900/90 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-purple-400/30">
                  <p className="text-xs text-purple-200">Total distance</p>
                  <p className="text-sm font-semibold text-white">~{(historyPoints.length * 0.05).toFixed(1)} km</p>
                </div>
                <div className="bg-purple-900/90 backdrop-blur-md rounded-2xl px-4 py-2 shadow-lg border border-purple-400/30">
                  <p className="text-xs text-purple-200">Data points</p>
                  <p className="text-sm font-semibold text-white">{historyPoints.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!apiKey && (
        <div className="mx-4 mt-4 text-sm text-white bg-gradient-to-br from-amber-500/20 to-orange-500/10 backdrop-blur-2xl border border-amber-400/30 rounded-3xl p-4 shadow-xl shadow-amber-500/20">
          Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
        </div>
      )}
    </div>
  );
}


