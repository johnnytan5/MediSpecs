'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const Model3D = dynamic(() => import('@/components/Model3D'), { ssr: false });

export default function AuthPage() {
  const { login, register, user } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<'intro' | 'login' | 'register'>('intro');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  // Auto-redirect after sign in
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        router.push('/');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  if (user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="text-center animate-fadeIn">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white mb-2">You are signed in</h1>
          <p className="text-sm text-purple-200">Signed in as {user.email}</p>
          <p className="text-xs text-purple-300 mt-3">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setRotateY(rotateY + deltaX * 0.5);
      setRotateX(rotateX - deltaY * 0.5);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    setDragStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      setRotateY(rotateY + deltaX * 0.5);
      setRotateX(rotateX - deltaY * 0.5);
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Intro screen
  if (view === 'intro') {
    return (
      <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-6">
        <div className="w-full max-w-lg text-center">
          <div className="mb-3 sm:mb-4 flex justify-center">
            <div 
              className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 cursor-grab active:cursor-grabbing select-none touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
                </div>
              }>
                <Model3D rotateX={rotateX} rotateY={rotateY} />
              </Suspense>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-purple-300 mb-4 sm:mb-6">Drag or touch to rotate</p>
          
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2 sm:mb-3">
            Remind AR
          </h1>
          <p className="text-base sm:text-lg text-purple-200 mb-8 sm:mb-12">
            Your daily AI companion
          </p>

          <div className="space-y-3 sm:space-y-4">
            <button
              onClick={() => {
                setMode('login');
                setView('login');
              }}
              className="w-full px-6 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium text-base sm:text-lg hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-[.98] transition cursor-pointer"
            >
              Login
            </button>
            
            <button
              onClick={() => {
                setMode('register');
                setView('register');
              }}
              className="w-full text-white hover:text-cyan-300 transition cursor-pointer"
            >
              <span className="text-xs sm:text-sm">First time user? </span>
              <span className="text-xs sm:text-sm font-semibold text-cyan-400 hover:text-cyan-300">Create an account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Login/Register form
  return (
    <div className="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-4 sm:mb-6">
          <button
            onClick={() => setView('intro')}
            className="text-cyan-400 hover:text-cyan-300 text-sm mb-3 sm:mb-4 inline-flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Remind AR</h1>
          <p className="text-xs sm:text-sm text-purple-200 mt-1">Sign in to continue</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl shadow-purple-500/20">
          <div className="inline-flex p-1 rounded-xl border border-purple-400/30 bg-white/10 backdrop-blur-xl mb-3 sm:mb-4 w-full">
            <button
              type="button"
              className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-300 ${mode === 'login' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/30 text-white font-medium' : 'text-white hover:bg-white/10'}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={`flex-1 ml-1 px-3 py-2 rounded-lg text-xs sm:text-sm transition-all duration-300 ${mode === 'register' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/30 text-white font-medium' : 'text-white hover:bg-white/10'}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-white">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 text-sm sm:text-base bg-white/10 backdrop-blur-xl text-white placeholder:text-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 transition"
                  placeholder="Your name"
                  required
                />
              </div>
            )}

            <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-white">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 text-sm sm:text-base bg-white/10 backdrop-blur-xl text-white placeholder:text-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 transition"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-medium mb-1 text-white">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-purple-400/30 rounded-xl px-3 py-2.5 text-sm sm:text-base bg-white/10 backdrop-blur-xl text-white placeholder:text-purple-300 focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-400 transition"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="p-3 rounded-xl border border-red-400/30 bg-gradient-to-br from-red-500/20 to-rose-500/10 backdrop-blur-xl text-white text-xs sm:text-sm shadow-lg shadow-red-500/20">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm sm:text-base font-medium hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-105 active:scale-[.99] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? 'Please wait…' : (mode === 'login' ? 'Login' : 'Create account')}
            </button>
          </form>
        </div>

        <p className="text-xs text-center text-purple-300 mt-3 sm:mt-4 px-2">By continuing, you agree to our Terms and Privacy Policy.</p>
      </div>
    </div>
  );
}


