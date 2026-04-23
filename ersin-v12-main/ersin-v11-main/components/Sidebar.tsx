
import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const navItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: '🏠' },
    { id: AppView.VOICE, label: 'Voice Lounge', icon: '🎙️' },
    { id: AppView.IMAGE, label: 'Image Forge', icon: '🎨' },
    { id: AppView.VISION, label: 'Vision Lab', icon: '👁️' },
  ];

  return (
    <div className="w-64 h-full glass border-r border-gray-800 flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-bold gradient-text">Omaks Depo</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
              currentView === item.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
            }`}
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center p-3 rounded-lg bg-gray-900/50">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 mr-3" />
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold truncate">Senior Engineer</p>
            <p className="text-[10px] text-gray-500 truncate">Gemini AI Lab</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
