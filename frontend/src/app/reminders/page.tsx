'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';

type RepeatType = 'daily' | 'weekly';

type Reminder = {
  id: string;
  title: string;
  time: string; // HH:MM
  repeat: {
    type: RepeatType;
    daysOfWeek?: number[]; // 0-6 (Sun-Sat) for weekly
  };
  notes?: string;
  createdAt: string;
};

type ApiReminder = {
  PK?: string;
  SK?: string;
  reminderId?: string;
  title: string;
  scheduleType: 'daily' | 'weekly';
  timeOfDay?: string;
  daysOfWeek?: number[];
  deviceId?: string;
  createdAt?: string;
  updatedAt?: string;
};

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function mapApiReminderToReminder(api: ApiReminder): Reminder {
  const reminderId = api.reminderId || (api.SK ? api.SK.split('REMINDER#')[1] : '');
  return {
    id: reminderId,
    title: api.title,
    time: api.timeOfDay || '',
    repeat: {
      type: api.scheduleType,
      daysOfWeek: api.daysOfWeek || (api.scheduleType === 'weekly' ? [] : undefined),
    },
    notes: api.deviceId || undefined, // Using deviceId as notes for now, adjust if needed
    createdAt: api.createdAt || new Date().toISOString(),
  };
}

export default function RemindersPage() {
  const { token } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || '';

  // Helper function to trigger device webhook
  const triggerDeviceWebhook = async () => {
    if (!streamBaseUrl) return; // Silent skip if webhook URL not configured
    
    try {
      // Wait 500ms buffer for DynamoDB propagation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Trigger webhook with empty body
      await fetch(`${streamBaseUrl}/webhook/reminder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Silent success - no need to notify user
    } catch (error) {
      // Silent failure - device might be offline, which is fine
      console.log('Webhook notification skipped (device may be offline)');
    }
  };

  // Form state
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!token) return;
    const userId = 'u_123';
    const authToken = token;
    async function loadReminders() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<ApiReminder[]>(`/reminders?userId=${userId}`, { method: 'GET' }, authToken || undefined);
        const mapped = (Array.isArray(data) ? data : []).map(mapApiReminderToReminder);
        setReminders(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reminders');
      } finally {
        setLoading(false);
      }
    }
    loadReminders();
  }, [token]);

  const sortedReminders = useMemo(() => {
    return [...reminders].sort((a, b) => a.time.localeCompare(b.time));
  }, [reminders]);

  function resetForm() {
    setTitle('');
    setTime('');
    setRepeatType('daily');
    setSelectedDays([]);
    setNotes('');
  }

  function openForm() {
    resetForm();
    setIsOpen(true);
    setEditingId(null);
  }

  function toggleDay(dayIndex: number) {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !time) return;
    if (repeatType === 'weekly' && selectedDays.length === 0) return;
    if (!token) return;

    try {
      setError(null);
      const payload = {
        userId: 'u_123',
        title: title.trim(),
        scheduleType: repeatType,
        timeOfDay: time,
        daysOfWeek: repeatType === 'weekly' ? selectedDays : [],
        deviceId: notes.trim() || undefined,
      };
      const authToken = token || undefined;
      if (editingId) {
        // PATCH existing
        const patched = await fetchJson<ApiReminder>(`/reminders/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) }, authToken);
        const mapped = mapApiReminderToReminder(patched);
        setReminders(prev => prev.map(r => r.id === editingId ? mapped : r));
      } else {
        // POST new
        const apiReminder = await fetchJson<ApiReminder>(`/reminders`, { method: 'POST', body: JSON.stringify(payload) }, authToken);
        const mapped = mapApiReminderToReminder(apiReminder);
        setReminders(prev => [mapped, ...prev]);
      }
      setIsOpen(false);
      resetForm();
      setEditingId(null);
      
      // Trigger device webhook after successful create/update
      triggerDeviceWebhook();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create reminder');
    }
  }

  async function deleteReminder(id: string) {
    if (!token) return;
    try {
      setError(null);
      const authToken = token || undefined;
      await fetchJson(`/reminders/${id}`, { method: 'DELETE' }, authToken);
      setReminders(prev => prev.filter(r => r.id !== id));
      
      // Trigger device webhook after successful delete
      triggerDeviceWebhook();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete reminder');
    }
  }

  function openEdit(rem: Reminder) {
    setEditingId(rem.id);
    setTitle(rem.title);
    setTime(rem.time);
    setRepeatType(rem.repeat.type);
    setSelectedDays(rem.repeat.type === 'weekly' ? (rem.repeat.daysOfWeek || []) : []);
    setNotes(rem.notes || '');
    setIsOpen(true);
  }

  // Generate week days around today (3 before, today, 3 after)
  const today = new Date();
  const weekDays = [];
  for (let i = -3; i <= 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    weekDays.push({
      date: date.getDate(),
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      isToday: i === 0,
    });
  }

  return (
    <div className="pb-20 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="relative z-10 pt-4 pb-6 px-4">
          <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Reminder Schedule</h1>
        </div>

        {/* Weekly Calendar */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {weekDays.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <span className="text-xs text-purple-300 font-medium">{day.dayName}</span>
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base transition-all duration-300 ${
                  day.isToday
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/40'
                    : 'bg-white/10 backdrop-blur-xl text-white border border-white/20 hover:bg-white/20'
                }`}
              >
                {day.date}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-2xl border border-red-400/30 bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-xl text-red-200 text-sm shadow-lg">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-white mt-20">
            <p className="text-base">Loading reminders…</p>
          </div>
        ) : sortedReminders.length === 0 ? (
          <div className="text-center text-white mt-20">
            <p className="text-base">No reminders yet</p>
            <p className="text-sm mt-1">Tap + to create your first reminder</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedReminders.map((r, index) => (
              <div key={r.id} className="flex gap-4">
                {/* Timeline - Left side */}
                <div className="flex flex-col items-end w-20 shrink-0 pt-1">
                  <time className="text-lg font-semibold text-white">{r.time}</time>
                </div>
                
                {/* Timeline connector */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 mt-2 shadow-lg shadow-cyan-500/50"></div>
                  {index < sortedReminders.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-cyan-500/50 to-purple-500/30 mt-2"></div>
                  )}
                </div>

                {/* Task widget - Right side - Crystal Glass */}
                <div className="flex-1 pb-6">
                  <div 
                    className="group rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl shadow-2xl shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => openEdit(r)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-base mb-1">{r.title}</h3>
                          {r.notes && (
                            <p className="text-sm text-purple-200/90 leading-relaxed">{r.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            className="text-purple-300 hover:text-cyan-400 p-2 rounded-xl hover:bg-cyan-500/20 border border-transparent hover:border-cyan-400/30 transition-all"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                            aria-label="Edit reminder"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            className="text-purple-300 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all"
                            onClick={(e) => { e.stopPropagation(); deleteReminder(r.id); }}
                            aria-label="Delete reminder"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={openForm}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-95 transition"
        aria-label="Add reminder"
      >
        <Plus size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-[2px] animate-fadeIn">
          <div className="w-full bg-gradient-to-br from-blue-100 via-purple-50 to-white rounded-t-[2.5rem] shadow-2xl animate-slideUp max-h-[90vh] overflow-y-auto">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-gray-300"></div>
            </div>

            <form onSubmit={addReminder} className="px-6 pb-8 space-y-5">
              {/* Task Name */}
              <div>
                <input
                  type="text"
                  className="w-full border-0 border-b-2 border-gray-300 bg-transparent px-0 py-3 text-gray-800 text-lg placeholder:text-gray-500 focus:outline-none focus:border-gray-400 transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Name your task here..."
                  required
                />
              </div>

              {/* Date & Time and Repeat in same row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Date & Time */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700">Date & Time</label>
                  <input
                    type="time"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                  />
                </div>

                {/* Repeat Toggle Switch */}
                <div className="bg-white/80 backdrop-blur rounded-2xl p-4">
                  <label className="block text-sm font-medium mb-3 text-gray-700">Repeat</label>
                  <div className="flex items-center justify-between">
                    <span className={`font-medium transition ${repeatType === 'daily' ? 'text-blue-600 text-base' : 'text-gray-500 text-sm'}`}>
                      Daily
                    </span>
                    <button
                      type="button"
                      onClick={() => setRepeatType(repeatType === 'daily' ? 'weekly' : 'daily')}
                      className={`relative w-14 h-7 rounded-full transition-colors ${repeatType === 'daily' ? 'bg-blue-600' : 'bg-blue-600'}`}
                    >
                      <div
                        className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${repeatType === 'weekly' ? 'translate-x-7' : 'translate-x-0'}`}
                      ></div>
                    </button>
                    <span className={`font-medium transition ${repeatType === 'weekly' ? 'text-blue-600 text-base' : 'text-gray-500 text-sm'}`}>
                      Weekly
                    </span>
                  </div>
                </div>
              </div>

              {/* Days of week for weekly repeat */}
              {repeatType === 'weekly' && (
                <div className="bg-white/80 backdrop-blur rounded-2xl p-4">
                  <label className="block text-sm font-medium mb-3 text-gray-700">Days of week</label>
                  <div className="grid grid-cols-7 gap-2">
                    {dayLabels.map((label, idx) => (
                      <button
                        key={label}
                        type="button"
                        className={`px-0 py-2 rounded-full border text-xs leading-none h-9 transition ${selectedDays.includes(idx) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        onClick={() => toggleDay(idx)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {selectedDays.length === 0 && (
                    <p className="text-xs text-red-600 mt-2">Select at least one day</p>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="bg-white/80 backdrop-blur rounded-2xl p-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Description (Optional)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional details..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white/80 text-gray-700 font-medium hover:bg-white transition" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-lg transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


