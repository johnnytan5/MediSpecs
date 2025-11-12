'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X, Pencil, Brain, Sparkles } from 'lucide-react';
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
  const { token } = useAuth();
  const [items, setItems] = useState<CognitiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    if (!token) return;
    const userId = 'u_123';
    const authToken = token;
    async function loadItems() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchJson<ApiCognitiveItem[]>(`/cognitive?userId=${userId}`, { method: 'GET' }, authToken || undefined);
        const mapped = (Array.isArray(data) ? data : []).map(mapApiToItem);
        setItems(mapped);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load exercises');
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, [token]);

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
    if (!token) return;

    try {
      setError(null);
      const payload = {
        userId: 'u_123',
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
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save exercise');
    }
  }

  async function deleteItem(id: string) {
    if (!token) return;
    try {
      setError(null);
      const authToken = token || undefined;
      await fetchJson(`/cognitive/${id}`, { method: 'DELETE' }, authToken);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete exercise');
    }
  }

  return (
    <>
      {/* Header - Outside the dark background */}
      <div className="relative z-10 pt-4 pb-6 px-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white text-center">Cognitive Exercises</h1>
      </div>

      {/* Dark futuristic background section - Full width breakout */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900 overflow-hidden pb-20">
        {/* Animated background stars/particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400 rounded-full animate-pulse opacity-60" />
          <div className="absolute top-40 right-20 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse opacity-40" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-60 left-1/4 w-1 h-1 bg-cyan-300 rounded-full animate-pulse opacity-50" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-40 right-1/4 w-2 h-2 bg-indigo-400 rounded-full animate-pulse opacity-50" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-1/3 right-10 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse opacity-60" style={{ animationDelay: '2s' }} />
        </div>

        {error && (
          <div className="mx-4 mb-4 p-3 rounded-2xl border border-red-400/50 bg-red-500/20 backdrop-blur-sm text-red-200 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-3" />
            <p className="text-blue-200">Loading exercises…</p>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            {/* Central brain - empty state */}
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <Brain className="w-16 h-16 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <p className="text-lg text-blue-100 mb-2">No exercises yet</p>
            <p className="text-sm text-blue-300/70">Tap + to create your first question</p>
          </div>
        </div>
      ) : (
        <div className="relative flex items-center justify-center min-h-[70vh] px-4">
          {/* Central Glowing Brain */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Radial brainwave pulse rings */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-40 h-40 rounded-full border-2 border-blue-400/40 animate-[ping_2s_ease-out_infinite]" />
                <div className="absolute w-40 h-40 rounded-full border-2 border-purple-400/40 animate-[ping_2s_ease-out_infinite]" style={{ animationDelay: '0.4s' }} />
                <div className="absolute w-40 h-40 rounded-full border-2 border-cyan-400/40 animate-[ping_2s_ease-out_infinite]" style={{ animationDelay: '0.8s' }} />
                <div className="absolute w-40 h-40 rounded-full border-2 border-indigo-400/40 animate-[ping_2s_ease-out_infinite]" style={{ animationDelay: '1.2s' }} />
                <div className="absolute w-40 h-40 rounded-full border-2 border-violet-400/40 animate-[ping_2s_ease-out_infinite]" style={{ animationDelay: '1.6s' }} />
              </div>

              {/* Outer glow rings */}
              <div className="absolute inset-0 -m-20">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
              </div>
              <div className="absolute inset-0 -m-16">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
              </div>
              
              {/* Central brain icon */}
              <div className="relative z-10">
                <div className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-2xl shadow-purple-500/50 border-4 border-white/10 backdrop-blur-sm">
                  <Brain className="w-20 h-20 text-white animate-pulse" strokeWidth={1.5} />
                  {/* Sparkle effects */}
                  <Sparkles className="absolute top-2 right-2 w-6 h-6 text-cyan-300 animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <Sparkles className="absolute bottom-3 left-3 w-5 h-5 text-blue-300 animate-pulse" style={{ animationDelay: '0.7s' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Orbiting Question Widgets */}
          <div className="relative w-full max-w-4xl aspect-square">
            {sorted.map((item, index) => {
              const totalItems = sorted.length;
              const angle = (index / totalItems) * 360;
              const radius = 35; // percentage - closer to brain
              const x = 50 + radius * Math.cos((angle - 90) * (Math.PI / 180));
              const y = 50 + radius * Math.sin((angle - 90) * (Math.PI / 180));
              
              return (
                <div
                  key={item.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    animation: `float ${3 + index * 0.2}s ease-in-out infinite`,
                    animationDelay: `${index * 0.3}s`,
                  }}
                >
                  {/* Connecting line to center */}
                  <div 
                    className="absolute top-1/2 left-1/2 w-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent origin-left opacity-30"
                    style={{
                      width: `${radius * 2.5}px`,
                      transform: `rotate(${angle + 90}deg)`,
                    }}
                  />
                  
                  {/* Widget card */}
                  <div className="relative w-48 p-4 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-2xl hover:shadow-purple-500/30 hover:border-purple-400/40 hover:scale-110 transition-all duration-300">
                    <p className="text-sm text-white font-medium leading-relaxed mb-3 line-clamp-3">
                      {item.question}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-300/60">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/40 hover:text-white transition-all"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1.5 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/40 hover:text-white transition-all"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Floating Action Button */}
        <button
          onClick={openForm}
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-400/50 active:scale-95 transition-all duration-300 z-50"
          aria-label="Add exercise"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
        
        <style jsx>{`
          @keyframes float {
            0%, 100% {
              transform: translate(-50%, -50%) translateY(0px);
            }
            50% {
              transform: translate(-50%, -50%) translateY(-10px);
            }
          }
        `}</style>
      </div>

      {/* iOS-style Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-fadeIn"
            onClick={() => { setIsOpen(false); setEditingId(null); setQuestion(''); }}
          />
          
          {/* Modal Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
            <div className="bg-gradient-to-br from-blue-50/80 via-purple-50/60 to-white rounded-t-[32px] shadow-2xl max-w-2xl mx-auto border-t border-blue-100/50">
              {/* Pull bar */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-12 h-1.5 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full opacity-40" />
              </div>

              {/* Content */}
              <div className="px-6 pb-8">
                {/* Header with Brain Icon */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30 animate-fadeIn">
                    <Brain className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent mb-0.5">
                      {editingId ? 'Edit Exercise' : 'New Exercise'}
                    </h2>
                    <p className="text-sm text-gray-500">Train your mind with engaging questions</p>
                  </div>
                </div>

                <form onSubmit={addItem} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Question</label>
                    <textarea
                      className="w-full border-2 border-blue-100 rounded-3xl px-5 py-4 bg-white/80 backdrop-blur-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/50 focus:bg-white focus:shadow-lg focus:shadow-blue-100/50 transition-all duration-300 resize-none"
                      rows={4}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g. What did you have for breakfast today?"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      className="flex-1 px-5 py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.97] transition-all duration-200"
                      onClick={() => { setIsOpen(false); setEditingId(null); setQuestion(''); }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 text-white font-medium hover:from-blue-600 hover:via-blue-700 hover:to-purple-700 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      {editingId ? 'Update' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}


