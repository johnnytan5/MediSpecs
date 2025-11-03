'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

type CognitiveItem = {
  id: string;
  question: string;
  createdAt: string;
};

const STORAGE_KEY = 'medispecs.cognitive';

function loadItems(): CognitiveItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CognitiveItem[]) : [];
  } catch {
    return [];
  }
}

function saveItems(items: CognitiveItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CognitivePage() {
  const [items, setItems] = useState<CognitiveItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    setItems(loadItems());
  }, []);

  useEffect(() => {
    saveItems(items);
  }, [items]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  function openForm() {
    setQuestion('');
    setIsOpen(true);
  }

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    const newItem: CognitiveItem = {
      id: generateId(),
      question: question.trim(),
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [newItem, ...prev]);
    setIsOpen(false);
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="pb-20 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Cognitive Exercises</h1>
          <p className="text-sm text-gray-500 mt-1">Create simple Q&A prompts for practice.</p>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-base">No exercises yet</p>
            <p className="text-sm mt-1">Tap + to add a question</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map(item => (
              <li key={item.id} className="group flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Added {new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <button
                  className="ml-4 text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                  onClick={() => deleteItem(item.id)}
                  aria-label="Delete exercise"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={openForm}
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-95 transition"
        aria-label="Add exercise"
      >
        <Plus size={24} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Add Exercise</h2>
                <p className="text-xs text-gray-500">Enter a question for practice.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-800">Question</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition"
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What did you have for breakfast today?"
                  required
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


