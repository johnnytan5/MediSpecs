'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, Wifi, WifiOff, Video, X, Loader2, Phone, Eye, CheckCircle, Clock } from 'lucide-react';

interface StreamStatus {
  status: 'available' | 'unavailable';
  camera_running: boolean;
  camera_type: 'picamera2' | 'opencv';
  has_frame: boolean;
  stream_url: string;
  message: string;
}

type UserResponse = null | 'CONFIRMED' | 'NO_RESPONSE';

interface FallEvent {
  timestamp: string;
  freefall_g: number;
  impact_g: number;
  inactivity_sec: number;
  user_response: UserResponse;
  response_text: string | null;
  acknowledged: boolean;
  simulated?: boolean;
}

interface CurrentReadings {
  acceleration: {
    x: number;
    y: number;
    z: number;
    total: number;
  };
  state: string;
  time_in_state: number;
}

interface EmergencyStatus {
  monitoring: boolean;
  current_state: string;
  latest_fall: FallEvent | null;
  current_readings?: CurrentReadings;
}

// Alert Component for STATE 1: Waiting for user response
function FallWaitingAlert({ 
  fall, 
  getTimeSinceFall, 
  formatTime 
}: { 
  fall: FallEvent; 
  getTimeSinceFall: (timestamp: string) => number;
  formatTime: (timestamp: string) => string;
}) {
  const [timeSinceFall, setTimeSinceFall] = React.useState(0);

  React.useEffect(() => {
    const update = () => setTimeSinceFall(getTimeSinceFall(fall.timestamp));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [fall.timestamp, getTimeSinceFall]);

  const secondsRemaining = Math.max(0, 15 - timeSinceFall);
  const isUrgent = secondsRemaining <= 5;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border-2 ${
      isUrgent ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
    } animate-pulse`}>
      <div className="shrink-0">
        <Clock className={`w-6 h-6 ${isUrgent ? 'text-red-600' : 'text-yellow-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className={`text-sm font-bold ${isUrgent ? 'text-red-900' : 'text-yellow-900'}`}>
            ⏳ Fall Detected - Waiting for Response
          </p>
          <span className={`text-lg font-bold ${isUrgent ? 'text-red-700' : 'text-yellow-700'}`}>
            {secondsRemaining}s
          </span>
        </div>
        <p className={`text-xs mt-1 ${isUrgent ? 'text-red-800' : 'text-yellow-800'}`}>
          Detected at {formatTime(fall.timestamp)} • Impact: {fall.impact_g.toFixed(1)}G
        </p>
        <div className="mt-2 flex gap-2 text-xs">
          <span className={`px-2 py-1 rounded ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            Free fall: {fall.freefall_g.toFixed(2)}G
          </span>
          <span className={`px-2 py-1 rounded ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
            Inactivity: {fall.inactivity_sec.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}

// Alert Component for STATE 2: User confirmed okay
function FallConfirmedAlert({ 
  fall, 
  formatTime, 
  onDismiss 
}: { 
  fall: FallEvent; 
  formatTime: (timestamp: string) => string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-green-300 bg-green-50">
      <div className="shrink-0">
        <CheckCircle className="w-6 h-6 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-green-900">
            ✅ User Confirmed: &quot;{fall.response_text || 'okay'}&quot;
          </p>
          <button 
            onClick={onDismiss}
            className="text-green-700 hover:text-green-900 text-lg leading-none"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-green-800 mt-1">
          Fall at {formatTime(fall.timestamp)} - User is okay
        </p>
        <div className="mt-2 flex gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-green-100 text-green-700">
            Impact: {fall.impact_g.toFixed(1)}G
          </span>
          {fall.simulated && (
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700">
              Test fall
            </span>
          )}
        </div>
      </div>
    </div>
  );
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

export default function HomePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  
  // Fall detection state
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus | null>(null);
  const [alertedFalls, setAlertedFalls] = useState<Set<string>>(new Set());
  const [emergencyAlertShown, setEmergencyAlertShown] = useState(false);
  const [dismissedFalls, setDismissedFalls] = useState<Set<string>>(new Set());
  
  const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || '';

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

  // Check emergency/fall detection status
  const checkEmergencyStatus = async () => {
    if (!streamBaseUrl) {
      return;
    }

    try {
      const response = await fetch(`${streamBaseUrl}/accelerometer/emergency/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data: EmergencyStatus = await response.json();
      setEmergencyStatus(data);

      // Handle emergency alert (NO_RESPONSE state)
      if (data.latest_fall?.user_response === 'NO_RESPONSE') {
        const fallId = data.latest_fall.timestamp;
        
        // Only show emergency alert once per fall
        if (!alertedFalls.has(fallId) && !dismissedFalls.has(fallId)) {
          setEmergencyAlertShown(true);
          setAlertedFalls(prev => new Set(prev).add(fallId));
          
          // Play alert sound (optional)
          try {
            const audio = new Audio('/alert.mp3');
            audio.play().catch(() => {});
          } catch (e) {
            // Silent fail if audio not available
          }
        }
      }
    } catch (error) {
      console.error('Failed to check emergency status:', error);
      // Don't clear existing status on error - keep last known state
    }
  };

  // Check stream status on mount and poll every 10 seconds
  useEffect(() => {
    checkStreamStatus();
    const interval = setInterval(checkStreamStatus, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll emergency status every 5 seconds
  useEffect(() => {
    if (!streamBaseUrl) return;
    
    checkEmergencyStatus();
    const interval = setInterval(checkEmergencyStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertedFalls, dismissedFalls]);

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

  const getTimeSinceFall = (fallTimestamp: string): number => {
    try {
      const fallTime = new Date(fallTimestamp).getTime();
      const now = Date.now();
      return Math.floor((now - fallTime) / 1000); // seconds
    } catch {
      return 0;
    }
  };

  const dismissFall = (fallTimestamp: string) => {
    setDismissedFalls(prev => new Set(prev).add(fallTimestamp));
    setEmergencyAlertShown(false);
  };

  const call911 = () => {
    // In a real app, this would trigger emergency services
    alert('🚨 Calling 911...\n\nIn a production app, this would dial emergency services.');
  };

  const viewFallVideo = () => {
    // Navigate to videos page (would need proper routing)
    window.location.href = '/videos';
  };

  return (
    <div className="pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Home</h1>
        <p className="text-sm text-gray-500 mt-1">Quick overview at a glance.</p>
      </div>

      {/* Connection Status Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Device Connection</h2>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                  isCheckingStatus 
                    ? 'bg-gray-100' 
                    : isConnected 
                      ? 'bg-green-100' 
                      : 'bg-gray-100'
                }`}>
                  {isCheckingStatus ? (
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                  ) : isConnected ? (
                    <Wifi className="w-6 h-6 text-green-600" />
                  ) : (
                    <WifiOff className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {isCheckingStatus 
                      ? 'Checking Connection...' 
                      : isConnected 
                        ? 'Glasses Connected' 
                        : 'Glasses Disconnected'}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {isCheckingStatus 
                      ? 'Connecting to device...'
                      : isConnected 
                        ? `Device ID: d_123 • ${streamStatus?.camera_type || 'Camera'} • ${streamStatus?.message || 'Ready'}`
                        : streamStatus?.message || 'Waiting for connection...'}
                  </p>
                </div>
              </div>
              {isConnected && (
                <button
                  onClick={() => setShowLiveFeed(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Video size={18} />
                  <span>Live Feed</span>
                </button>
              )}
            </div>
            {!streamBaseUrl && !isCheckingStatus && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  ⚠️ Stream URL not configured. Set <code className="bg-amber-100 px-1.5 py-0.5 rounded">NEXT_PUBLIC_STREAM_BASE_URL</code> in environment variables.
                </div>
              </div>
            )}
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
            {emergencyStatus?.monitoring ? (
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Monitoring</span>
              </span>
            ) : (
              <span className="text-xs text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                Offline
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {/* No monitoring / offline */}
          {!emergencyStatus?.monitoring && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-gray-300 bg-gray-50">
              <div className="shrink-0"><WifiOff className="w-5 h-5 text-gray-500" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">Fall detection offline</p>
                <p className="text-xs text-gray-600">Waiting for device connection...</p>
              </div>
            </div>
          )}

          {/* No fall detected - all clear */}
          {emergencyStatus?.monitoring && !emergencyStatus.latest_fall && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-green-200 bg-green-50">
              <div className="shrink-0"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-800">All clear</p>
                <p className="text-xs text-green-700/80">No falls detected • Monitoring active</p>
              </div>
            </div>
          )}

          {/* STATE 1: Fall detected, waiting for response (user_response = null) */}
          {emergencyStatus?.monitoring && 
           emergencyStatus.latest_fall && 
           emergencyStatus.latest_fall.user_response === null &&
           !dismissedFalls.has(emergencyStatus.latest_fall.timestamp) && (
            <FallWaitingAlert 
              fall={emergencyStatus.latest_fall}
              getTimeSinceFall={getTimeSinceFall}
              formatTime={formatTime}
            />
          )}

          {/* STATE 2: User confirmed okay (user_response = "CONFIRMED") */}
          {emergencyStatus?.monitoring && 
           emergencyStatus.latest_fall && 
           emergencyStatus.latest_fall.user_response === 'CONFIRMED' &&
           !dismissedFalls.has(emergencyStatus.latest_fall.timestamp) && (
            <FallConfirmedAlert 
              fall={emergencyStatus.latest_fall}
              formatTime={formatTime}
              onDismiss={() => dismissFall(emergencyStatus.latest_fall!.timestamp)}
            />
          )}

          {/* STATE 3: No response - EMERGENCY (user_response = "NO_RESPONSE") */}
          {emergencyStatus?.monitoring && 
           emergencyStatus.latest_fall && 
           emergencyStatus.latest_fall.user_response === 'NO_RESPONSE' &&
           !dismissedFalls.has(emergencyStatus.latest_fall.timestamp) && (
            <FallEmergencyAlert 
              fall={emergencyStatus.latest_fall}
              formatTime={formatTime}
              onCall911={call911}
              onViewVideo={viewFallVideo}
              onDismiss={() => dismissFall(emergencyStatus.latest_fall!.timestamp)}
            />
          )}
        </div>
      </section>

      {/* Summary Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <span className="text-xs text-gray-500">Today</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">Reminders due</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900">0</p>
            <p className="text-xs text-gray-500 mt-1">Next: —</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">Latest location</span>
            </div>
            <p className="text-sm text-gray-900">Open Location tab to view</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">Recent videos</span>
            </div>
            <p className="text-sm text-gray-900">No recent uploads</p>
          </div>
        </div>
      </section>
    </div>
  );
}