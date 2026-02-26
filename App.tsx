
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
  X,
  Settings,
  ArrowUpCircle,
  FileText,
  HelpCircle,
  Pencil,
  Image,
  MessageSquare,
} from 'lucide-react';
import { Business, FilterType, User, CompanySettings, CompanyProfile } from './types';
import { BUSINESS_DATA, createDefaultCompanyProfile, DEFAULT_COMPANY_SETTINGS } from './constants';
import { api } from './src/api/client';
import { StageBadge, StatusPill } from './components/Badge';
import { RouteLine } from './components/RouteLine';
import { DetailDrawer } from './components/DetailDrawer';
import { Login } from './components/Login';
import { ManagerWorkspace } from './components/ManagerWorkspace';
import { MemberManagement } from './components/MemberManagement';
import { BusinessEntitiesPanel } from './components/BusinessEntitiesPanel';
import { ManagerProfile } from './components/ManagerProfile';
import { ChatPanel } from './components/ChatPanel';

class ChatPanelErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean; errorMessage: string }
> {
  state = { hasError: false, errorMessage: '' };
  static getDerivedStateFromError(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { hasError: true, errorMessage: msg };
  }
  componentDidCatch(err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    this.setState((s) => (s.errorMessage ? s : { ...s, errorMessage: msg }));
  }
  render() {
    if (this.state.hasError) {
      return (
        <>
          <div className="fixed inset-0 bg-black/25 z-[60]" onClick={this.props.onClose} aria-hidden />
          <div className="fixed top-0 right-0 h-full w-full sm:max-w-[420px] bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-[70] flex flex-col items-center justify-center p-6">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">Chat couldn’t load. Start the backend: in your project folder run <code className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">cd server && npm run dev</code>. Use a real account (not demo).</p>
            {this.state.errorMessage && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-mono max-w-full truncate" title={this.state.errorMessage}>{this.state.errorMessage}</p>
            )}
            <button onClick={() => { this.setState({ hasError: false, errorMessage: '' }); this.props.onClose(); }} className="mt-4 px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-sm font-medium">Close</button>
          </div>
        </>
      );
    }
    return this.props.children;
  }
}

