import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  Palette,
  Sun,
  Moon,
  Laptop,
  Globe,
  Lock,
  Check,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { getTranslation, SUPPORTED_LANGUAGES } from '../i18n';

interface SettingsViewProps {
  user: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onPasswordChanged?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onPasswordChanged,
}) => {
  // Theme state synced with user
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(
    user.theme || 'light'
  );

  // Language state
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    user.language || 'English'
  );
  const [langSaved, setLangSaved] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Theme switch handler with immediate zero-latency DOM application
  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    onUpdateUser({ theme });

    const root = document.documentElement;
    let effective = theme;
    if (theme === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (effective === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  };

  // Language change handler
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    onUpdateUser({ language: lang });
    setLangSaved(true);
    setTimeout(() => setLangSaved(false), 2500);
  };

  // Password submission handler with real validation and backend PBKDF2 update
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError(getTranslation(user.language, 'passwordEmptyErr'));
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError(getTranslation(user.language, 'passwordLengthErr'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(getTranslation(user.language, 'passwordMismatchErr'));
      return;
    }

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Password update failed.');
      }

      onPasswordChanged?.();
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    }
  };

  const t = (key: string) => getTranslation(user.language, key);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto space-y-7 animate-fade-in font-sans">
      {/* ---------------- 1. Appearance Header matching Image 2 ---------------- */}
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
          <Palette className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('appearance')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t('appearanceSub')}
          </p>
        </div>
      </div>

      {/* ---------------- 2. Theme Section matching Image 2 ---------------- */}
      <div className="space-y-2.5">
        <label className="block text-sm font-bold text-slate-800">
          {t('theme')}
        </label>
        <div className="bg-[#EEF2F6] p-1.5 rounded-2xl flex items-center gap-1.5">
          {/* Light button */}
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedTheme === 'light'
                ? 'bg-white text-[#2563EB] shadow-xs ring-1 ring-blue-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun className={`w-4 h-4 ${selectedTheme === 'light' ? 'text-[#2563EB]' : ''}`} />
            <span>{t('light')}</span>
          </button>

          {/* Dark button */}
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedTheme === 'dark'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>{t('dark')}</span>
          </button>

          {/* System button */}
          <button
            type="button"
            onClick={() => handleThemeChange('system')}
            className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              selectedTheme === 'system'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>{t('system')}</span>
          </button>
        </div>
      </div>

      {/* ---------------- 3. Language Section matching Image 2 ---------------- */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-bold text-slate-800">
            {t('language')}
          </label>
          {langSaved && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              {t('saved')}
            </span>
          )}
        </div>

        <div className="relative">
          <Globe className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            className="w-full pl-11 pr-10 py-3 bg-white border border-slate-300 rounded-2xl text-sm font-medium text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-xs"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>


      {/* ---------------- 5. Change Password Section (+ চেন্জ পাসওয়ার্ড অপশন) ---------------- */}
      <div className="pt-4 border-t border-slate-200/90 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {t('changePassword')}
            </h3>
            <p className="text-xs text-slate-500">
              {t('changePasswordSub')}
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{t('passwordSuccessMsg')}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('currentPassword')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="pt-1">
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              {t('updatePasswordBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
