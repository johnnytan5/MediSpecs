'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

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

const STORAGE_KEY = 'medispecs.reminders';

function loadReminders(): Reminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Reminder[];
  } catch {
    return [];
  }
}

function saveReminders(reminders: Reminder[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [repeatType, setRepeatType] = useState<RepeatType>('daily');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setReminders(loadReminders());
  }, []);

  useEffect(() => {
    saveReminders(reminders);
  }, [reminders]);

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
  }

  function toggleDay(dayIndex: number) {
    setSelectedDays(prev =>
      prev.includes(dayIndex)
        ? prev.filter(d => d !== dayIndex)
        : [...prev, dayIndex].sort()
    );
  }

  function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !time) return;
    if (repeatType === 'weekly' && selectedDays.length === 0) return;

    const newReminder: Reminder = {
      id: generateId(),
      title: title.trim(),
      time,
      repeat: repeatType === 'daily' ? { type: 'daily' } : { type: 'weekly', daysOfWeek: selectedDays },
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    setReminders(prev => [newReminder, ...prev]);
    setIsOpen(false);
  }

  function deleteReminder(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="pb-20 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Reminders</h1>
          <p className="text-sm text-gray-500 mt-1">Keep things on time with a simple schedule.</p>
        </div>

        {sortedReminders.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-base">No reminders yet</p>
            <p className="text-sm mt-1">Tap + to create your first reminder</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedReminders.map((r) => (
              <li
                key={r.id}
                className="group flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow"
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
                <button
                  className="ml-4 text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                  onClick={() => deleteReminder(r.id)}
                  aria-label="Delete reminder"
                >
                  <Trash2 size={18} />
                </button>
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
                    className={`px-3 py-2 rounded-lg text-sm transition ${repeatType === 'daily' ? 'bg-white shadow-sm border border-gray-200' : 'text-gray-600'}`}
                    onClick={() => setRepeatType('daily')}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    className={`ml-1 px-3 py-2 rounded-lg text-sm transition ${repeatType === 'weekly' ? 'bg-white shadow-sm border border-gray-200' : 'text-gray-600'}`}
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


