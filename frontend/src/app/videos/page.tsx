'use client';

import { useEffect, useMemo, useState } from 'react';

type VideoItem = {
  id: string;
  title: string;
  recordedAt: string; // ISO datetime
  durationSec?: number;
  thumbnailUrl?: string;
  playbackUrl?: string; // optional if you just list
};

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

export default function VideosPage() {
  const [allVideos, setAllVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');

  useEffect(() => {
    async function fetchVideos() {
      try {
        const res = await fetch('/api/videos');
        if (!res.ok) throw new Error('Failed to fetch videos');
        const data: VideoItem[] = await res.json();
        const valid = Array.isArray(data) ? data : [];
        setAllVideos(valid);
      } catch (e: any) {
        setError(e?.message || 'Unable to load videos');
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  const filtered = useMemo(() => {
    if (!allVideos.length) return [];
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo) : null;

    return allVideos.filter(v => {
      const dt = new Date(v.recordedAt);
      if (isNaN(dt.getTime())) return false;

      // Date filter (inclusive)
      if (fromDate && dt < new Date(fromDate.setHours(0, 0, 0, 0))) return false;
      if (toDate && dt > new Date(new Date(toDate).setHours(23, 59, 59, 999))) return false;

      // Time-of-day filter
      if (timeFrom || timeTo) {
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        if (timeFrom && timeStr < timeFrom) return false;
        if (timeTo && timeStr > timeTo) return false;
      }
      return true;
    }).sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }, [allVideos, dateFrom, dateTo, timeFrom, timeTo]);

  return (
    <div className="pb-8">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Videos</h1>
        <p className="text-sm text-gray-500 mt-1">Filter by date and time to find recordings.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Date from</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Date to</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Time from</label>
          <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-800">Time to</label>
          <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500" />
        </div>
        <div className="sm:ml-auto">
          <button
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            onClick={() => { setDateFrom(''); setDateTo(''); setTimeFrom(''); setTimeTo(''); }}
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
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-500">No videos found for the selected range.</div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => (
            <li key={v.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="aspect-video bg-gray-100">
                {v.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No thumbnail</div>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-900 truncate" title={v.title}>{v.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{formatTime(v.recordedAt)}{v.durationSec ? ` · ${Math.round(v.durationSec/60)} min` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


