'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchJson } from '@/lib/api';

type CognitiveItem = {
  id: string;
  question: string;
  createdAt: string;
};

type ApiCognitiveItem = {
  PK?: string;
  SK?: string;
  exerciseId?: string;
  question: string;
  category?: string;
  difficulty?: string;
  createdAt?: string;
  updatedAt?: string;
};

function mapApiToItem(api: ApiCognitiveItem): CognitiveItem {
  const exerciseId = api.exerciseId || (api.SK ? api.SK.split('COG#')[1] : '');
  return {
    id: exerciseId,
    question: api.question,
    createdAt: api.createdAt || new Date().toISOString(),
  };
}

export default function CognitivePage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState<CognitiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (!token || !user?.userId) return;
    const userId = user.userId;
    const authToken = token;
    async function loadItems() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<ApiCognitiveItem[]>(`/cognitive?userId=${userId}`, { method: 'GET' }, authToken || undefined);
        const mapped = (Array.isArray(data) ? data : []).map(mapApiToItem);
        setItems(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load exercises');
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, [token, user?.userId]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  function openForm() {
    setQuestion('');
    setEditingId(null);
    setIsOpen(true);
  }

  function openEdit(item: CognitiveItem) {
    setEditingId(item.id);
    setQuestion(item.question);
    setIsOpen(true);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    if (!token || !user?.userId) return;

    try {
      setError(null);
      const payload = {
        userId: user.userId,
        question: question.trim(),
      };
      const authToken = token || undefined;
      if (editingId) {
        // PATCH existing
        const patched = await fetchJson<ApiCognitiveItem>(`/cognitive/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) }, authToken);
        const mapped = mapApiToItem(patched);
        setItems(prev => prev.map(i => i.id === editingId ? mapped : i));
      } else {
        // POST new
        const apiItem = await fetchJson<ApiCognitiveItem>(`/cognitive`, { method: 'POST', body: JSON.stringify(payload) }, authToken);
        const mapped = mapApiToItem(apiItem);
        setItems(prev => [mapped, ...prev]);
      }
      setIsOpen(false);
      setQuestion('');
      setEditingId(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to save exercise');
    }
  }

  async function deleteItem(id: string) {
    if (!token || !user?.userId) return;
    try {
      setError(null);
      const authToken = token || undefined;
      await fetchJson(`/cognitive/${id}`, { method: 'DELETE' }, authToken);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete exercise');
    }
  }

  return (
    <div className="pb-20 pt-2">
      <div className="max-w-3xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Cognitive Exercises</h1>
          <p className="text-sm text-gray-500 mt-1">Create simple Q&A prompts for practice.</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 mt-20">
            <p className="text-base">Loading exercises…</p>
          </div>
        ) : sorted.length === 0 ? (
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
                <div className="ml-4 flex items-center gap-1">
                  <button
                    className="text-gray-400 hover:text-blue-700 p-2 rounded-xl hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-colors"
                    onClick={() => openEdit(item)}
                    aria-label="Edit exercise"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="text-gray-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
                    onClick={() => deleteItem(item.id)}
                    aria-label="Delete exercise"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
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
                <h2 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Exercise' : 'Add Exercise'}</h2>
                <p className="text-xs text-gray-500">Enter a question for practice.</p>
              </div>
              <button
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                onClick={() => { setIsOpen(false); setEditingId(null); setQuestion(''); }}
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
                <button type="button" className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50" onClick={() => { setIsOpen(false); setEditingId(null); setQuestion(''); }}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


