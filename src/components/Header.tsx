import React, { useState } from 'react';
import { ViewMode, UserProfile, AppNotification } from '../types';
import { Bell, Menu, User, LogOut, CheckCircle2, AlertTriangle, Shield, Clock, Trash2 } from 'lucide-react';
import { getTranslation } from '../i18n';
import { ConfirmModal } from './ConfirmModal';
import { MetaAiIcon } from './MetaAiIcon';

interface HeaderProps {
  currentView: ViewMode;
  user: UserProfile;
  notifications: AppNotification[];
  onNavigate: (view: ViewMode) => void;
  onOpenMobileMenu: () => void;
  onOpenAuthModal: (mode?: 'signin' | 'signup') => void;
  onLogout: () => void;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onDeleteNotification: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  user,
  notifications,
  onNavigate,
  onOpenMobileMenu,
  onOpenAuthModal,
  onLogout,
  onMarkAllAsRead,
  onClearNotifications,
  onDeleteNotification,
}) => {
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    iconType?: 'trash' | 'logout' | 'alert';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    onConfirm: () => {},
  });

  const t = (key: string) => getTranslation(user.language, key);
  const isBn = user.language === 'Bengali (বাংলা)';

  const getBreadcrumbs = () => {
    switch (currentView) {
      case 'code-auditor':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {t('dashboard')}
            </button>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{t('codeAuditor')}</span>
          </div>
        );
      case 'business-evaluator':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {t('dashboard')}
            </button>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{t('businessEvaluator')}</span>
          </div>
        );
      case 'history':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {t('dashboard')}
            </button>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{t('auditAndEvalHistory')}</span>
          </div>
        );
      case 'settings':
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <button onClick={() => onNavigate('dashboard')} className="hover:text-blue-600 transition-colors cursor-pointer">
              {t('dashboard')}
            </button>
            <span>/</span>
            <span className="text-slate-800 font-semibold">{t('settings')}</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="text-slate-800 font-semibold">{t('dashboard')}</span>
          </div>
        );
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleConfirmLogout = () => {
    setConfirmModal({
      isOpen: true,
      title: isBn ? 'সাইন আউট করবেন?' : 'Confirm Sign Out?',
      confirmText: isBn ? 'কনফার্ম' : 'Confirm',
      cancelText: isBn ? 'ক্যানসেল' : 'Cancel',
      iconType: 'logout',
      onConfirm: () => {
        onLogout();
        setShowUserDropdown(false);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleConfirmClearAllNotifications = () => {
    setConfirmModal({
      isOpen: true,
      title: isBn ? 'সব নোটিফিকেশন মুছবেন?' : 'Clear All Notifications?',
      confirmText: isBn ? 'কনফার্ম' : 'Confirm',
      cancelText: isBn ? 'ক্যানসেল' : 'Cancel',
      iconType: 'trash',
      onConfirm: () => {
        onClearNotifications();
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleConfirmDeleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      title: isBn ? 'নোটিফিকেশন মুছবেন?' : 'Delete Notification?',
      confirmText: isBn ? 'কনফার্ম' : 'Confirm',
      cancelText: isBn ? 'ক্যানসেল' : 'Cancel',
      iconType: 'trash',
      onConfirm: () => {
        onDeleteNotification(id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <>
      <header className="h-16 px-4 lg:px-8 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>{getBreadcrumbs()}</div>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications Button & Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                setShowUserDropdown(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors relative cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <Bell className="w-4 h-4 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-red-500 text-white rounded-full text-[10px] min-w-4 h-4 px-1 flex items-center justify-center font-extrabold shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline">{t('notifications')}</span>
            </button>

            {showNotifDropdown && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
                  onClick={() => setShowNotifDropdown(false)}
                />

                {/* Notification Popover perfectly centered horizontally */}
                <div className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 w-[92vw] max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-scale-up">
                  <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-blue-600" />
                      <h4 className="font-bold text-sm text-slate-900">{t('notifications')}</h4>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        {t('markAllAsRead')}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500">
                        {t('noNotifications')}
                      </div>
                    ) : (
                      notifications.map((n, idx) => (
                        <div
                          key={n.id ? `${n.id}__${idx}` : `notif-${idx}`}
                          className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 relative group ${
                            !n.read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                            {n.type === 'scan' ? (
                              <Shield className="w-3.5 h-3.5" />
                            ) : n.type === 'eval' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 text-xs min-w-0 pr-6">
                            <p className="font-semibold text-slate-800 truncate">{n.title}</p>
                            <p className="text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                          </div>
                          {/* Individual Delete Option */}
                          <button
                            onClick={(e) => handleConfirmDeleteNotification(n.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 absolute top-3 right-3 opacity-80 sm:opacity-0 group-hover:opacity-100"
                            title={isBn ? 'নোটিফিকেশন মুছুন' : 'Delete notification'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Avatar Circle & Dropdown */}
          <div className="relative">
            {(() => {
              const isGuest = !user.email || user.fullName === 'Guest User' || user.username === 'guest';
              return (
                <>
                  <button
                    onClick={() => {
                      setShowUserDropdown(!showUserDropdown);
                      setShowNotifDropdown(false);
                    }}
                    className="w-9 h-9 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center border border-slate-200/80 shadow-xs hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer overflow-hidden p-1"
                    title={isGuest ? 'Meta AI Guest Account' : user.fullName}
                  >
                    {isGuest ? (
                      <MetaAiIcon className="w-5 h-5" />
                    ) : (
                      <span className="font-bold text-sm text-blue-700">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                      </span>
                    )}
                  </button>

                  {showUserDropdown && (
                    <>
                      {/* Click-away backdrop */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserDropdown(false)}
                      />

                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-scale-up">
                        {/* Active User Card */}
                        <div className="px-4 py-2.5 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center shrink-0 shadow-xs overflow-hidden p-1 border border-slate-200/80">
                              {isGuest ? (
                                <MetaAiIcon className="w-5 h-5" />
                              ) : (
                                <span className="font-bold text-xs text-blue-700">
                                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs text-slate-900 truncate">
                                {isGuest ? 'Guest User' : user.fullName}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {isGuest ? 'guest@coreaudit' : user.email}
                              </p>
                            </div>
                          </div>
                        </div>

                  {/* Login & Sign Up Options - Only for Guest Users */}
                  {isGuest && (
                    <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-2 mb-1.5">
                        Account Access
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenAuthModal('signin');
                          }}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold text-center transition-colors cursor-pointer shadow-2xs"
                        >
                          Log In
                        </button>
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onOpenAuthModal('signup');
                          }}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-bold text-center transition-colors cursor-pointer shadow-2xs"
                        >
                          Sign Up
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Nav Links */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        onNavigate('settings');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('accountSettings')}</span>
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('history');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('auditHistory')}</span>
                    </button>
                  </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={handleConfirmLogout}
                          className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2.5 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>{t('logOut')}</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </>
            );
          })()}
          </div>
        </div>
      </header>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        iconType={confirmModal.iconType}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        language={user.language}
      />
    </>
  );
};
