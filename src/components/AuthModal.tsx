import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Shield, X, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { getTranslation } from '../i18n';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: 'signin' | 'signup';
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  language?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialMode = 'signin',
  onClose,
  onLoginSuccess,
  language = 'English',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const t = (key: string) => getTranslation(language, key);

  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
    setError(null);
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setError(t('validEmailErr'));
      return;
    }

    if (!password || password.length < 6) {
      setError(t('passwordLengthErr'));
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setError(t('provideFullNameErr'));
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'signup' ? '/api/auth/register' : '/api/auth/login';
      const payload = mode === 'signup'
        ? { email: email.trim().toLowerCase(), password, fullName: fullName.trim() }
        : { email: email.trim().toLowerCase(), password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      const loggedUser: UserProfile = {
        fullName: data.user.fullName,
        email: data.user.email,
        username: data.user.username || data.user.email.split('@')[0],
        bio: 'Security researcher & tech strategist using CoreAudit.',
        location: 'Global',
        twoFactorEnabled: true,
        theme: data.user.theme || 'light',
        language: data.user.language || 'English',
        notifications: {
          scanStatus: true,
          businessAlerts: true,
          productUpdates: false,
          marketingEmails: false,
        },
      };

      onLoginSuccess(loggedUser);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand with Shield Logo */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mx-auto mb-3">
            <Shield className="w-6 h-6 text-white fill-white/20" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'signin' ? t('signInTitle') : t('signUpTitle')}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'signin'
              ? t('signInSubtitle')
              : t('signUpSubtitle')}
          </p>
        </div>



        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium animate-fade-in">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('fullNameLabel')}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mahamudul Hasan"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('emailLabel')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('passwordLabel')} <span className="text-slate-400 font-normal">{t('passwordLengthHint')}</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1D4ED8] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition-all mt-4 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{mode === 'signin' ? t('signInBtn') : t('signUpBtn')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch Mode */}
        <div className="mt-5 text-center text-xs text-slate-500">
          {mode === 'signin' ? (
            <p>
              {t('dontHaveAccountText')}{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signup');
                }}
                className="font-bold text-blue-600 hover:underline cursor-pointer ml-1"
              >
                {t('signUpBtn')}
              </button>
            </p>
          ) : (
            <p>
              {t('alreadyHaveAccountText')}{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMode('signin');
                }}
                className="font-bold text-blue-600 hover:underline cursor-pointer ml-1"
              >
                {t('signInBtn')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
