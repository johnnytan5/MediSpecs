'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mb-2">You are signed in</h1>
        <p className="text-sm text-gray-600">Signed in as {user.email}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">MediSpecs</h1>
          <p className="text-sm text-gray-700 mt-1">Sign in to continue</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white/60 backdrop-blur p-5 shadow-sm">
          <div className="inline-flex p-1 rounded-xl border border-gray-200 bg-gray-50 mb-4 w-full">
            <button
              type="button"
              className={`flex-1 px-3 py-2 rounded-lg text-sm transition ${mode === 'login' ? 'bg-white shadow-sm border border-gray-200 text-gray-900 font-medium' : 'text-gray-900 hover:text-gray-950'}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 ml-1 px-3 py-2 rounded-lg text-sm transition ${mode === 'register' ? 'bg-white shadow-sm border border-gray-200 text-gray-900 font-medium' : 'text-gray-900 hover:text-gray-950'}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-800">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-gray-900">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 bg-white text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-[.99] transition disabled:opacity-60"
            >
              {loading ? 'Please wait…' : (mode === 'login' ? 'Login' : 'Create account')}
            </button>
          </form>
        </div>

        <p className="text-xs text-center text-gray-700 mt-4">By continuing, you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  );
}


