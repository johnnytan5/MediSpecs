'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';

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

export default function VideosPage() {
  const { token } = useAuth();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Videos</h1>
        <p className="text-sm text-gray-500 mt-1">Filter by date and time to find recordings.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-900">Date</label>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-900">Time from</label>
          <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-900">Time to</label>
          <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
        </div>
        <div className="sm:ml-auto">
          <button
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={() => { setSelectedDate(''); setTimeFrom(''); setTimeTo(''); }}
          >
            Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading videos…</div>
      ) : videos.length === 0 ? (
        <div className="text-sm text-gray-500">No videos found for the selected range.</div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => (
            <li 
              key={v.id} 
              className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
              onClick={() => playVideo(v)}
            >
              <div className="aspect-video bg-gray-100 relative group">
                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No thumbnail</div>
                )}
                {/* Play button overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  <div className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-0 h-0 border-l-[20px] border-l-blue-600 border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1"></div>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-900 truncate" title={v.title}>{v.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{formatTime(v.recordedAt)}{v.durationSec ? ` · ${Math.round(v.durationSec/60)} min` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
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


