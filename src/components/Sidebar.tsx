import React from 'react';
import { ViewMode } from '../types';
import {
  Home,
  BarChart3,
  Clock,
  Settings,
  Shield,
  Zap,
  X,
} from 'lucide-react';
import { getTranslation } from '../i18n';

interface SidebarProps {
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  language?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
  language = 'English',
}) => {
  const t = (key: string) => getTranslation(language, key);

  const navItems: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: <Home className="w-5 h-5" />,
    },
    {
      id: 'code-auditor',
      label: t('codeAuditor'),
      icon: (
        <span className="font-mono text-sm tracking-tighter font-bold mr-0.5">
          {'</>'}
        </span>
      ),
    },
    {
      id: 'business-evaluator',
      label: t('businessEvaluator'),
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'history',
      label: t('history'),
      icon: <Clock className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: t('settings'),
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#081225] text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-8 border-b border-slate-800/60">
            <button
              onClick={() => {
                onNavigate('dashboard');
                onCloseMobile?.();
              }}
              className="flex items-center gap-3 group text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-linear-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Shield className="w-5 h-5 text-white fill-white/20" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center">
                Core<span className="text-blue-500">Audit</span>
              </span>
            </button>

            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="px-3 pt-6 space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile?.();
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#1D4ED8] text-white shadow-md shadow-blue-900/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-center w-5 h-5">
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
