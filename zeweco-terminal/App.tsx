
import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  ChevronDown,
  AlertCircle,
  Calendar,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Bell,
  LayoutGrid,
  LogOut,
  Shield,
  Activity,
  Sun,
  Moon,
  Filter,
  Check,
  User as UserIcon,
  Users,
  X
} from 'lucide-react';
import { Business, FilterType, User } from './types';
import { BUSINESS_DATA } from './constants';
import { api } from './src/api/client';
import { StageBadge, StatusPill } from './components/Badge';
import { RouteLine } from './components/RouteLine';
import { DetailDrawer } from './components/DetailDrawer';
import { Login } from './components/Login';
import { ManagerWorkspace } from './components/ManagerWorkspace';
import { MemberManagement } from './components/MemberManagement';

const DEFAULT_MANAGERS: User[] = [
  {
    id: 'mgr-101',
    name: 'Kirtii Sharma',
    role: 'Manager',
    email: 'kirtii@zeweco.ai',
    avatar: 'https://i.pravatar.cc/150?u=kirtii',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'mgr-102',
    name: 'Juhi',
    role: 'Manager',
    email: 'juhi@zeweco.ai',
    avatar: 'https://i.pravatar.cc/150?u=juhi',
    lastLogin: new Date().toISOString()
  }
];

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('terminal_theme');
    if (saved) return saved as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]); // Initial state empty
  const [managers, setManagers] = useState<User[]>(DEFAULT_MANAGERS); // Keep managers mock for now as they aren't in API yet fully

  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isInitializing, setIsInitializing] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const filterMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Fetch businesses on mount
  const refreshBusinesses = async () => {
    try {
      const data = await api.getBusinesses();
      setBusinesses(data);
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
    }
  };

  useEffect(() => {
    refreshBusinesses();
  }, []);

  // Sync theme with document and localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('terminal_theme', theme);
  }, [theme]);

  // Handle outside click for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persistence: Check localStorage for session on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('terminal_session');
    if (savedSession) {
      try {
        const user = JSON.parse(savedSession);
        setCurrentUser(user);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem('terminal_session');
      }
    }

    const timer = setTimeout(() => setIsInitializing(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (userOrEmail: User | string) => {
    if (typeof userOrEmail === 'string') {
      // This path coming from Login component probably needs adjustment
      // For now assuming Login component passes the User object or we change Login component to use api.login returns User
      try {
        // If Login component was updated to call api.login, it would pass User. 
        // If it passes string (email) we need to call api.login here.
        // But let's assume Login component will handle the API call and pass the User object up, 
        // OR we update Login to pass email and we call API here.
        // Let's go with updating Login component to use API and pass result here.
        // Wait, the Login component signature is `onLogin: (user: User) => void`. 
        // So we just need to update Login component.
      } catch (e) {
        alert('Login failed');
      }
    } else {
      setCurrentUser(userOrEmail);
      setIsAuthenticated(true);
      localStorage.setItem('terminal_session', JSON.stringify(userOrEmail));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('terminal_session');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const updateBusiness = (updated: Business) => {
    setBusinesses(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const addManager = (manager: User) => {
    setManagers(prev => [...prev, manager]);
  };

  const deleteManager = (id: string) => {
    setManagers(prev => prev.filter(m => m.id !== id));
  };

  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    // Role based filtering
    if (currentUser?.role === 'Manager') {
      result = result.filter(b => b.responsible?.toUpperCase() === currentUser.name.toUpperCase());
    }

    if (search) {
      result = result.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.code.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (filter === 'Red') result = result.filter(b => b.health === 'Red');
    if (filter === 'Stale') result = result.filter(b => b.status === 'Stale');
    if (filter === 'Green') result = result.filter(b => b.health === 'Green');
    if (filter === 'Due Soon') result = result.filter(b => b.status === 'At Risk');

    result.sort((a, b) => {
      const getPriority = (item: Business) => {
        if (item.status === 'Overdue') return 0;
        if (item.health === 'Red') return 1;
        if (item.status === 'Stale') return 2;
        if (item.status === 'At Risk') return 3;
        return 4;
      };
      return getPriority(a) - getPriority(b);
    });

    return result;
  }, [businesses, filter, search, currentUser]);

  const stats = useMemo(() => ({
    total: filteredBusinesses.length,
    redAlerts: filteredBusinesses.filter(b => b.health === 'Red' || b.status === 'Overdue').length,
    stale: filteredBusinesses.filter(b => b.status === 'Stale').length,
    dueSoon: filteredBusinesses.filter(b => b.status === 'At Risk').length,
  }), [filteredBusinesses]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <Activity className="text-zinc-400 dark:text-zinc-500 animate-pulse" size={32} />
          <p className="text-zinc-500 dark:text-zinc-600 text-[10px] font-mono uppercase tracking-[0.3em]">Establishing Uplink...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors duration-300 selection:bg-blue-500/30 overflow-hidden">
      {/* Sticky Top Bar */}
      <header className="flex-none bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-900 px-6 py-3 transition-colors duration-300 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-800 rounded border border-zinc-800 dark:border-zinc-700 flex items-center justify-center">
              <span className="text-xs font-bold text-white tracking-widest">BT</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent leading-none uppercase">
                {currentUser?.role === 'CXO' ? 'ZEWECO TERMINAL' : 'MANAGER WORKSPACE'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Shield size={10} className="text-green-600 dark:text-green-500" />
                <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Secure Session: {currentUser?.id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Search and Members - Side by Side */}
            <div className="flex items-center gap-2 mr-2">
              {currentUser?.role === 'CXO' && (
                <button
                  onClick={() => setIsMembersOpen(true)}
                  className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all ${isMembersOpen ? 'bg-blue-50 border-blue-200 text-blue-500 dark:bg-blue-900/20 dark:border-blue-800' : ''}`}
                  title="Team Management"
                >
                  <Users size={14} />
                </button>
              )}

              <div className={`flex items-center transition-all duration-300 ease-in-out ${isSearchExpanded ? 'w-64' : 'w-10'}`}>
                <div className="relative w-full flex items-center">
                  {isSearchExpanded ? (
                    <>
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search entities..."
                        className="w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-3 pr-10 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-zinc-600 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      <button onClick={() => { setIsSearchExpanded(false); setSearch(''); }} className="absolute right-2 text-zinc-400 hover:text-zinc-900"><X size={14} /></button>
                    </>
                  ) : (
                    <button onClick={() => setIsSearchExpanded(true)} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all"><Search size={14} /></button>
                  )}
                </div>
              </div>
            </div>

            <button onClick={toggleTheme} className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <div className="text-right border-r border-zinc-200 dark:border-zinc-800 pr-6 mr-6 hidden md:block transition-colors">
              <div className="text-sm font-medium text-zinc-800 dark:text-zinc-300">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">{currentUser?.name}</p>
                <p className="text-[10px] text-zinc-500 font-medium">{currentUser?.role}</p>
              </div>
              <div className="relative group">
                <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 p-0.5 overflow-hidden transition-all group-hover:border-blue-400 cursor-pointer">
                  <img src={currentUser?.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                </div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right group-hover:translate-y-0 translate-y-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-500 hover:bg-red-500/5 transition-colors text-left"><LogOut size={14} />Logout</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        {currentUser?.role === 'Manager' ? (
          <ManagerWorkspace
            businesses={filteredBusinesses}
            currentUser={currentUser}
            onUpdateBusiness={updateBusiness}
          />
        ) : (
          <div className="h-full overflow-y-auto px-6 py-6 max-w-[1440px] mx-auto">
            {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                { label: 'Managed Assets', val: stats.total, color: 'text-zinc-800 dark:text-zinc-300', icon: LayoutGrid },
                { label: 'Critical Risks', val: stats.redAlerts, color: 'text-red-600 dark:text-red-500', icon: AlertCircle, trend: '2 increased' },
                { label: 'Pending Updates', val: stats.stale, color: 'text-orange-600 dark:text-orange-500', icon: Clock },
                { label: 'Strategic Deadlines', val: stats.dueSoon, color: 'text-blue-600 dark:text-blue-500', icon: Calendar },
              ].map((card, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 py-2.5 px-4 rounded-xl hover:border-blue-400 dark:hover:border-zinc-700 transition-all group relative overflow-hidden shadow-sm dark:shadow-none">
                  <div className="flex justify-between items-start relative z-10">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none">{card.label}</p>
                      <p className={`text-2xl font-bold font-mono ${card.color} leading-tight`}>{card.val}</p>
                    </div>
                    <div className="p-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 text-zinc-400 group-hover:text-blue-500 transition-colors">
                      <card.icon size={16} />
                    </div>
                  </div>
                  {card.trend && (
                    <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-red-500/80 uppercase">
                      <ArrowUpRight size={8} /> {card.trend}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-900 rounded-xl overflow-hidden shadow-xl dark:shadow-2xl transition-all duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                  <thead className="bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-900">
                    <tr className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                      <th className="px-4 py-3 w-[18%]">Business Entity</th>
                      <th className="px-4 py-3 w-[8%]">Status</th>
                      <th className="px-4 py-3 w-[26%]">Route Map (Health Blinking)</th>
                      <th className="px-4 py-3 w-[10%]">Responsible</th>
                      <th className="px-4 py-3 w-[14%]">Next Deliverable</th>
                      <th className="px-4 py-3 w-[7%]">ETA</th>
                      <th className="px-4 py-3 w-[7%]">Latency</th>
                      <th className="px-4 py-3 w-[10%]">Stage</th>
                      <th className="w-[4%]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBusinesses.map((biz) => {
                      const isOverdue = biz.status === 'Overdue';
                      const isStale = biz.status === 'Stale';
                      return (
                        <tr
                          key={biz.id}
                          onClick={() => setSelectedBusiness(biz)}
                          className={`group cursor-pointer border-b border-zinc-100 dark:border-zinc-900/50 hover:bg-blue-50 dark:hover:bg-zinc-900/40 transition-all ${isStale ? 'bg-orange-500/[0.02]' : 'odd:bg-zinc-50/30 dark:odd:bg-zinc-950/20'}`}
                          style={{ height: '60px' }}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 group-hover:border-blue-400 transition-colors">
                                {biz.code.substring(0, 2)}
                              </div>
                              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-none">{biz.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3"><StatusPill status={biz.status} /></td>
                          <td className="px-4 py-3"><RouteLine progress={biz.routeProgress} health={biz.health} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <UserIcon size={10} className="text-zinc-400" />
                              <p className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 truncate tracking-tight">{biz.responsible}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3"><p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate max-w-full" title={biz.nextMilestone}>{biz.nextMilestone}</p></td>
                          <td className="px-4 py-3"><span className={`text-[11px] font-medium ${isOverdue ? 'text-red-500' : 'text-zinc-600 dark:text-zinc-300'}`}>{biz.eta}</span></td>
                          <td className="px-4 py-3"><span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">{biz.updated}</span></td>
                          <td className="px-4 py-3"><StageBadge stage={biz.stage} /></td>
                          <td className="pr-4 text-right"><ChevronRight size={14} className="text-zinc-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-zinc-400 dark:text-zinc-600 font-mono uppercase tracking-widest px-2">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Nominal</span>
                <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Critical</span>
              </div>
              <div>Terminal Connection: Secure • Uptime: 99.99% • System: BT-OS 4.2</div>
            </div>
          </div>
        )}
      </div>

      <DetailDrawer
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
      />

      <MemberManagement
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        managers={managers}
        onAddManager={addManager}
        onDeleteManager={deleteManager}
      />
    </div>
  );
};

export default App;
