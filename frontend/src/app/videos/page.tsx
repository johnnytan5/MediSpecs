'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';
import { Grid3x3, List, Table } from 'lucide-react';

type VideoItem = {
  id: string;
  title: string;
  recordedAt: string; // ISO datetime
  durationSec?: number;
  thumbnailUrl?: string;
  playbackUrl?: string; // optional if you just list
};

type ApiVideo = {
  PK?: string;
  SK?: string;
  videoId?: string;
  title: string;
  recordedAt: string;
  durationSec?: number;
  s3Key?: string;
  s3Bucket?: string;
  thumbnailS3Key?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type PlaybackUrlResponse = {
  playbackUrl: string;
  s3Key: string;
  expiresIn: number;
};

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function mapApiVideoToVideoItem(api: ApiVideo): VideoItem {
  // SK format is: VIDEO#{recordedAtIso}#{videoId}
  // So we need to split by # and take the last part
  let videoId = api.videoId;
  if (!videoId && api.SK) {
    const parts = api.SK.split('#');
    if (parts.length >= 3) {
      videoId = parts[2]; // Third part is the videoId
    }
  }
  if (!videoId) {
    videoId = 'unknown';
  }
  
  return {
    id: videoId,
    title: api.title || 'Video Recording',
    recordedAt: api.recordedAt || api.createdAt || new Date().toISOString(),
    durationSec: api.durationSec,
    // Note: thumbnailUrl and playbackUrl will be fetched on-demand when needed
    // For now, we can show a placeholder or fetch them when video is clicked
    thumbnailUrl: undefined,
    playbackUrl: undefined,
  };
}

type ViewMode = 'gallery' | 'list' | 'table';

export default function VideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');

  // Filters
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');

  // Video playback
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loadingPlayback, setLoadingPlayback] = useState(false);

  useEffect(() => {
    if (!token) return;
    
    async function fetchVideos() {
      try {
        setLoading(true);
        setError(null);
        
        const userId = 'u_123'; // demo: shared user
        const authToken = token;
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('userId', userId);
        if (selectedDate) {
          params.append('dateFrom', selectedDate);
          params.append('dateTo', selectedDate);
        }
        if (timeFrom) params.append('timeFrom', timeFrom);
        if (timeTo) params.append('timeTo', timeTo);
        
        const data = await fetchJson<ApiVideo[]>(
          `/videos?${params.toString()}`,
          { method: 'GET' },
          authToken || undefined
        );
        
        const valid = Array.isArray(data) ? data : [];
        const mapped = valid.map(mapApiVideoToVideoItem);
        setVideos(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }
    
    fetchVideos();
  }, [token, selectedDate, timeFrom, timeTo]);

  // Function to fetch playback URL and play video
  const playVideo = async (video: VideoItem) => {
    setSelectedVideo(video);
    setLoadingPlayback(true);
    setPlaybackUrl(null);

    try {
      const userId = 'u_123'; // demo: shared user
      const response = await fetchJson<PlaybackUrlResponse>(
        `/videos/${video.id}/playback-url?userId=${userId}`,
        { method: 'GET' },
        token || undefined
      );
      setPlaybackUrl(response.playbackUrl);
    } catch (e) {
      console.error('Failed to fetch playback URL:', e);
      alert('Failed to load video. Please try again.');
      setSelectedVideo(null);
    } finally {
      setLoadingPlayback(false);
    }
  };

  const closePlayer = () => {
    setSelectedVideo(null);
    setPlaybackUrl(null);
  };

  return (
    <div className="pb-8">
      <div className="relative z-10 pt-4 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Videos</h1>
      </div>

      {/* Filters - Crystal Glass */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4 p-4 rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-xl">
        <div>
          <label className="block text-sm font-semibold mb-1 text-white">Date</label>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full border border-purple-400/30 rounded-2xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white placeholder:text-purple-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 [color-scheme:dark]" 
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-white">Time from</label>
          <input 
            type="time" 
            value={timeFrom} 
            onChange={(e) => setTimeFrom(e.target.value)} 
            className="w-full border border-purple-400/30 rounded-2xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 [color-scheme:dark]" 
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-white">Time to</label>
          <input 
            type="time" 
            value={timeTo} 
            onChange={(e) => setTimeTo(e.target.value)} 
            className="w-full border border-purple-400/30 rounded-2xl px-3 py-2.5 bg-white/10 backdrop-blur-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 [color-scheme:dark]" 
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div className="sm:ml-auto">
          <button
            className="px-4 py-2.5 rounded-2xl border border-purple-400/30 text-white hover:bg-white/10 transition-all"
            onClick={() => { setSelectedDate(''); setTimeFrom(''); setTimeTo(''); }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className="mb-4 flex items-center justify-end gap-2 px-2">
        <span className="text-sm text-purple-200 mr-2">View:</span>
        <div className="inline-flex rounded-2xl border border-purple-400/30 bg-white/10 backdrop-blur-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('gallery')}
            className={`p-2 rounded-xl transition-all duration-300 ${
              viewMode === 'gallery'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
            title="Gallery View"
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-all duration-300 ${
              viewMode === 'list'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl transition-all duration-300 ${
              viewMode === 'table'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                : 'text-purple-200 hover:text-white hover:bg-white/10'
            }`}
            title="Table View"
          >
            <Table className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-2xl border border-red-400/30 bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl text-red-200 text-sm shadow-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-white">Loading videos…</div>
      ) : videos.length === 0 ? (
        <div className="text-sm text-white">No videos found for the selected range.</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {videos.map(v => (
              <li 
                key={v.id} 
                className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                onClick={() => playVideo(v)}
              >
                {/* Play Button Icon */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <div className="w-0 h-0 border-l-[14px] border-l-gray-400 group-hover:border-l-white border-t-[9px] border-t-transparent border-b-[9px] border-b-transparent ml-1 transition-colors"></div>
                  </div>
                </div>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{v.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                    <span>{formatTime(v.recordedAt)}</span>
                    {v.durationSec && (
                      <>
                        <span className="text-gray-400">•</span>
                        <span>{Math.floor(v.durationSec / 60)}:{String(Math.floor(v.durationSec % 60)).padStart(2, '0')}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0 text-gray-400 group-hover:text-blue-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closePlayer}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedVideo.title}</h2>
                <p className="text-sm text-gray-500">{formatTime(selectedVideo.recordedAt)}</p>
              </div>
              <button 
                onClick={closePlayer}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Video Player */}
            <div className="p-4">
              {loadingPlayback ? (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <div className="text-gray-500">Loading video...</div>
                </div>
              ) : playbackUrl ? (
                <video 
                  controls 
                  autoPlay
                  className="w-full rounded-lg bg-black"
                  key={playbackUrl}
                >
                  <source src={playbackUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  <div className="text-red-500">Failed to load video</div>
                </div>
              )}
            </div>

            {/* Video Info */}
            {selectedVideo.durationSec && (
              <div className="px-4 pb-4">
                <p className="text-sm text-gray-600">
                  Duration: {Math.floor(selectedVideo.durationSec / 60)}:{String(Math.floor(selectedVideo.durationSec % 60)).padStart(2, '0')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