const DEFAULT_MANAGERS: User[] = [
  {
    id: 'mgr-101',
    name: 'Kirtii Sharma',
    role: 'Manager',
    email: 'kirtii@zeweco.com',
    avatar: 'https://i.pravatar.cc/150?u=kirtii',
    lastLogin: new Date().toISOString()
  },
  {
    id: 'mgr-102',
    name: 'Juhi',
    role: 'Manager',
    email: 'juhi@zeweco.com',
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

  const [businesses, setBusinesses] = useState<Business[]>(() => {
    try {
      const s = localStorage.getItem('terminal_businesses');
      if (s) {
        const parsed = JSON.parse(s) as Business[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return BUSINESS_DATA;
  });
  const [managers, setManagers] = useState<User[]>(() => {
    try {
      const s = localStorage.getItem('terminal_managers');
      if (s) {
        const parsed = JSON.parse(s) as User[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return DEFAULT_MANAGERS;
  });

  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isBusinessEntitiesOpen, setIsBusinessEntitiesOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatOpenEntityId, setChatOpenEntityId] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isManagerProfileOpen, setIsManagerProfileOpen] = useState(false);
  const [isTerminalEditOpen, setIsTerminalEditOpen] = useState(false);
  const [terminalEditName, setTerminalEditName] = useState('');
  const [terminalEditLogo, setTerminalEditLogo] = useState('');
  const terminalLogoInputRef = useRef<HTMLInputElement>(null);
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>(() => {
    try {
      const s = localStorage.getItem('terminal_company_profiles');
      if (s) {
        const parsed = JSON.parse(s) as CompanyProfile[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p) => ({ ...DEFAULT_COMPANY_SETTINGS, ...p, id: p.id } as CompanyProfile));
        }
      }
    } catch (_) {}
    return [createDefaultCompanyProfile('default', 'Zeweco')];
  });
  const [activeCompanyId, setActiveCompanyId] = useState<string>(() => {
    try {
      const id = localStorage.getItem('terminal_active_company_id');
      if (id) return id;
    } catch (_) {}
    return 'default';
  });
  const companySettings: CompanySettings = useMemo(() => {
    const found = companyProfiles.find(c => c.id === activeCompanyId);
    const base = found ?? companyProfiles[0];
    const merged = base ? { ...DEFAULT_COMPANY_SETTINGS, ...base } : createDefaultCompanyProfile('default');
    return merged as CompanySettings;
  }, [companyProfiles, activeCompanyId]);
  /** Terminal name & photo: from company settings (editable in header). Fallback to first entity logo if no company logo. */
  const terminalDisplayName = companySettings.companyName || 'Zeweco';
  const terminalDisplayLogo = companySettings.logoUrl?.trim() || businesses[0]?.logoUrl?.trim() || '';
  const [hiddenEntityIds, setHiddenEntityIds] = useState<Set<string>>(new Set());
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

  // Persist managers so CXO-added managers (e.g. Akash) show in Team Management after refresh
  useEffect(() => {
    try {
      localStorage.setItem('terminal_managers', JSON.stringify(managers));
    } catch (_) {}
  }, [managers]);

  // Persist businesses so manager assignments (responsible) survive refresh
  useEffect(() => {
    try {
      localStorage.setItem('terminal_businesses', JSON.stringify(businesses));
    } catch (_) {}
  }, [businesses]);

  // Fetch businesses on mount; merge with current state so we keep local assignments (responsible)
  const refreshBusinesses = async () => {
    try {
      const data = await api.getBusinesses();
      const fromApi = Array.isArray(data) && data.length > 0 ? data : null;
      setBusinesses(prev => {
        if (!fromApi) return prev;
        const byId = new Map(prev.map(b => [b.id, b]));
        fromApi.forEach((d: Business) => {
          const existing = byId.get(d.id);
          byId.set(d.id, { ...d, responsible: existing?.responsible ?? d.responsible });
        });
        return Array.from(byId.values());
      });
    } catch (error) {
      console.error('Failed to fetch businesses:', error);
      setBusinesses(prev => prev.length > 0 ? prev : BUSINESS_DATA);
    }
  };

  // Fetch managers from backend so list and permissions stay in sync
  const refreshManagers = async () => {
    try {
      const data = await api.getUsers();
      if (Array.isArray(data)) {
        setManagers(data);
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  useEffect(() => {
    refreshBusinesses();
    refreshManagers();
  }, []);

  // When CXO opens Team Management, refresh managers so permissions are up to date
  useEffect(() => {
    if (isMembersOpen) refreshManagers();
  }, [isMembersOpen]);

  // When Chat opens, refresh managers so CXO "Start with manager" uses real DB IDs (manager then sees thread & messages)
  useEffect(() => {
    if (isChatOpen && currentUser?.role === 'CXO') refreshManagers();
  }, [isChatOpen]);

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
        api.setAuthUser(user?.id ?? null);
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

  // Clear chat badge when panel is opened
  useEffect(() => {
    if (isChatOpen) setUnreadChatCount(0);
  }, [isChatOpen]);

  // Poll for chat threads when panel is closed so we can show notification badge (e.g. manager has message from CXO)
  const isDemoUser = currentUser?.id && /^(cxo-|mgr-)\d+$/.test(currentUser.id);
  useEffect(() => {
    if (isChatOpen || !currentUser || isDemoUser) return;
    api.setAuthUser(currentUser.id);
    const poll = () => {
      api.getChatThreads().then((list) => {
        const n = Array.isArray(list) ? list.length : 0;
        setUnreadChatCount((prev) => (n > 0 ? Math.min(n, 99) : prev));
      }).catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 20000);
    return () => clearInterval(interval);
  }, [isChatOpen, currentUser?.id, isDemoUser]);

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
      api.setAuthUser(userOrEmail.id);
      localStorage.setItem('terminal_session', JSON.stringify(userOrEmail));
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    api.setAuthUser(null);
    localStorage.removeItem('terminal_session');
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const updateBusiness = (updated: Business) => {
    setBusinesses(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (selectedBusiness?.id === updated.id) {
      setSelectedBusiness(updated);
    }
  };

  const addManager = (manager: User) => {
    setManagers(prev => [...prev, manager]);
  };

  const updateManager = (id: string, updates: Partial<Pick<User, 'email' | 'permissions'>>) => {
    setManagers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteManager = async (id: string) => {
    try {
      await api.deleteUser(id);
    } catch (_) {
      // Backend may be down; still remove from local state
    }
    setManagers(prev => prev.filter(m => m.id !== id));
  };

  const filteredBusinesses = useMemo(() => {
    let result = companySettings.entityArchivingEnabled
      ? businesses.filter(b => !hiddenEntityIds.has(b.id))
      : [...businesses];

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
  }, [businesses, filter, search, currentUser, hiddenEntityIds, companySettings.entityArchivingEnabled]);

  const businessEntityActiveIds = useMemo(
    () => new Set(businesses.map(b => b.id).filter(id => !hiddenEntityIds.has(id))),
    [businesses, hiddenEntityIds]
  );

  const handleEntityReorder = (reordered: Business[]) => {
    setBusinesses(reordered);
  };

  const handleEntityToggleActive = (id: string) => {
    setHiddenEntityIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddBusiness = (newBusiness: Business) => {
    setBusinesses(prev => [...prev, newBusiness]);
  };

  useEffect(() => {
    if (isTerminalEditOpen) {
      setTerminalEditName(companySettings.companyName || 'Zeweco');
      setTerminalEditLogo(companySettings.logoUrl?.trim() || businesses[0]?.logoUrl?.trim() || '');
    }
  }, [isTerminalEditOpen, companySettings.companyName, companySettings.logoUrl, businesses]);

  useEffect(() => {
    try {
      localStorage.setItem('terminal_company_profiles', JSON.stringify(companyProfiles));
      localStorage.setItem('terminal_active_company_id', activeCompanyId);
    } catch (_) {}
  }, [companyProfiles, activeCompanyId]);

  const handleSaveCompanySettings = (next: CompanySettings) => {
    setCompanyProfiles(prev =>
      prev.map(c => (c.id === activeCompanyId ? { ...c, ...next } : c))
    );
  };

  const handleSwitchCompany = (id: string) => {
    setActiveCompanyId(id);
  };

  const handleAddCompany = () => {
    const id = `company-${Date.now()}`;
    setCompanyProfiles(prev => [...prev, createDefaultCompanyProfile(id, 'New Company')]);
    setActiveCompanyId(id);
  };

  const stats = useMemo(() => ({
    total: filteredBusinesses.length,
    redAlerts: filteredBusinesses.filter(b => b.health === 'Red' || b.status === 'Overdue').length,
    stale: filteredBusinesses.filter(b => b.status === 'Stale').length,
    dueSoon: filteredBusinesses.filter(b => b.status === 'At Risk').length,
    escalationRequests: filteredBusinesses.filter(b => b.escalationRequested).length,
  }), [filteredBusinesses]);

  const managerRequestEntities = useMemo(
    () => filteredBusinesses.filter(b => b.escalationRequested || (b.supportNeededFromCXO && b.supportNeededFromCXO.trim())),
    [filteredBusinesses]
  );

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
            {currentUser?.role === 'CXO' ? (
              <button
                type="button"
                onClick={() => setIsTerminalEditOpen(true)}
                className="flex items-center gap-3 rounded-lg p-1.5 -m-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors group"
                title="Edit terminal name & photo"
              >
                <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-800 rounded border border-zinc-800 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0 group-hover:ring-2 group-hover:ring-blue-400/50 ring-offset-2 dark:ring-offset-zinc-950">
                  {terminalDisplayLogo ? (
                    <img src={terminalDisplayLogo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white tracking-widest">
                      {(terminalDisplayName || 'BT').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent leading-none uppercase">
                    {(terminalDisplayName || 'Zeweco').toUpperCase()} TERMINAL
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield size={10} className="text-green-600 dark:text-green-500" />
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Secure Session: {currentUser?.id}</span>
                    <Pencil size={9} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </button>
            ) : (
              <>
                <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-800 rounded border border-zinc-800 dark:border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                  {terminalDisplayLogo ? (
                    <img src={terminalDisplayLogo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white tracking-widest">
                      {(terminalDisplayName || 'BT').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent leading-none uppercase">
                    {(terminalDisplayName || 'Zeweco').toUpperCase()} · MANAGER WORKSPACE
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield size={10} className="text-green-600 dark:text-green-500" />
                    <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Secure Session: {currentUser?.id}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Search and Members - Side by Side */}
            <div className="flex items-center gap-2 mr-2">
              {currentUser?.role === 'CXO' && (
                <>
                  <button
                    onClick={() => setIsBusinessEntitiesOpen(true)}
                    className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all ${isBusinessEntitiesOpen ? 'bg-blue-50 border-blue-200 text-blue-500 dark:bg-blue-900/20 dark:border-blue-800' : ''}`}
                    title="Business Entities"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    onClick={() => setIsMembersOpen(true)}
                    className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all ${isMembersOpen ? 'bg-blue-50 border-blue-200 text-blue-500 dark:bg-blue-900/20 dark:border-blue-800' : ''}`}
                    title="Team Management"
                  >
                    <Users size={14} />
                  </button>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className={`relative p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-500 dark:bg-blue-900/20 dark:border-blue-800' : ''}`}
                    title="Chat"
                  >
                    <MessageSquare size={14} />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}
                  </button>
                </>
              )}
              {currentUser?.role === 'Manager' && (
                <button
                  onClick={() => setIsChatOpen(true)}
                  className={`relative p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-500 transition-all ${isChatOpen ? 'bg-blue-50 border-blue-200 text-blue-500 dark:bg-blue-900/20 dark:border-blue-800' : ''}`}
                  title="Chat"
                >
                  <MessageSquare size={14} />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {unreadChatCount > 99 ? '99+' : unreadChatCount}
                    </span>
                  )}
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
                <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all transform origin-top-right group-hover:translate-y-0 translate-y-2 z-50">
                  {currentUser?.role === 'Manager' && (
                    <button onClick={() => setIsManagerProfileOpen(true)} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"><UserIcon size={14} />Profile</button>
                  )}
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
            companySettings={companySettings}
            onUpdateBusiness={updateBusiness}
            onOpenEntityDetail={(business) => setSelectedBusiness(business)}
          />
        ) : (
          <div className="h-full overflow-y-auto bg-white dark:bg-zinc-950 min-h-0">
            <div className="max-w-[1440px] mx-auto px-6 py-6">
              {/* Stats: light grey cards, subtle shadow, uppercase medium grey labels, large bold dark numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                {[
                  { label: 'Managed Assets', val: stats.total, icon: LayoutGrid },
                  { label: 'Critical Risks', val: stats.redAlerts, icon: AlertCircle, trend: '2 increased' },
                  { label: 'Pending Updates', val: stats.stale, icon: Clock },
                  { label: 'Strategic Deadlines', val: stats.dueSoon, icon: Calendar },
                  { label: 'Escalation Requests', val: stats.escalationRequests, icon: ArrowUpCircle },
                ].map((card, i) => (
                  <div key={i} className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 py-4 px-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className="dashboard-card-label leading-none">{card.label}</p>
                        <p className="dashboard-card-value tabular-nums leading-tight">{card.val}</p>
                      </div>
                      <card.icon size={18} className="text-zinc-400 dark:text-zinc-500 shrink-0" strokeWidth={1.5} />
                    </div>
                    {card.trend && (
                      <p className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 uppercase tracking-[0.08em] flex items-center gap-0.5">
                        <ArrowUpRight size={10} /> {card.trend}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Manager requests & reports – visible to CXO */}
              {managerRequestEntities.length > 0 && (
                <div className="mb-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
                  <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                    <ArrowUpCircle size={16} className="text-blue-500 shrink-0" />
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">Manager requests & reports</h3>
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">({managerRequestEntities.length} need attention)</span>
                  </div>
                  <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {managerRequestEntities.map((biz) => (
                      <li
                        key={biz.id}
                        onClick={() => setSelectedBusiness(biz)}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 shrink-0 overflow-hidden">
                          {biz.logoUrl?.trim() ? <img src={biz.logoUrl} alt="" className="w-full h-full object-cover" /> : biz.code.substring(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{biz.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {biz.escalationRequested && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                <ArrowUpCircle size={10} /> Escalation requested
                              </span>
                            )}
                            {biz.supportNeededFromCXO && biz.supportNeededFromCXO.trim() && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 truncate max-w-[200px]" title={biz.supportNeededFromCXO}>
                                <HelpCircle size={10} /> Support needed
                              </span>
                            )}
                          </div>
                          {biz.escalationRequested && biz.escalationNote && biz.escalationNote.trim() && (
                            <p className="mt-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2" title={biz.escalationNote}>
                              Reason: {biz.escalationNote}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0 min-w-0 max-w-[140px]">
                          {biz.escalationRequested && biz.escalatedToManagerId ? (
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 block truncate" title={managers.find(m => m.id === biz.escalatedToManagerId)?.email}>
                              → {managers.find(m => m.id === biz.escalatedToManagerId)?.name ?? 'Manager'}
                            </span>
                          ) : null}
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 block truncate">{biz.responsible ?? '—'}</span>
                        </div>
                        <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                      </li>
                    ))}
                  </ul>
                  <p className="px-4 py-2 text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-zinc-800">Click a row to open details and respond.</p>
                </div>
              )}

              {/* Table: white background, header medium grey uppercase, rows alternate very light grey / white */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
                    <thead className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                      <tr>
                        <th className="px-4 py-3 w-[16%] dashboard-table-head">Business Entity</th>
                        <th className="px-4 py-3 w-[7%] dashboard-table-head">Status</th>
                        <th className="px-4 py-3 w-[22%] dashboard-table-head">Route Map (Health Blinking)</th>
                        <th className="px-4 py-3 w-[8%] dashboard-table-head">Responsible</th>
                        <th className="px-4 py-3 w-[12%] dashboard-table-head">Next Deliverable</th>
                        <th className="px-4 py-3 w-[6%] dashboard-table-head">ETA</th>
                        <th className="px-4 py-3 w-[6%] dashboard-table-head">Latency</th>
                        <th className="px-4 py-3 w-[6%] dashboard-table-head">Risks</th>
                        <th className="px-4 py-3 w-[6%] dashboard-table-head">Escalation</th>
                        <th className="px-4 py-3 w-[9%] dashboard-table-head">Stage</th>
                        <th className="w-[4%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBusinesses.map((biz, idx) => {
                        const isOverdue = biz.status === 'Overdue';
                        const isStale = biz.status === 'Stale';
                        const isEven = idx % 2 === 0;
                        const riskCount = biz.risks?.length ?? 0;
                        const hasEscalation = Boolean(biz.escalationRequested);
                        return (
                          <tr
                            key={biz.id}
                            onClick={() => setSelectedBusiness(biz)}
                            className={`group cursor-pointer border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/20 ${isEven ? 'bg-white dark:bg-zinc-900' : 'bg-zinc-50/70 dark:bg-zinc-900/60'} ${isStale ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''} ${hasEscalation ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                            style={{ height: '56px' }}
                          >
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center dashboard-cell-secondary font-medium shrink-0 overflow-hidden">
                                  {biz.logoUrl?.trim() ? <img src={biz.logoUrl} alt="" className="w-full h-full object-cover" /> : biz.code.substring(0, 2)}
                                </div>
                                <span className="dashboard-entity-name truncate">{biz.name}</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setChatOpenEntityId(biz.id); setIsChatOpen(true); }}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                  title="Open entity chat"
                                >
                                  <MessageSquare size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><StatusPill status={biz.status} /></td>
                            <td className="px-4 py-2.5"><RouteLine progress={biz.routeProgress} health={biz.health} /></td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <UserIcon size={11} className="text-zinc-400 dark:text-zinc-500 shrink-0" />
                                <span className="dashboard-label-sm truncate">{biz.responsible}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5"><span className="dashboard-cell-primary truncate block" title={biz.nextMilestone}>{biz.nextMilestone}</span></td>
                            <td className="px-4 py-2.5"><span className={`dashboard-cell-primary ${isOverdue ? 'text-red-600 dark:text-red-400' : ''}`}>{biz.eta}</span></td>
                            <td className="px-4 py-2.5"><span className="dashboard-cell-secondary">{biz.updated}</span></td>
                            <td className="px-4 py-2.5">
                              {riskCount > 0 ? (
                                <span className="inline-flex items-center gap-1 dashboard-label-sm px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                                  <AlertCircle size={10} /> {riskCount}
                                </span>
                              ) : (
                                <span className="dashboard-cell-secondary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              {hasEscalation ? (
                                <span
                                  className="inline-flex items-center gap-1 dashboard-label-sm px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                                  title={biz.escalationNote && biz.escalationNote.trim() ? `Reason: ${biz.escalationNote}` : undefined}
                                >
                                  <ArrowUpCircle size={10} />
                                  {biz.escalatedToManagerId
                                    ? (managers.find(m => m.id === biz.escalatedToManagerId)?.name ?? 'Requested')
                                    : 'Requested'}
                                </span>
                              ) : (
                                <span className="dashboard-cell-secondary">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5"><StageBadge stage={biz.stage} /></td>
                            <td className="pr-4 text-right"><ChevronRight size={14} className="text-zinc-300 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 dashboard-cell-secondary uppercase tracking-[0.08em]">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Nominal</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Critical</span>
                </div>
                <span className="normal-case tracking-normal">Terminal Connection: Secure · Uptime: 99.99% · System: BT-OS 4.2</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <DetailDrawer
        business={selectedBusiness}
        onClose={() => setSelectedBusiness(null)}
        onUpdateBusiness={updateBusiness}
        managers={managers}
        role={currentUser?.role}
        companyName={terminalDisplayName}
        companyLogoUrl={terminalDisplayLogo || undefined}
        onOpenEntityChat={selectedBusiness ? (entityId) => { setChatOpenEntityId(entityId); setIsChatOpen(true); } : undefined}
      />

      <MemberManagement
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        managers={managers}
        businesses={businesses}
        onAddManager={addManager}
        onUpdateManager={updateManager}
        onDeleteManager={deleteManager}
        onUpdateBusiness={updateBusiness}
      />

      <ChatPanelErrorBoundary onClose={() => { setIsChatOpen(false); setChatOpenEntityId(null); }}>
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => { setIsChatOpen(false); setChatOpenEntityId(null); }}
          currentUser={currentUser}
          managers={managers}
          businesses={businesses}
          initialEntityId={chatOpenEntityId}
        />
      </ChatPanelErrorBoundary>

      <BusinessEntitiesPanel
        isOpen={isBusinessEntitiesOpen}
        onClose={() => setIsBusinessEntitiesOpen(false)}
        businesses={businesses}
        onReorder={handleEntityReorder}
        activeIds={businessEntityActiveIds}
        onToggleActive={handleEntityToggleActive}
        onAddBusiness={handleAddBusiness}
        onSelectEntity={(business) => { setSelectedBusiness(business); setIsBusinessEntitiesOpen(false); }}
        entityArchivingEnabled={companySettings.entityArchivingEnabled}
        defaultStages={companySettings.defaultStages}
        companyName={terminalDisplayName}
        companyLogoUrl={terminalDisplayLogo || undefined}
        companyIndustry={businesses[0]?.industry || companySettings.industry}
        companyCategory={businesses[0]?.category || companySettings.category}
      />

      <ManagerProfile
        isOpen={isManagerProfileOpen}
        onClose={() => setIsManagerProfileOpen(false)}
        user={currentUser}
      />

      {/* Terminal name & photo edit — easy peasy from header */}
      {isTerminalEditOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 dark:bg-black/40 z-[60]" onClick={() => setIsTerminalEditOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-[61] p-5">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">Terminal name & photo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={terminalEditName}
                  onChange={(e) => setTerminalEditName(e.target.value)}
                  placeholder="e.g. Zeweco"
                  className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Photo</label>
                <input ref={terminalLogoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f?.type.startsWith('image/')) return;
                  const r = new FileReader();
                  r.onload = () => setTerminalEditLogo(r.result as string);
                  r.readAsDataURL(f);
                  e.target.value = '';
                }} />
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                    {terminalEditLogo ? <img src={terminalEditLogo} alt="" className="w-full h-full object-cover" /> : <Image size={22} className="text-zinc-400" />}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" onClick={() => terminalLogoInputRef.current?.click()} className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg">Choose photo</button>
                    {terminalEditLogo && <button type="button" onClick={() => setTerminalEditLogo('')} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400">Remove</button>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setIsTerminalEditOpen(false)} className="flex-1 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  handleSaveCompanySettings({ ...companySettings, companyName: terminalEditName.trim() || 'Zeweco', logoUrl: terminalEditLogo });
                  setIsTerminalEditOpen(false);
                }}
                className="flex-1 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
