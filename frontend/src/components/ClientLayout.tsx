'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!token && pathname !== '/auth') {
      router.replace('/auth');
    }
  }, [token, pathname, router]);

  const showNav = Boolean(token);
  const topPadding = showNav ? 'pt-16' : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && <BottomNav />}
      <main className={topPadding}>
        <div className="max-w-6xl mx-auto px-4">
          {children}
        </div>
      </main>
    </div>
  );
}


