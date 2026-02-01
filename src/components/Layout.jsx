import React, { useState, useEffect } from 'react';
import { BookOpen, BarChart2, Shield, Zap, Menu, X, Brain, NotebookPen, Library, Flag } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const [isMigraineMode, setMigraineMode] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Toggle Logic
  const toggleMigraineMode = () => {
    setMigraineMode(!isMigraineMode);
    if (!isMigraineMode) {
      document.body.classList.add('bg-migraine-dark', 'text-gray-200');
    } else {
      document.body.classList.remove('bg-migraine-dark', 'text-gray-200');
    }
  };

  const navItems = [
    { name: 'War Room', icon: Shield, path: '/' },
    { name: 'Tasks', icon: BookOpen, path: '/tasks' },
    { name: 'Roadmap', icon: Flag, path: '/roadmap' },
    { name: 'Analytics', icon: BarChart2, path: '/analytics' },
    { name: 'AI Coach', icon: Brain, path: '/coach' },
    { name: 'Library', icon: Library, path: '/library' },
    { name: 'Journal', icon: NotebookPen, path: '/journal' },
  ];

  return (
    <div className={`min-h-screen flex transition-colors duration-500 ${isMigraineMode ? 'bg-[#0f172a] text-gray-100' : 'bg-slate-50 text-gray-900'}`}>
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isMigraineMode ? 'bg-[#1e293b] border-r border-gray-700' : 'bg-white border-r border-gray-200'}`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            <span>IAS Archi Bhattaroy</span>
          </h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>

        <nav className="px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                location.pathname === item.path
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'hover:bg-gray-100/10'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Migraine Toggle at Bottom */}
        <div className="absolute bottom-6 left-0 right-0 px-4">
          <button
            onClick={toggleMigraineMode}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
              isMigraineMode
                ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            <Zap className="w-5 h-5" />
            {isMigraineMode ? 'Disable Migraine Mode' : 'Migraine Mode'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen">
        <header className="p-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg bg-white shadow">
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
        </header>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}