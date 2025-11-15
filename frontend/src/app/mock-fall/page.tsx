'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Video, X, Loader2, Glasses, Clock, MapPin, Phone, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';

interface StreamStatus {
  status: 'available' | 'unavailable';
  camera_running: boolean;
  camera_type: 'picamera2' | 'opencv';
  has_frame: boolean;
  stream_url: string;
  message: string;
}

interface FallEvent {
  timestamp: string;
  freefall_g: number;
  impact_g: number;
  inactivity_sec: number;
  user_response: 'NO_RESPONSE';
  response_text: string | null;
  acknowledged: boolean;
  simulated?: boolean;
}

interface ApiReminder {
  reminderId?: string;
  SK?: string;
  title: string;
  timeOfDay?: string;
  scheduleType: 'daily' | 'weekly';
  daysOfWeek?: number[];
}

// Alert Component for STATE 3: No response - EMERGENCY
function FallEmergencyAlert({ 
  fall, 
  formatTime, 
  onCall911, 
  onViewVideo, 
  onDismiss 
}: { 
  fall: FallEvent; 
  formatTime: (timestamp: string) => string;
  onCall911: () => void;
  onViewVideo: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-red-500 bg-red-50 overflow-hidden shadow-lg">
      <div className="flex items-start gap-3 p-4 bg-red-100">
        <div className="shrink-0">
          <AlertTriangle className="w-8 h-8 text-red-600 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-red-900">
            🚨 FALL EMERGENCY - NO RESPONSE
          </p>
          <p className="text-sm text-red-800 mt-1">
            Fall detected at {formatTime(fall.timestamp)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-red-200 text-red-900 font-semibold">
              Impact: {fall.impact_g.toFixed(1)}G
            </span>
            <span className="px-2 py-1 rounded bg-red-200 text-red-900 font-semibold">
              Inactivity: {fall.inactivity_sec.toFixed(1)}s
            </span>
            <span className="px-2 py-1 rounded bg-red-200 text-red-900 font-semibold">
              No response after 15s
            </span>
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="p-4 bg-white space-y-2">
        <p className="text-xs text-gray-600 font-medium mb-3">Emergency Actions:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={onCall911}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-md"
          >
            <Phone size={18} />
            <span>Call 911</span>
          </button>
          <button
            onClick={onViewVideo}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            <Eye size={18} />
            <span>View Video</span>
          </button>
          <button
            onClick={onDismiss}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-300 text-gray-800 font-semibold hover:bg-gray-400 transition-colors"
          >
            <X size={18} />
            <span>Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MockFallPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [nextReminder, setNextReminder] = useState<{ title: string; time: string } | null>(null);
  
  const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || '';

  // Static mock fall event data
  const mockFall: FallEvent = {
    timestamp: new Date().toISOString(),
    freefall_g: 0.2,
    impact_g: 8.5,
    inactivity_sec: 15.0,
    user_response: 'NO_RESPONSE',
    response_text: null,
    acknowledged: false,
  };

  // Navigation
  const handleNavigateToLocation = () => {
    router.push('/location');
  };

  // Fetch next reminder
  useEffect(() => {
    if (!token) return;
    
    async function loadNextReminder() {
      try {
        const userId = 'u_123';
        const data = await fetchJson<ApiReminder[]>(`/reminders?userId=${userId}`, { method: 'GET' }, token || undefined);
        
        if (Array.isArray(data) && data.length > 0) {
          // Sort by time to get the next one
          const sorted = [...data].sort((a, b) => 
            (a.timeOfDay || '').localeCompare(b.timeOfDay || '')
          );
          
          const next = sorted[0];
          if (next) {
            setNextReminder({
              title: next.title,
              time: next.timeOfDay || '—'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load reminders:', error);
      }
    }
    
    loadNextReminder();
  }, [token]);

  // Check stream status
  const checkStreamStatus = async () => {
    if (!streamBaseUrl) {
      console.warn('NEXT_PUBLIC_STREAM_BASE_URL not configured');
      setIsCheckingStatus(false);
      return;
    }

    try {
      const response = await fetch(`${streamBaseUrl}/stream/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: StreamStatus = await response.json();
      setStreamStatus(data);
      setIsConnected(data.camera_running && data.has_frame);
    } catch (error) {
      console.error('Failed to check stream status:', error);
      setIsConnected(false);
      setStreamStatus(null);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Check stream status on mount and poll every 10 seconds
  useEffect(() => {
    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset stream state when modal opens
  useEffect(() => {
    if (showLiveFeed) {
      setStreamError(null);
      setStreamLoaded(false);
    }
  }, [showLiveFeed]);

  // Helper functions
  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch {
      return isoString;
    }
  };

  const call911 = () => {
    // In a real app, this would trigger emergency services
    alert('🚨 Calling 911...\n\nIn a production app, this would dial emergency services.');
  };

  const viewFallVideo = () => {
    // Navigate to videos page
    window.location.href = '/videos';
  };

  const dismissFall = () => {
    // Static page, dismiss doesn't do anything
    console.log('Dismiss clicked');
  };

  return (
    <div className="pb-8">
      <div className="relative z-10 pt-4 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Fall Detected</h1>
      </div>

      {/* Connection Status Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Devices</h2>
        </div>
        <div className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl overflow-hidden shadow-2xl shadow-purple-500/20">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl backdrop-blur-xl shadow-lg ${
                  isCheckingStatus 
                    ? 'bg-gray-500/30' 
                    : isConnected 
                      ? 'bg-gradient-to-br from-green-400/40 to-emerald-400/30' 
                      : 'bg-gray-500/30'
                }`}>
                  {isCheckingStatus ? (
                    <Loader2 className="w-7 h-7 text-gray-300 animate-spin" />
                  ) : isConnected ? (
                    <Glasses className="w-7 h-7 text-green-200" />
                  ) : (
                    <Glasses className="w-7 h-7 text-gray-300" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-white">
                    {isCheckingStatus 
                      ? 'Checking Connection...' 
                      : isConnected 
                        ? 'Glasses Connected' 
                        : 'Glasses Disconnected'}
                  </p>
                  <p className="text-sm text-purple-200/90 mt-0.5">
                    {isCheckingStatus 
                      ? 'Connecting to device...'
                      : isConnected 
                        ? `Device ID: d_123 • ${streamStatus?.camera_type || 'Camera'} • ${streamStatus?.message || 'Ready'}`
                        : 'Waiting for connection...'}
                  </p>
                  <p className="text-xs text-purple-300/70 mt-1">
                    Device last sync: {isConnected ? 'Just now' : 'Never'}
                  </p>
                </div>
              </div>
              {isConnected && (
                <button
                  onClick={() => setShowLiveFeed(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105"
                >
                  <Video size={18} />
                  <span>Live Feed</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Live Feed Modal */}
      {showLiveFeed && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Feed</h3>
                  <p className="text-sm text-gray-500">Device d_123 • Streaming</p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveFeed(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Body - Video Feed */}
            <div className="p-5">
              <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden relative">
                {/* Loading state */}
                {!streamLoaded && !streamError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-spin" />
                      <p className="text-gray-400 text-sm font-medium">
                        Connecting to live feed...
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        Please wait
                      </p>
                    </div>
                  </div>
                )}

                {/* Error state */}
                {streamError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center">
                      <Video className="w-16 h-16 text-red-400 mx-auto mb-3" />
                      <p className="text-red-400 text-sm font-medium">
                        Stream connection failed
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {streamError}
                      </p>
                      <button
                        onClick={() => {
                          setStreamError(null);
                          setStreamLoaded(false);
                        }}
                        className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* Actual MJPEG stream */}
                {streamBaseUrl && !streamError && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${streamBaseUrl}/stream/live`}
                    alt="Live Stream"
                    className={`w-full h-full object-cover ${streamLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => {
                      setStreamLoaded(true);
                      setStreamError(null);
                    }}
                    onError={() => {
                      setStreamError('Unable to load stream. Check if camera is running.');
                      setStreamLoaded(false);
                    }}
                  />
                )}

                {/* Stream status indicator - only show when loaded */}
                {streamLoaded && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <span className="text-white text-xs font-medium">LIVE</span>
                  </div>
                )}
              </div>

              {/* Stream Controls */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                    Resolution: 640x480
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                    FPS: 2
                  </div>
                  {streamStatus && (
                    <div className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium">
                      {streamStatus.camera_type}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowLiveFeed(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                >
                  Close Feed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fall Detection Alerts Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Fall Detection</h2>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Monitoring</span>
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {/* STATE 3: No response - EMERGENCY (static) */}
          <FallEmergencyAlert 
            fall={mockFall}
            formatTime={formatTime}
            onCall911={call911}
            onViewVideo={viewFallVideo}
            onDismiss={dismissFall}
          />
        </div>
      </section>

      {/* Summary Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Summary</h2>
          <span className="text-xs text-purple-300">Today</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Next Reminder Widget - Crystal Glass Style */}
          <div className="rounded-3xl border border-pink-400/30 bg-gradient-to-br from-pink-500/20 to-red-500/10 backdrop-blur-2xl p-6 relative shadow-2xl shadow-pink-500/20 hover:shadow-pink-500/30 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400/40 to-red-400/30 backdrop-blur-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-pink-200" />
            </div>
            <div className="mb-3">
              <span className="text-sm font-semibold text-pink-200">Next Reminder</span>
            </div>
            {nextReminder ? (
              <>
                <p className="text-lg font-bold text-white truncate pr-14">{nextReminder.title}</p>
                <p className="text-sm text-pink-100/90 mt-2">Time: {nextReminder.time}</p>
              </>
            ) : (
              <>
                <p className="text-base text-white pr-14">No reminders</p>
                <p className="text-xs text-pink-200/80 mt-2">Create one to get started</p>
              </>
            )}
          </div>

          {/* Latest Location Widget - Crystal Glass Style */}
          <div 
            className="rounded-3xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 backdrop-blur-2xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-300 relative shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/30"
            onClick={handleNavigateToLocation}
          >
            <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/40 to-cyan-400/30 backdrop-blur-xl flex items-center justify-center shadow-lg">
              <MapPin className="w-6 h-6 text-emerald-200" />
            </div>
            <div className="mb-3">
              <span className="text-sm font-semibold text-emerald-200">Latest location</span>
            </div>
            <p className="text-sm text-white pr-14">Open Location tab to view</p>
          </div>

          {/* Recent Videos Widget - Crystal Glass Style */}
          <div className="rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-500/20 to-purple-500/10 backdrop-blur-2xl p-6 relative shadow-2xl shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] transition-all duration-300">
            <div className="absolute top-5 right-5 w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400/40 to-purple-400/30 backdrop-blur-xl flex items-center justify-center shadow-lg">
              <Video className="w-6 h-6 text-violet-200" />
            </div>
            <div className="mb-3">
              <span className="text-sm font-semibold text-violet-200">Recent videos</span>
            </div>
            <p className="text-sm text-white pr-14">No recent uploads</p>
          </div>
        </div>
      </section>
    </div>
  );
}
