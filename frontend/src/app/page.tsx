'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Info, Wifi, WifiOff, Video, X, Loader2 } from 'lucide-react';

interface StreamStatus {
  status: 'available' | 'unavailable';
  camera_running: boolean;
  camera_type: 'picamera2' | 'opencv';
  has_frame: boolean;
  stream_url: string;
  message: string;
}

export default function HomePage() {
  const [isConnected, setIsConnected] = useState(false);
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamLoaded, setStreamLoaded] = useState(false);
  
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

  // Check status on mount and poll every 10 seconds
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


      {/* Alerts Section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Alerts</h2>
          <span className="text-xs text-gray-500">Live updates</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50">
            <div className="shrink-0"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-red-800">No critical alerts</p>
              <p className="text-xs text-red-700/80">Everything looks good right now.</p>
            </div>
          </div>
          {/* Placeholder alert items to be wired later */}
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