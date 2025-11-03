'use client';

import { AlertTriangle, Info } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="pb-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Home</h1>
        <p className="text-sm text-gray-500 mt-1">Quick overview at a glance.</p>
      </div>

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