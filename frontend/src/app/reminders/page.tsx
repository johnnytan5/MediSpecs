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
  const { token, user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!token || !user?.userId) return;
    const userId = user.userId;
    const authToken = token;
    async function loadReminders() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<ApiReminder[]>(`/reminders?userId=${userId}`, { method: 'GET' }, authToken || undefined);
        const mapped = (Array.isArray(data) ? data : []).map(mapApiReminderToReminder);
        setReminders(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load reminders');
      } finally {
        setLoading(false);
      }
    }
    loadReminders();
  }, [token, user?.userId]);

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
    if (!token || !user?.userId) return;

    try {
      setError(null);
      const payload = {
        userId: user.userId,
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
    } catch (e: any) {
      setError(e?.message || 'Failed to create reminder');
    }
  }

  async function deleteReminder(id: string) {
    if (!token || !user?.userId) return;
    try {
      setError(null);
      const authToken = token || undefined;
      await fetchJson(`/reminders/${id}`, { method: 'DELETE' }, authToken);
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete reminder');
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

  return (
    <div className="pb-20 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Reminders</h1>
          <p className="text-sm text-gray-500 mt-1">Keep things on time with a simple schedule.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-base">Loading reminders…</p>
          </div>
        ) : sortedReminders.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-base">No reminders yet</p>
            <p className="text-sm mt-1">Tap + to create your first reminder</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedReminders.map((r) => (
              <li
                key={r.id}
                className="group flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEdit(r)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{r.title}</p>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      {r.time}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {r.repeat.type === 'daily' ? 'Daily' : `Weekly: ${r.repeat.daysOfWeek?.map(d => dayLabels[d]).join(', ')}`}
                  </p>
                  {r.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.notes}</p>}
                </div>
                <div className="ml-4 flex items-center gap-1">
                  <button
                    className="text-gray-400 hover:text-blue-700 p-2 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                    aria-label="Edit reminder"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                  className="ml-4 text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                  onClick={() => deleteReminder(r.id)}
                  aria-label="Delete reminder"
                >
                  <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Reminder</h2>
                <p className="text-xs text-gray-500">Set a time and how often it repeats.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-800">Title</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Take medication"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-800">Time</label>
                <input
                  type="time"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-800">Repeat</label>
                <div className="inline-flex p-1 rounded-xl border border-gray-200 bg-gray-50">
                  <button
                    type="button"
                    className={`px-3 py-2 rounded-lg text-sm transition ${repeatType === 'daily' ? 'bg-blue-600 text-white border border-blue-600 shadow' : 'text-gray-900 hover:text-gray-950'}`}
                    onClick={() => setRepeatType('daily')}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    className={`ml-1 px-3 py-2 rounded-lg text-sm transition ${repeatType === 'weekly' ? 'bg-blue-600 text-white border border-blue-600 shadow' : 'text-gray-900 hover:text-gray-950'}`}
                    onClick={() => setRepeatType('weekly')}
                  >
                    Weekly
                  </button>
                </div>
              </div>

              {repeatType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-800">Days of week</label>
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
                    <p className="text-xs text-red-600 mt-1">Select at least one day</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-800">Notes (optional)</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional details"
                />
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50" onClick={() => setIsOpen(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


