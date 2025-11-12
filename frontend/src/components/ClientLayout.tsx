'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while auth is still loading from localStorage
    if (loading) return;
    
    // Only redirect to /auth if no token and not already on /auth page
    if (!token && pathname !== '/auth') {
      router.replace('/auth');
    }
  }, [token, loading, pathname, router]);

  const showNav = Boolean(token);
  const topPadding = showNav ? 'pt-16' : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-blue-900">
      {showNav && <BottomNav />}
      <main className={topPadding}>
        <div className="max-w-6xl mx-auto px-4">
          {children}
        </div>
      </main>
    </div>
  );
}


