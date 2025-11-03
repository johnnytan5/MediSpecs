'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  MessageCircle, 
  Bell, 
  MapPin, 
  Video, 
  Brain,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const BottomNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { id: 0, name: 'Chat', icon: MessageCircle, path: '/' },
    { id: 1, name: 'Reminders', icon: Bell, path: '/reminders' },
    { id: 2, name: 'Location', icon: MapPin, path: '/location' },
    { id: 3, name: 'Videos', icon: Video, path: '/videos' },
    { id: 4, name: 'Cognitive', icon: Brain, path: '/cognitive' },
    { id: 5, name: 'Profile', icon: User, path: '/profile' },
  ];

  useEffect(() => {
    const currentTab = tabs.find(tab => tab.path === pathname);
    if (currentTab) {
      setActiveTab(currentTab.id);
    }
  }, [pathname]);

  const handleTabClick = (tab: typeof tabs[0]) => {
    setActiveTab(tab.id);
    router.push(tab.path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur border-b border-gray-200 z-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-14 flex items-center justify-between">
          <div className="text-base font-semibold text-gray-900">MediSpecs</div>
          <div className="flex items-center gap-1 sm:gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline font-medium">{tab.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => logout().then(() => router.push('/auth'))}
              className="ml-2 inline-flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
