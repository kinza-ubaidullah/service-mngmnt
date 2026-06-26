import { useState } from 'react';
import {
  LogOut, LayoutDashboard, Users, ClipboardList, Wrench, DollarSign,
  Activity, Map, Search, Menu, X, Settings, Trash2,
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import GlobalLeadSearch from '../GlobalLeadSearch';

export interface AdminNavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  path?: string;
  tab?: string;
}

const primaryNav: AdminNavItem[] = [
  { label: 'Overview', icon: LayoutDashboard, tab: 'Overview' },
  { label: 'Service Leads', icon: ClipboardList, tab: 'Service Leads' },
  { label: 'Live Map', icon: Map, path: '/map' },
  { label: 'Workshop', icon: Wrench, tab: 'Workshop' },
  { label: 'Staff', icon: Users, tab: 'Staff Management' },
  { label: 'Finance', icon: DollarSign, tab: 'Finance' },
  { label: 'Logs', icon: Activity, tab: 'System Logs' },
];

const extraNav: AdminNavItem[] = [
  { label: 'Trash Bin', icon: Trash2, tab: 'Trash Bin' },
];

interface AdminTopNavProps {
  activeTab: string;
  globalSearch: string;
  onGlobalSearchChange: (v: string) => void;
  onGlobalSearchSubmit: () => void;
  onNavigateTab: (tab: string) => void;
  onNavigatePath: (path: string) => void;
  onLogout: () => void;
}

const AdminTopNav: React.FC<AdminTopNavProps> = ({
  activeTab,
  globalSearch,
  onGlobalSearchChange,
  onGlobalSearchSubmit,
  onNavigateTab,
  onNavigatePath,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleNav = (item: AdminNavItem) => {
    if (item.path) {
      onNavigatePath(item.path);
    } else if (item.tab) {
      onNavigateTab(item.tab);
    }
    setMobileOpen(false);
  };

  const isActive = (item: AdminNavItem) => {
    if (item.tab) return activeTab === item.tab;
    return false;
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 lg:px-5">
          <div className="flex items-center gap-2 lg:gap-3 h-14 lg:h-16 min-w-0">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-gradient-to-br from-mint-400 to-mint-600 flex items-center justify-center shadow-md shadow-mint-500/20">
                <LayoutDashboard size={16} className="text-white" />
              </div>
              <span className="text-base lg:text-lg font-black text-slate-800 tracking-tight hidden sm:block">ServiceOS</span>
            </div>

            {/* Desktop nav — scrollable when cramped */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none py-1">
              {primaryNav.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNav(item)}
                  className={`relative shrink-0 px-2.5 xl:px-3 py-2 text-xs xl:text-sm font-semibold transition-colors rounded-lg whitespace-nowrap
                    ${isActive(item)
                      ? 'text-mint-600 bg-mint-50/80'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                >
                  {item.label}
                  {isActive(item) && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-mint-500 rounded-full" />
                  )}
                </button>
              ))}
            </nav>

            {/* Right utilities — compact, no clipping */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <Search size={16} />
              </button>

              <div className="hidden lg:block">
                <GlobalLeadSearch
                  value={globalSearch}
                  onChange={onGlobalSearchChange}
                  onSubmit={onGlobalSearchSubmit}
                  placeholder="Search..."
                  className="w-32 xl:w-40"
                />
              </div>

              <ThemeToggle className="hidden md:flex" />

              <button
                type="button"
                onClick={() => handleNav({ label: 'Settings', icon: Settings, tab: 'Settings' })}
                title="Settings"
                className={`p-2 rounded-lg transition-colors
                  ${activeTab === 'Settings'
                    ? 'bg-mint-50 text-mint-600 ring-1 ring-mint-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <Settings size={17} />
              </button>

              <button
                type="button"
                onClick={() => handleNav({ label: 'Trash Bin', icon: Trash2, tab: 'Trash Bin' })}
                title="Trash Bin"
                className={`p-2 rounded-lg transition-colors
                  ${activeTab === 'Trash Bin'
                    ? 'bg-mint-50 text-mint-600 ring-1 ring-mint-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
              >
                <Trash2 size={17} />
              </button>

              <button
                type="button"
                title="Live Stats"
                className="hidden xl:flex p-2 rounded-lg border border-mint-200 bg-mint-50 text-mint-600 hover:bg-mint-100 transition-colors"
              >
                <Activity size={16} className="animate-pulse" />
              </button>

              <button
                type="button"
                onClick={onLogout}
                title="Logout"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-lg bg-mint-500 hover:bg-mint-600 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile search */}
          {searchOpen && (
            <div className="lg:hidden pb-3">
              <GlobalLeadSearch
                value={globalSearch}
                onChange={onGlobalSearchChange}
                onSubmit={onGlobalSearchSubmit}
                placeholder="Search lead..."
                className="w-full"
              />
            </div>
          )}
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-14 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-lg lg:hidden max-h-[70vh] overflow-y-auto">
            <nav className="p-3 space-y-1">
              {[...primaryNav, { label: 'Settings', icon: Settings, tab: 'Settings' }, ...extraNav].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNav(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold
                    ${isActive(item) ? 'bg-mint-50 text-mint-600 border border-mint-200' : 'text-slate-600 hover:bg-slate-50'}
                  `}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="p-3 border-t border-slate-100 flex items-center justify-between">
              <ThemeToggle showLabel />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AdminTopNav;
