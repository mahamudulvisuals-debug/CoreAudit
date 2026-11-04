import React from 'react';
import { ViewMode, HistoryItem } from '../types';
import {
  Shield,
  ArrowRight,
  TrendingUp,
  Lightbulb,
  CheckCircle2,
  ShieldAlert,
  FileCheck2,
  Activity,
} from 'lucide-react';
import { getTranslation } from '../i18n';

interface DashboardViewProps {
  onNavigate: (view: ViewMode) => void;
  history: HistoryItem[];
  language?: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  history,
  language = 'English',
}) => {
  const t = (key: string) => getTranslation(language, key);

  const codeScans = history.filter((h) => h.type === 'code_scan');
  const businessEvals = history.filter((h) => h.type === 'business_eval');

  // Compute actual vulnerabilities across distinct audited projects (prevents double-counting duplicate re-scans)
  const latestProjectScans = new Map<string, any>();
  for (const scan of codeScans) {
    const key = scan.projectName || scan.id;
    if (!latestProjectScans.has(key)) {
      latestProjectScans.set(key, scan);
    }
  }
  const totalIssuesFound = Array.from(latestProjectScans.values())
    .reduce((acc, curr: any) => acc + (curr.issuesCount || (Array.isArray(curr.issues) ? curr.issues.length : 0) || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Top Welcome Section matching Image 2 */}
      <div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 text-blue-700 text-xs font-bold tracking-wide mb-3">
          <Shield className="w-3.5 h-3.5 text-blue-600 fill-blue-600/20" />
          <span>{t('welcomePill')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t('welcomeBack')}
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-1">
          {t('chooseModule')}
        </p>
      </div>

      {/* Two Main Action Cards in Grid matching Image 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Module 1: Code Auditor */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-mono font-bold text-xl mb-6 shadow-md shadow-blue-500/25">
              {'</>'}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t('codeAuditor')}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {t('scanCodeSubMockup')}
            </p>
          </div>

          <button
            onClick={() => onNavigate('code-auditor')}
            className="w-full sm:w-auto self-start bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all hover:scale-101 cursor-pointer"
          >
            <span>{t('scanCodeBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Module 2: Business Evaluator */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mb-6 shadow-md shadow-teal-500/25">
              <TrendingUp className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {t('businessEvaluator')}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {t('evalBizSubMockup')}
            </p>
          </div>

          <button
            onClick={() => onNavigate('business-evaluator')}
            className="w-full sm:w-auto self-start bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md shadow-teal-600/20 flex items-center justify-center gap-2 transition-all hover:scale-101 cursor-pointer"
          >
            <span>{t('evaluateBizBtn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Advice Banner matching Image 2 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Content */}
          <div className="lg:col-span-7 flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                {t('bestResultsTitle')}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                {t('bestResultsDesc')}
              </p>
            </div>
          </div>

          {/* Right Checklist */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-semibold text-slate-700">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('secureReliable')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('aiAnalysis')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('actionableInsights')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{t('saveTrackHistory')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live System Performance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t('completedCodeScans')}</p>
            <p className="text-lg font-bold text-slate-800">{codeScans.length}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t('bizEvaluations')}</p>
            <p className="text-lg font-bold text-slate-800">{businessEvals.length}</p>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">{t('flawsNeutralized')}</p>
            <p className="text-lg font-bold text-slate-800">{totalIssuesFound} {t('flaws')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
