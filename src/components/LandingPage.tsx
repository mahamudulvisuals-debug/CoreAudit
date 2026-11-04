import React, { useState } from 'react';
import { Shield, ArrowRight, BookOpen, Check, Sparkles, X, LayoutDashboard, Code2, TrendingUp, User, Send, Mail, MessageSquare, Phone, ShieldCheck } from 'lucide-react';
import { getTranslation } from '../i18n';

interface LandingPageProps {
  onGetStarted: () => void;
  onNavigateModule: (module: 'code-auditor' | 'business-evaluator') => void;
  onOpenAuth: () => void;
  language?: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onNavigateModule,
  onOpenAuth,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  // Landing page must strictly remain in English per user instructions
  const t = (key: string) => getTranslation('English', key);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070D19] text-slate-800 dark:text-slate-100 flex flex-col font-sans relative overflow-x-hidden transition-colors duration-200">
      {/* Subtle background ambient blue gradient matching reference */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[650px] bg-gradient-to-b from-[#EBF3FE] via-[#F1F6FE]/70 to-transparent pointer-events-none -z-10" />

      {/* ---------------- 1. Top Navigation Bar (Logo on left, Hamburger on right) ---------------- */}
      <header className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-3 flex items-center justify-between relative z-30">
        {/* CoreAudit Logo */}
        <div 
          onClick={onGetStarted}
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#4F46E5] flex items-center justify-center shadow-md shadow-blue-500/20">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white/20" />
          </div>
          <span className="text-2xl sm:text-[26px] font-black tracking-tight text-[#0F172A]">
            Core<span className="text-[#2563EB]">Audit</span>
          </span>
        </div>

        {/* Clean 3-bar Hamburger Menu Button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 text-[#0F172A] hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {menuOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <div className="w-7 h-5 flex flex-col justify-between items-end">
              <span className="w-7 h-[2.5px] bg-[#0F172A] rounded-full" />
              <span className="w-7 h-[2.5px] bg-[#0F172A] rounded-full" />
              <span className="w-7 h-[2.5px] bg-[#0F172A] rounded-full" />
            </div>
          )}
        </button>

        {/* Dropdown Menu when Hamburger clicked */}
        {menuOpen && (
          <div className="absolute top-full right-4 w-60 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 py-2.5 z-50 animate-scale-up">
            <button
              onClick={() => {
                setMenuOpen(false);
                onGetStarted();
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-blue-600" />
              <span>{t('dashboard')}</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onNavigateModule('code-auditor');
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-blue-600" />
              <span>{t('codeAuditor')}</span>
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onNavigateModule('business-evaluator');
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-teal-600 hover:bg-teal-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-teal-600" />
              <span>{t('businessEvaluator')}</span>
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-500" />
              <span>{t('signInDemo')}</span>
            </button>
          </div>
        )}
      </header>

      {/* ---------------- 2. Main Hero Section ---------------- */}
      <main className="w-full max-w-md sm:max-w-xl md:max-w-2xl mx-auto px-4 sm:px-6 pt-3 pb-16 flex flex-col items-center text-center">
        {/* Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#DBEAFE]/80 text-[#1D4ED8] text-[11px] sm:text-xs font-bold tracking-wide uppercase mb-5 shadow-xs border border-blue-200/60">
          <Sparkles className="w-3.5 h-3.5 text-[#2563EB] fill-[#2563EB]" />
          <span>{t('landingPill')}</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B132B] tracking-tight leading-[1.14] mb-3">
          {t('heroLine1')} <br />
          {t('heroLine2Prefix')}
          <span className="text-[#2563EB]">{t('heroLine2Highlight')}</span>
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-slate-600 max-w-xs sm:max-w-md mx-auto font-normal mb-6 leading-relaxed">
          {t('heroSubtitle')}
        </p>

        {/* Two CTAs Side-by-Side as in the image */}
        <div className="flex flex-row items-center justify-center gap-3 w-full max-w-sm mb-9">
          <button
            onClick={onGetStarted}
            className="flex-1 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm py-3 px-5 rounded-full shadow-lg shadow-blue-600/25 flex items-center justify-center gap-1.5 transition-all hover:scale-102 cursor-pointer whitespace-nowrap"
          >
            <span>{t('getStarted')}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <a
            href="#tools"
            className="flex-1 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm py-3 px-5 rounded-full border border-slate-300 shadow-xs flex items-center justify-center gap-1.5 transition-all hover:border-slate-400 cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-slate-700 stroke-[2.2]" />
            <span>{t('learnMore')}</span>
          </a>
        </div>

        {/* ---------------- 3. Mockup Graphic (Desktop App inside phone frame) ---------------- */}
        <div className="relative w-full rounded-2xl shadow-xl border border-slate-300/80 bg-white overflow-hidden text-left mb-12">
          {/* Top macOS dark frame bar */}
          <div className="h-6 sm:h-7 bg-[#0F172A] px-3 flex items-center gap-1.5 border-b border-slate-800">
            <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          </div>

          {/* Miniature App Layout: Left Sidebar + Right Dashboard side by side */}
          <div className="flex bg-[#F8FAFC]">
            {/* Miniature Left Sidebar */}
            <div className="w-[30%] sm:w-[28%] bg-[#0A1128] p-2 sm:p-3 text-slate-300 flex flex-col justify-between shrink-0 select-none">
              <div className="space-y-2.5">
                {/* Brand */}
                <div className="flex items-center gap-1 px-0.5">
                  <div className="w-3.5 h-3.5 rounded bg-blue-600 flex items-center justify-center">
                    <Shield className="w-2 h-2 text-white fill-white/20" />
                  </div>
                  <span className="font-extrabold text-[9px] sm:text-[11px] text-white tracking-tight">CoreAudit</span>
                </div>

                {/* Nav Items */}
                <div className="space-y-1 text-[8px] sm:text-[10px]">
                  <div className="px-1.5 py-1 rounded-md bg-[#2563EB] text-white font-semibold flex items-center gap-1 shadow-xs">
                    <span className="text-[7px]">🏠</span>
                    <span className="truncate">{t('dashboard')}</span>
                  </div>
                  <div className="px-1.5 py-0.5 text-slate-400 flex items-center gap-1">
                    <span className="font-mono text-[6px]">{'</>'}</span>
                    <span className="truncate">{t('codeAuditor')}</span>
                  </div>
                  <div className="px-1.5 py-0.5 text-slate-400 flex items-center gap-1">
                    <span className="text-[7px]">📊</span>
                    <span className="truncate">{t('businessEvaluator')}</span>
                  </div>
                  <div className="px-1.5 py-0.5 text-slate-400 flex items-center gap-1">
                    <span className="text-[7px]">🕒</span>
                    <span className="truncate">{t('history')}</span>
                  </div>
                  <div className="px-1.5 py-0.5 text-slate-400 flex items-center gap-1">
                    <span className="text-[7px]">⚙️</span>
                    <span className="truncate">{t('settings')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Miniature Right Dashboard Area */}
            <div className="flex-1 p-2.5 sm:p-4 bg-[#F8FAFC]">
              {/* Top Greeting */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-[10px] sm:text-[13px] font-bold text-slate-900 leading-tight">
                    {t('welcomeMockup')}
                  </h3>
                  <p className="text-[7px] sm:text-[9px] text-slate-400">
                    {t('chooseModuleMockup')}
                  </p>
                </div>
                {/* User avatar circle */}
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center">
                  <User className="w-2.5 h-2.5 text-slate-400" />
                </div>
              </div>

              {/* Two modules inside mockup (Non-clickable graphic elements as requested) */}
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2.5">
                {/* Card 1: Code Auditor */}
                <div className="p-2 sm:p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#2563EB] text-white flex items-center justify-center font-mono font-bold text-[8px] sm:text-[10px] mb-1.5 shadow-2xs">
                      {'</>'}
                    </div>
                    <h4 className="font-bold text-[8px] sm:text-[10px] text-slate-900 leading-tight">
                      {t('codeAuditor')}
                    </h4>
                    <p className="text-[6.5px] sm:text-[8px] text-slate-400 mt-0.5 mb-2 leading-tight line-clamp-2">
                      {t('scanCodeSubMockup')}
                    </p>
                  </div>
                  <div
                    className="w-full py-1 bg-[#2563EB] text-white text-[7px] sm:text-[9px] font-bold rounded-md flex items-center justify-center gap-0.5 pointer-events-none select-none"
                  >
                    <span>{t('scanCodeMockup')}</span>
                    <ArrowRight className="w-2 h-2" />
                  </div>
                </div>

                {/* Card 2: Business Evaluator */}
                <div className="p-2 sm:p-2.5 rounded-lg border border-slate-200 bg-white shadow-2xs flex flex-col justify-between select-none">
                  <div>
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-[#0D9488] text-white flex items-center justify-center mb-1.5 shadow-2xs">
                      <TrendingUp className="w-3 h-3" />
                    </div>
                    <h4 className="font-bold text-[8px] sm:text-[10px] text-slate-900 leading-tight">
                      {t('businessEvaluator')}
                    </h4>
                    <p className="text-[6.5px] sm:text-[8px] text-slate-400 mt-0.5 mb-2 leading-tight line-clamp-2">
                      {t('evalBizSubMockup')}
                    </p>
                  </div>
                  <div
                    className="w-full py-1 bg-[#2563EB] text-white text-[7px] sm:text-[9px] font-bold rounded-md flex items-center justify-center gap-0.5 pointer-events-none select-none"
                  >
                    <span>{t('evalBizMockup')}</span>
                    <ArrowRight className="w-2 h-2" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------- 4. Section: TWO POWERFUL TOOLS ---------------- */}
        <section id="tools" className="w-full space-y-4 text-left">
          {/* Header */}
          <div className="text-center mb-6">
            <span className="text-[11px] font-extrabold text-[#2563EB] uppercase tracking-wider block mb-1">
              {t('twoToolsLabel')}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B132B] tracking-tight">
              {t('toolsHeadline')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xs sm:max-w-md mx-auto mt-1.5 leading-relaxed">
              {t('toolsSubhead')}
            </p>
          </div>

          {/* Feature Card 1: Technical Code Auditor */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0D1527] shadow-sm space-y-3.5 transition-colors duration-200">
            <div className="flex items-start gap-4">
              {/* Left icon */}
              <div className="w-12 h-12 rounded-xl bg-[#2563EB] text-white flex items-center justify-center font-mono font-bold text-lg shadow-sm shadow-blue-500/20 shrink-0">
                {'</>'}
              </div>

              {/* Title & subtitle */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0B132B] dark:text-white tracking-tight">
                  {t('techCodeAuditor')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('techCodeAuditorSub')}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium pt-1">
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{t('checkCode1')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{t('checkCode2')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{t('checkCode3')}</span>
              </li>
            </ul>
          </div>

          {/* Feature Card 2: Strategic Business Evaluator */}
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0D1527] shadow-sm space-y-3.5 transition-colors duration-200">
            <div className="flex items-start gap-4">
              {/* Left icon */}
              <div className="w-12 h-12 rounded-xl bg-[#0D9488] text-white flex items-center justify-center shadow-sm shadow-teal-500/20 shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>

              {/* Title & subtitle */}
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#0B132B] dark:text-white tracking-tight">
                  {t('stratBizEvaluator')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('stratBizEvaluatorSub')}
                </p>
              </div>
            </div>

            {/* Checklist */}
            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium pt-1">
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{t('checkBiz1')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{t('checkBiz2')}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-[#0D9488] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
                <span>{t('checkBiz3')}</span>
              </li>
            </ul>
          </div>

          {/* Contact Card Image matching Strategic Business Evaluator size without outer wrapper shape */}
          <img
            src="/assets/meta/contact_card.jpg"
            alt="Contact Us - Get in Touch"
            className="w-full h-auto rounded-2xl object-cover block dark:invert-[0.92] dark:hue-rotate-180 dark:brightness-95 transition-all duration-300"
          />

          {/* Copyright notice directly on background below contact card (no separate footer bar) */}
          <div className="pt-2 sm:pt-4 pb-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              © 2026 CoreAudit. All Rights Reserved.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
