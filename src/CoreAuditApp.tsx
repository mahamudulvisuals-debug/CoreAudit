import React, { useState, useEffect, useCallback } from 'react';
import {
  ViewMode,
  UserProfile,
  HistoryItem,
  CodeScanResult,
  BusinessEvaluationResult,
  AppNotification,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { CodeAuditorView } from './components/CodeAuditorView';
import { BusinessEvaluatorView } from './components/BusinessEvaluatorView';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AuthModal } from './components/AuthModal';

import { getOrCreateGuestId } from './utils/guestId';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  // Default guest profile generator with unique per-browser guest ID
  const createGuestProfile = (): UserProfile => {
    const guestId = getOrCreateGuestId();
    return {
      fullName: 'Guest User',
      email: guestId, // unique Guest ID e.g. "guest_17935545_x8f9"
      username: 'guest',
      bio: 'Guest user exploring CoreAudit.',
      location: '',
      twoFactorEnabled: false,
      theme: 'light',
      language: 'English',
      notifications: {
        scanStatus: true,
        businessAlerts: true,
        productUpdates: false,
        marketingEmails: false,
      },
    };
  };

  // User Profile state initialization
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('coreaudit_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email && !parsed.email.startsWith('guest_')) {
          return {
            fullName: parsed.fullName || 'User',
            email: parsed.email,
            username: parsed.username || parsed.email.split('@')[0],
            bio: parsed.bio || '',
            location: parsed.location || '',
            twoFactorEnabled: parsed.twoFactorEnabled ?? false,
            theme: parsed.theme || 'light',
            language: parsed.language || 'English',
            notifications: parsed.notifications || {
              scanStatus: true,
              businessAlerts: true,
              productUpdates: false,
              marketingEmails: false,
            },
          };
        }
      } catch (e) {
        // fallback
      }
    }
    return createGuestProfile();
  });

  // Apply Theme dynamically across the entire document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    const applyTheme = (themeMode: 'light' | 'dark' | 'system') => {
      let isDark = false;
      if (themeMode === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        isDark = themeMode === 'dark';
      }

      if (isDark) {
        root.classList.add('dark');
        body.classList.add('dark');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        body.classList.remove('dark');
        root.setAttribute('data-theme', 'light');
      }
    };

    applyTheme(user.theme || 'light');

    if (user.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [user.theme]);

  // Real user notifications - strictly populated by actual user actions
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('coreaudit_notifications');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((n: any) => !['notif-1', 'notif-2', 'notif-3'].includes(n.id));
        }
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  // Sync notifications to localStorage
  useEffect(() => {
    localStorage.setItem('coreaudit_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // History State loaded from backend strictly for current user / guest ID
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [, setSelectedScanForModal] = useState<CodeScanResult | null>(null);
  const [selectedEvalForModal, setSelectedEvalForModal] = useState<BusinessEvaluationResult | null>(null);

  // Fetch history strictly scoped by user.email / guest ID
  const loadUserHistory = useCallback((email: string) => {
    if (!email) {
      setHistory([]);
      return;
    }
    fetch(`/api/history?userEmail=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data);
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch user history:', err);
      });
  }, []);

  useEffect(() => {
    loadUserHistory(user.email);
  }, [user.email, loadUserHistory]);

  // Update user in state and localStorage
  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    setUser((prev) => {
      const nextUser = { ...prev, ...updated };
      if (nextUser.email && !nextUser.email.startsWith('guest_')) {
        localStorage.setItem('coreaudit_user', JSON.stringify(nextUser));
      } else {
        localStorage.removeItem('coreaudit_user');
      }
      return nextUser;
    });
  };

  const handleLoginSuccess = (loggedUser: UserProfile) => {
    handleUpdateUser(loggedUser);
    loadUserHistory(loggedUser.email);
  };

  const handleLogout = () => {
    localStorage.removeItem('coreaudit_user');
    const guestProfile = createGuestProfile();
    setUser(guestProfile);
    loadUserHistory(guestProfile.email);
    setCurrentView('landing');
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const handleDeleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleScanComplete = (scan: CodeScanResult) => {
    setHistory((prev) => [scan, ...prev.filter((h) => h.id !== scan.id)]);
    const isBn = user.language === 'Bengali (বাংলা)';
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: isBn ? 'কোড অডিট সম্পন্ন হয়েছে' : 'Code Security Audit Finished',
      message: isBn
        ? `${scan.projectName} স্ক্যানে ${scan.issuesCount}টি ত্রুটি শনাক্ত হয়েছে। স্কোর: ${scan.score}/100`
        : `${scan.projectName} scored ${scan.score}/100 with ${scan.issuesCount} flaws detected.`,
      time: 'Just now',
      read: false,
      type: 'scan',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleEvaluationComplete = (evaluation: BusinessEvaluationResult) => {
    setHistory((prev) => [evaluation, ...prev.filter((h) => h.id !== evaluation.id)]);
    const isBn = user.language === 'Bengali (বাংলা)';
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: isBn ? 'বিজনেস মূল্যায়ন সম্পন্ন হয়েছে' : 'Business Evaluation Finished',
      message: isBn
        ? `${evaluation.businessName} এর বিজনেস হেলথ স্কোর: ${evaluation.healthScore}/100`
        : `${evaluation.businessName} achieved health score ${evaluation.healthScore}/100.`,
      time: 'Just now',
      read: false,
      type: 'eval',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handlePasswordChanged = () => {
    const isBn = user.language === 'Bengali (বাংলা)';
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: isBn ? 'পাসওয়ার্ড পরিবর্তন সম্পন্ন' : 'Security Alert: Password Updated',
      message: isBn
        ? 'আপনার অ্যাকাউন্টের লগইন পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।'
        : 'Your account login password was successfully updated.',
      time: 'Just now',
      read: false,
      type: 'security',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await fetch(`/api/history/${id}?userEmail=${encodeURIComponent(user.email)}`, { method: 'DELETE' });
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.warn('Delete history item error', e);
    }
  };

  // If in Landing page mode:
  // Note: Landing page strictly remains in English per user instruction.
  if (currentView === 'landing') {
    return (
      <div data-theme={user.theme === 'dark' ? 'dark' : 'light'} className={user.theme === 'dark' ? 'dark' : ''}>
        <LandingPage
          onGetStarted={() => setCurrentView('dashboard')}
          onNavigateModule={(mod) => setCurrentView(mod)}
          onOpenAuth={() => {
            setAuthModalMode('signin');
            setAuthModalOpen(true);
          }}
        />
        <AuthModal
          isOpen={authModalOpen}
          initialMode={authModalMode}
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(loggedUser) => {
            handleLoginSuccess(loggedUser);
            setCurrentView('dashboard');
          }}
          language={user.language}
        />
      </div>
    );
  }

  // Dashboard & App Shell: All inner pages display in user.language!
  const recentCodeScans = history.filter((h): h is CodeScanResult => h.type === 'code_scan');
  const recentBusinessEvals = history.filter((h): h is BusinessEvaluationResult => h.type === 'business_eval');

  return (
    <div
      data-theme={user.theme === 'dark' ? 'dark' : 'light'}
      className={`min-h-screen bg-[#F8FAFC] flex ${user.theme === 'dark' ? 'dark' : ''}`}
    >
      {/* Sidebar matching exact design in selected language */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        language={user.language}
      />

      {/* Main Container shifted right by 64 (w-64 sidebar) on desktop */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header with live, real notifications, centered popup, and user login/signup */}
        <Header
          currentView={currentView}
          user={user}
          notifications={notifications}
          onNavigate={(view) => setCurrentView(view)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode || 'signin');
            setAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onClearNotifications={handleClearNotifications}
          onDeleteNotification={handleDeleteNotification}
        />

        {/* Dynamic Viewport Content in selected language */}
        <main className="flex-1">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={(view) => setCurrentView(view)}
              history={history}
              language={user.language}
            />
          )}

          {currentView === 'code-auditor' && (
            <CodeAuditorView
              onScanComplete={handleScanComplete}
              recentScans={recentCodeScans}
              onSelectScan={(scan) => setSelectedScanForModal(scan)}
              userEmail={user.email}
              language={user.language}
            />
          )}

          {currentView === 'business-evaluator' && (
            <BusinessEvaluatorView
              onEvaluationComplete={handleEvaluationComplete}
              recentEvaluations={recentBusinessEvals}
              onSelectEvaluation={(evalItem) => setSelectedEvalForModal(evalItem)}
              selectedEvaluation={selectedEvalForModal}
              onClearSelectedEvaluation={() => setSelectedEvalForModal(null)}
              userEmail={user.email}
              language={user.language}
            />
          )}

          {currentView === 'history' && (
            <HistoryView
              history={history}
              language={user.language}
              onSelectCodeScan={(scan) => {
                setCurrentView('code-auditor');
                setSelectedScanForModal(scan);
              }}
              onSelectBusinessEval={(evaluation) => {
                setCurrentView('business-evaluator');
                setSelectedEvalForModal(evaluation);
              }}
              onDeleteItem={handleDeleteHistoryItem}
              onStartNewScan={() => setCurrentView('code-auditor')}
              onStartNewEval={() => setCurrentView('business-evaluator')}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              user={user}
              onUpdateUser={handleUpdateUser}
              onPasswordChanged={handlePasswordChanged}
            />
          )}
        </main>
      </div>

      {/* Real Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={(loggedUser) => handleLoginSuccess(loggedUser)}
        language={user.language}
      />
    </div>
  );
}
