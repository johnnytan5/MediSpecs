'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, WifiOff, Phone, Eye, X } from 'lucide-react';

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

export default function MockFallPage() {
  // Fall detection state
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus | null>(null);
  const [alertedFalls, setAlertedFalls] = useState<Set<string>>(new Set());
  const [emergencyAlertShown, setEmergencyAlertShown] = useState(false);
  const [dismissedFalls, setDismissedFalls] = useState<Set<string>>(new Set());
  
  const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || '';

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

  // Poll emergency status every 5 seconds
  useEffect(() => {
    if (!streamBaseUrl) return;
    
    checkEmergencyStatus();
    const interval = setInterval(checkEmergencyStatus, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertedFalls, dismissedFalls]);

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
    // Navigate to videos page
    window.location.href = '/videos';
  };

  return (
    <div className="pb-8">
      <div className="relative z-10 pt-4 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Mock Fall Detection</h1>
      </div>

      {/* Fall Detection Alerts Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Fall Detection</h2>
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
    </div>
  );
}

