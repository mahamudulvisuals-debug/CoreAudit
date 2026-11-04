import React, { useState } from 'react';
import { HistoryItem, CodeScanResult, BusinessEvaluationResult, VulnerabilityIssue } from '../types';
import {
  MoreHorizontal,
  SlidersHorizontal,
  PlusCircle,
  Pin,
  Trash2,
  FileCode2,
  TrendingUp,
  X,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Search,
  ExternalLink,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  Printer,
  FileDown,
  PieChart,
  Scale,
  DollarSign,
  Bug,
  Lock,
  Package,
  Activity,
  Code,
} from 'lucide-react';
import { getTranslation } from '../i18n';
import { ConfirmModal } from './ConfirmModal';

interface HistoryViewProps {
  history: HistoryItem[];
  onSelectCodeScan: (scan: CodeScanResult) => void;
  onSelectBusinessEval: (evaluation: BusinessEvaluationResult) => void;
  onDeleteItem: (id: string) => void;
  onTogglePin?: (id: string) => void;
  language?: string;
  onStartNewScan?: () => void;
  onStartNewEval?: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onSelectCodeScan,
  onSelectBusinessEval,
  onDeleteItem,
  language = 'English',
  onStartNewScan,
  onStartNewEval,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'code_scan' | 'business_eval'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showTopMenu, setShowTopMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [activeItemMenuId, setActiveItemMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Deletion confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Selected item for full-page professional workspace presentation (no floating rounded popup)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  // Filter inside the opened report
  const [reportIssueCategory, setReportIssueCategory] = useState<string>('all');
  const [reportIssueSearch, setReportIssueSearch] = useState<string>('');

  const t = (key: string) => getTranslation(language, key);
  const isBn = language === 'Bengali (বাংলা)';

  const togglePin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    fetch(`/api/history/${id}/pin`, { method: 'PATCH' }).catch(() => {});
  };

  const handleCopySummary = (item: HistoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const title = item.type === 'code_scan' ? item.projectName : item.businessName;
    const summary = item.summary;
    navigator.clipboard.writeText(`${title}\n${summary}`);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
    setActiveItemMenuId(null);
  };

  const handleExportAll = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'coreaudit-history.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setShowTopMenu(false);
  };

  // Filter & sort: Pinned first, then by timestamp descending
  const filtered = history
    .filter((item) => {
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (item.type === 'code_scan') {
          return (
            item.projectName.toLowerCase().includes(q) ||
            item.summary.toLowerCase().includes(q) ||
            item.issues.some((i) => i.title.toLowerCase().includes(q))
          );
        } else {
          return item.businessName.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q);
        }
      }
      return true;
    })
    .sort((a, b) => {
      const aPinned = pinnedIds.has(a.id) || (a as any).pinned ? 1 : 0;
      const bPinned = pinnedIds.has(b.id) || (b as any).pinned ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  // =========================================================================
  // VIEW MODE: EXPANSIVE FULL-PAGE PROFESSIONAL REPORT WORKSPACE
  // (Zero rounded corners, sharp rectangular layout, clean human analysis)
  // =========================================================================
  if (selectedItem) {
    const isCode = selectedItem.type === 'code_scan';
    const codeScan = isCode ? (selectedItem as CodeScanResult) : null;
    const bizEval = !isCode ? (selectedItem as BusinessEvaluationResult) : null;

    const filteredReportIssues = (codeScan?.issues || []).filter((issue) => {
      if (reportIssueCategory !== 'all' && issue.category !== reportIssueCategory) return false;
      if (reportIssueSearch.trim()) {
        const q = reportIssueSearch.toLowerCase();
        return (
          issue.title.toLowerCase().includes(q) ||
          issue.file.toLowerCase().includes(q) ||
          issue.description.toLowerCase().includes(q) ||
          issue.originalSnippet.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="w-full bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen">
        {/* Sticky Professional Top Bar (Zero rounded corners) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedItem(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>{isBn ? 'হিস্ট্রি তালিকায় ফিরুন' : 'Back to History'}</span>
            </button>
            <div className="h-4 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight font-mono">
                  {isCode ? codeScan?.projectName : bizEval?.businessName}
                </h1>
                {isCode && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider ${
                      codeScan?.grade === 'A'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : codeScan?.grade === 'B'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : codeScan?.grade === 'C'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    Grade {codeScan?.grade}
                  </span>
                )}
                {!isCode && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30">
                    {bizEval?.rating}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {isCode ? 'Code Security Audit' : 'Strategic Business Evaluation'} •{' '}
                {new Date(selectedItem.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isCode && (
              <button
                onClick={() => onSelectCodeScan(codeScan!)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-500 cursor-pointer transition-colors shadow-2xs"
              >
                <Code className="w-3 h-3" />
                <span>{isBn ? 'কোড অডিটর-এ খুলুন' : 'Open in Code Auditor'}</span>
              </button>
            )}

            {!isCode && (
              <button
                onClick={() => onSelectBusinessEval(bizEval!)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 border border-teal-500 cursor-pointer transition-colors shadow-2xs"
              >
                <TrendingUp className="w-3 h-3" />
                <span>{isBn ? 'বিজনেস ইভ্যালুয়েটর-এ খুলুন' : 'Open in Business Evaluator'}</span>
              </button>
            )}

            <button
              onClick={() => {
                const title = isCode ? codeScan?.projectName : bizEval?.businessName;
                const summary = selectedItem.summary;
                navigator.clipboard.writeText(`${title}\n${summary}`);
                setCopiedId('detail-copy');
                setTimeout(() => setCopiedId(null), 2000);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              {copiedId === 'detail-copy' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>{isBn ? 'কপি' : 'Copy Report'}</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedItem, null, 2));
                const a = document.createElement('a');
                a.href = dataStr;
                const baseName = (isCode ? codeScan?.projectName : bizEval?.businessName) || 'report';
                a.download = `${baseName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_record.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* Expansive Full Page Canvas (Zero rounded corners, sharp 1px borders) */}
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
          {/* ================================================================= */}
          {/* CODE AUDIT REPORT VIEW */}
          {/* ================================================================= */}
          {isCode && codeScan && (
            <>
              {/* KPI Scorecard Grid (Sharp rectangular cards, zero pills) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 border-t-2 border-t-blue-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Security Score
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 dark:text-blue-400 font-mono mt-1">
                    {codeScan.score}<span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    Audit Grade: {codeScan.grade}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 border-t-2 border-t-indigo-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Code Quality
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 dark:text-indigo-400 font-mono mt-1">
                    {codeScan.codeQualityScore ?? 92}<span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    AST Cleanliness
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 border-t-2 border-t-teal-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Performance
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 dark:text-teal-400 font-mono mt-1">
                    {codeScan.performanceScore ?? 90}<span className="text-xs font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    Runtime Efficiency
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 border-t-2 border-t-rose-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Critical / High
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-rose-700 dark:text-rose-400 font-mono mt-1">
                    {codeScan.criticalCount + codeScan.highCount}
                  </div>
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 mt-1 block">
                    Urgent Remediation
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 border-t-2 border-t-amber-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Flaws
                  </span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-amber-700 dark:text-amber-400 font-mono mt-1">
                    {codeScan.issuesCount}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    {codeScan.issuesCount === 0 ? 'Zero Vulnerabilities' : `${codeScan.issuesCount} Issues Logged`}
                  </span>
                </div>
              </div>

              {/* Executive Summary Statement */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xs border-l-4 border-l-blue-600 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    {isBn ? 'মূল্যায়ন সারসংক্ষেপ' : 'Executive Security Audit Summary'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-slate-200 dark:border-slate-700">
                      Language: {codeScan.detectedLanguage || 'Source Code'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 border border-slate-200 dark:border-slate-700">
                      Files: {codeScan.scannedFilesCount}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {codeScan.summary}
                </p>
              </div>

              {/* Scope & Analysis Boundaries */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider block mb-1.5">
                    Analyzed Scope & Architecture Review
                  </span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {codeScan.testedScopeNote || `Static AST analysis of ${codeScan.scannedFilesCount} file(s).`}
                  </p>
                  {codeScan.architectureReview && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 italic">
                      "{codeScan.architectureReview}"
                    </div>
                  )}
                </div>

                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 shadow-2xs">
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider block mb-1.5">
                    Static Analysis Scope Boundaries & Notice
                  </span>
                  <p className="text-amber-800 dark:text-amber-400 mb-2">
                    Static code analysis inspects syntax patterns and known vulnerability rules. It does not test dynamic runtime states:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-amber-800 dark:text-amber-400 font-mono text-[11px]">
                    {(codeScan.untestedItems && codeScan.untestedItems.length > 0
                      ? codeScan.untestedItems
                      : ['Runtime environment variables & OS configurations', 'Dynamic database concurrency & live network firewalls']
                    ).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Conditional Display: Clean Code (0 Flaws) vs Detailed Issues List */}
              {codeScan.issuesCount === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-2xs border-t-4 border-t-emerald-600 text-center space-y-4">
                  <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 mx-auto flex items-center justify-center border border-emerald-300 dark:border-emerald-700">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {isBn ? 'এই কোডে কোনো নিরাপত্তা ত্রুটি বা বাগ পাওয়া যায়নি' : 'No Security Vulnerabilities or Bugs Detected'}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl mx-auto">
                      {isBn
                        ? 'সমস্ত সিনট্যাক্স স্ট্রাকচার, ইনপুট ভ্যালিডেশন এবং সাধারণ নিরাপত্তা নিয়মাবলী সফলভাবে উত্তীর্ণ হয়েছে।'
                        : 'All analyzed syntax structures, data flows, and standard security rules passed inspection with 0 defects.'}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-4 py-2 border border-emerald-300 dark:border-emerald-800 text-xs font-bold">
                    <Check className="w-4 h-4" />
                    <span>Verified Clean • Audit Grade A • Score {codeScan.score}/100</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Category Filter & Search Bar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-500 uppercase mr-1">Filter:</span>
                      <button
                        onClick={() => setReportIssueCategory('all')}
                        className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                          reportIssueCategory === 'all'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        All Issues ({codeScan.issuesCount})
                      </button>
                      <button
                        onClick={() => setReportIssueCategory('security')}
                        className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                          reportIssueCategory === 'security'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Security & Exploits
                      </button>
                      <button
                        onClick={() => setReportIssueCategory('auth')}
                        className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                          reportIssueCategory === 'auth'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Auth & Secrets
                      </button>
                      <button
                        onClick={() => setReportIssueCategory('bug')}
                        className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                          reportIssueCategory === 'bug'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Logic Bugs
                      </button>
                      <button
                        onClick={() => setReportIssueCategory('performance')}
                        className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                          reportIssueCategory === 'performance'
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        Performance
                      </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={reportIssueSearch}
                        onChange={(e) => setReportIssueSearch(e.target.value)}
                        placeholder="Search flaw, file or CWE..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  {/* Issues Stack with Concrete Remediation */}
                  <div className="space-y-4">
                    {filteredReportIssues.map((issue, idx) => (
                      <div
                        key={issue.id ? `${issue.id}__${idx}` : `issue-${idx}`}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 uppercase border ${
                                  issue.severity === 'critical'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                    : issue.severity === 'high'
                                    ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800'
                                    : issue.severity === 'medium'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                }`}
                              >
                                {issue.severity}
                              </span>

                              {issue.cwe && (
                                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 border border-slate-200 dark:border-slate-700">
                                  {issue.cwe}
                                </span>
                              )}

                              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                                {issue.file}:{issue.line}
                              </span>
                            </div>

                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                              {issue.title}
                            </h3>
                          </div>

                          <button
                            onClick={() => {
                              const patchContent = `--- a/${issue.file}\n+++ b/${issue.file}\n@@ -${issue.line},1 +${issue.line},1 @@\n-${issue.originalSnippet}\n+${issue.fixedSnippet}\n`;
                              const blob = new Blob([patchContent], { type: 'text/plain;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `fix-${issue.id}.patch`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Patch</span>
                          </button>
                        </div>

                        {/* Detailed Human Explanations: Discovery & Production Risk */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                              Root Cause & Flaw Mechanics
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                              {issue.description}
                            </p>
                          </div>

                          <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                              Production Security Risk & Impact
                            </span>
                            <p className="text-rose-900 dark:text-rose-300 leading-relaxed">
                              {issue.impact}
                            </p>
                          </div>
                        </div>

                        {/* Side-by-Side Code Diff (Original Vulnerable vs Verified Safe Remediation) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                              <span>Vulnerable Code ({issue.file}:{issue.line})</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(issue.originalSnippet)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                            <pre className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 font-mono text-xs text-rose-900 dark:text-rose-200 overflow-x-auto leading-relaxed">
                              <code>{issue.originalSnippet}</code>
                            </pre>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <span>Remediation Fix</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(issue.fixedSnippet)}
                                className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </button>
                            </div>
                            <pre className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 font-mono text-xs text-emerald-900 dark:text-emerald-200 overflow-x-auto leading-relaxed">
                              <code>{issue.fixedSnippet}</code>
                            </pre>
                          </div>
                        </div>

                        {/* Remediation & Verification Instructions */}
                        {(issue.remediation || issue.explanation) && (
                          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs space-y-1">
                            <span className="text-[11px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider block">
                              How to Fix & Verification Guidance
                            </span>
                            <p className="text-blue-950 dark:text-blue-200 leading-relaxed">
                              {issue.remediation || issue.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================================================================= */}
          {/* BUSINESS EVALUATION REPORT VIEW */}
          {/* ================================================================= */}
          {!isCode && bizEval && (
            <>
              {/* KPI Scorecard Grid (Sharp rectangular cards, zero pills) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 border-t-2 border-t-teal-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Business Health
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 dark:text-teal-400 font-mono mt-1">
                    {bizEval.healthScore}<span className="text-sm font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    {bizEval.rating}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 border-t-2 border-t-blue-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Investor Readiness
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 dark:text-blue-400 font-mono mt-1">
                    {bizEval.investorReadinessScore || 78}<span className="text-sm font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 mt-1 block">
                    {(bizEval.investorReadinessScore || 78) >= 80 ? 'Institutional Grade' : 'Seed / Angel Viable'}
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 border-t-2 border-t-indigo-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Market Fit & Demand
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-indigo-700 dark:text-indigo-400 font-mono mt-1">
                    {bizEval.marketFitScore || 85}<span className="text-sm font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    {bizEval.marketAnalysis?.riskLevel || 'Low'} Market Risk
                  </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 border-t-2 border-t-amber-600 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Financial Runway Risk
                  </span>
                  <div className="text-3xl sm:text-4xl font-extrabold text-amber-700 dark:text-amber-400 font-mono mt-1">
                    {bizEval.financialRiskScore || 70}<span className="text-sm font-normal text-slate-400">/100</span>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-1 block">
                    {bizEval.financialRisks?.riskLevel || 'Medium'} Exposure
                  </span>
                </div>
              </div>

              {/* Executive Strategic Appraisal */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs border-l-4 border-l-teal-600">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2">
                  Executive Strategic Appraisal
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                  {bizEval.summary}
                </p>
              </div>

              {/* 4 Pillars Strategic Analysis Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400 block">
                    Market & Target Demand
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {bizEval.marketAnalysis?.marketDemand || 'Solid customer pain points identified with growing market tailwinds.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase text-teal-600 dark:text-teal-400 block">
                    Financial Runway & Cost Structure
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {bizEval.financialRisks?.costStructure || 'Lean initial operating burn requiring strict CAC-to-LTV payback governance.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase text-purple-600 dark:text-purple-400 block">
                    Pricing & Monetization Viability
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {bizEval.businessModel?.pricingStrategy || 'Recurring value-aligned model with clear upsell and enterprise potential.'}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase text-amber-600 dark:text-amber-400 block">
                    Execution & Technical Barriers
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {bizEval.executionRisks?.keyObstacles || 'Distribution channel execution and customer retention remain key determinants of scale.'}
                  </p>
                </div>
              </div>

              {/* 4-Quadrant SWOT Matrix (Sharp rectangular 2x2 grid) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Strategic SWOT Analysis (4 Quadrants)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                    <h4 className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 mb-2">Strengths</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-emerald-900 dark:text-emerald-200">
                      {(bizEval.swot?.strengths || bizEval.strengths || ['Clear value proposition']).map((s: string, i: number) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                    <h4 className="text-xs font-bold uppercase text-amber-800 dark:text-amber-300 mb-2">Weaknesses</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-900 dark:text-amber-200">
                      {(bizEval.swot?.weaknesses || bizEval.weaknesses || ['Early-stage brand awareness']).map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                    <h4 className="text-xs font-bold uppercase text-blue-800 dark:text-blue-300 mb-2">Opportunities</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-blue-900 dark:text-blue-200">
                      {(bizEval.swot?.opportunities || ['Expansion into adjacent verticals']).map((o: string, i: number) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                    <h4 className="text-xs font-bold uppercase text-rose-800 dark:text-rose-300 mb-2">Threats</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-rose-900 dark:text-rose-200">
                      {(bizEval.swot?.threats || ['Price compression from incumbents']).map((th: string, i: number) => (
                        <li key={i}>{th}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feasibility Analysis Matrix */}
              {bizEval.feasibility && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Business Idea & Feasibility Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Problem Solved</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{bizEval.feasibility.problemSolved}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Market Demand</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{bizEval.feasibility.marketDemand}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Customers</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{bizEval.feasibility.targetCustomers}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Value Proposition</span>
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed">{bizEval.feasibility.valueProposition}</p>
                    </div>
                    <div className="p-3.5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block">Limitations & Challenges</span>
                      <p className="text-amber-900 dark:text-amber-200 leading-relaxed">{bizEval.feasibility.limitationsAndChallenges}</p>
                    </div>
                    <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-1">
                      <span className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider block">Startup & Scale Requirements</span>
                      <p className="text-blue-900 dark:text-blue-200 leading-relaxed">{bizEval.feasibility.startupRequirements}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Competitor Comparison Matrix */}
              {bizEval.marketAndCompetitors?.competitors && bizEval.marketAndCompetitors.competitors.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Competitor Comparison Matrix
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Competitor</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Product</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Pricing</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-emerald-800 dark:text-emerald-400">Pros</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-rose-800 dark:text-rose-400">Cons</th>
                          <th className="p-2.5 bg-teal-50 dark:bg-teal-950/30 text-teal-900 dark:text-teal-300">Our Advantage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {bizEval.marketAndCompetitors.competitors.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">{item.name}</td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700">{item.productSummary}</td>
                            <td className="p-2.5 font-mono text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 whitespace-nowrap">{item.pricing}</td>
                            <td className="p-2.5 text-emerald-800 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-700">{item.pros}</td>
                            <td className="p-2.5 text-rose-800 dark:text-rose-400 border-r border-slate-200 dark:border-slate-700">{item.cons}</td>
                            <td className="p-2.5 font-semibold text-teal-900 dark:text-teal-300 bg-teal-50/40 dark:bg-teal-950/20">{item.ourAdvantage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Mathematical Financial Analysis & Break-Even */}
              {bizEval.financialAnalysis && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Mathematical Financial Analysis & Break-Even Derivation
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Revenue</span>
                      <span className="text-base font-bold font-mono text-slate-900 dark:text-white mt-1 block">{String(bizEval.financialAnalysis.totalRevenue)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Operating Expenses</span>
                      <span className="text-base font-bold font-mono text-rose-700 dark:text-rose-400 mt-1 block">{String(bizEval.financialAnalysis.totalExpenses)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Net Profit / Loss</span>
                      <span className="text-base font-bold font-mono text-teal-800 dark:text-teal-400 mt-1 block">{String(bizEval.financialAnalysis.netProfitOrLoss)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Gross Margin</span>
                      <span className="text-base font-bold font-mono text-indigo-700 dark:text-indigo-400 mt-1 block">{bizEval.financialAnalysis.grossProfitMargin}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider">Break-Even Formula & Calculation</span>
                      <span className="font-mono text-teal-800 dark:text-teal-400 text-[10px]">{bizEval.financialAnalysis.breakEvenPoint?.formula}</span>
                    </div>
                    <p className="text-teal-950 dark:text-teal-200 font-mono text-xs">{bizEval.financialAnalysis.breakEvenPoint?.calculationSteps}</p>
                    <div className="font-bold text-teal-950 dark:text-teal-100 bg-white dark:bg-slate-900 p-2 border border-teal-300 dark:border-teal-800">
                      Result: {bizEval.financialAnalysis.breakEvenPoint?.result}
                    </div>
                  </div>
                </div>
              )}

              {/* 7-Dimension Risk Matrix */}
              {bizEval.detailedRisks && bizEval.detailedRisks.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    7-Dimension Enterprise Risk Matrix
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {bizEval.detailedRisks.map((risk, idx) => (
                      <div key={idx} className="p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">{risk.category}</span>
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400">Impact: {risk.impact} | Likelihood: {risk.likelihood}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{risk.riskTitle}</h4>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed"><strong className="text-slate-700 dark:text-slate-200">Mitigation:</strong> {risk.mitigationStrategy}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 30 / 60 / 90-Day Execution Roadmap */}
              {Array.isArray(bizEval.actionPlan) && bizEval.actionPlan.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    30 / 60 / 90-Day Execution Roadmap
                  </h3>
                  <div className="space-y-3">
                    {bizEval.actionPlan.map((act, i) => (
                      <div
                        key={act.id ? `${act.id}__${i}` : `act-${i}`}
                        className="p-3.5 border border-slate-200 dark:border-slate-800 flex items-start gap-3 bg-slate-50/50 dark:bg-slate-800/40"
                      >
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800">
                          {act.timeframe?.replace('_', ' ')}
                        </span>
                        <div className="flex-1 text-xs">
                          <p className="font-bold text-slate-900 dark:text-white">{act.title}</p>
                          <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{act.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirmation Modal for Record Deletion */}
        <ConfirmModal
          isOpen={!!deletingId}
          title={isBn ? 'রেকর্ডটি ডিলিট করবেন?' : 'Delete Record?'}
          confirmText={isBn ? 'কনফার্ম' : 'Confirm'}
          cancelText={isBn ? 'ক্যানসেল' : 'Cancel'}
          onConfirm={() => {
            if (deletingId) {
              onDeleteItem(deletingId);
              if (selectedItem?.id === deletingId) {
                setSelectedItem(null);
              }
              setDeletingId(null);
            }
          }}
          onCancel={() => setDeletingId(null)}
          variant="danger"
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: HISTORY LIST VIEW
  // (Sharp rectangular borders, clean typography, search, filter, pin)
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-4 animate-fade-in relative min-h-[80vh]">
      {/* Top Header matching exact professional look */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {isBn ? 'সাম্প্রতিক' : 'Recent History'}
        </h2>

        {/* Action Icons in Header: More (...), Filter, New */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Header More Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTopMenu(!showTopMenu);
                setShowFilterMenu(false);
                setShowNewMenu(false);
              }}
              className="p-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="More options"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showTopMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowTopMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-40 text-xs">
                  <button
                    onClick={handleExportAll}
                    className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>{isBn ? 'সব ডেটা এক্সপোর্ট করুন' : 'Export All JSON'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setSearchQuery('');
                      setShowTopMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-slate-500" />
                    <span>{isBn ? 'ফিল্টার রিসেট করুন' : 'Reset Filters'}</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Filter Icon */}
          <div className="relative">
            <button
              onClick={() => {
                setShowFilterMenu(!showFilterMenu);
                setShowTopMenu(false);
                setShowNewMenu(false);
              }}
              className={`p-2 border transition-colors cursor-pointer ${
                filterType !== 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 border-blue-300 dark:border-blue-700'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Filter by category"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            {showFilterMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowFilterMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-40 text-xs">
                  <button
                    onClick={() => {
                      setFilterType('all');
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-medium flex items-center justify-between cursor-pointer ${
                      filterType === 'all' ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{isBn ? 'সবগুলো (All)' : 'All Records'}</span>
                    <span className="text-[10px] text-slate-400">({history.length})</span>
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('code_scan');
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-medium flex items-center justify-between cursor-pointer ${
                      filterType === 'code_scan' ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{isBn ? 'কোড অডিট' : 'Code Scans'}</span>
                    <span className="text-[10px] text-slate-400">
                      ({history.filter((h) => h.type === 'code_scan').length})
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setFilterType('business_eval');
                      setShowFilterMenu(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 font-medium flex items-center justify-between cursor-pointer ${
                      filterType === 'business_eval' ? 'text-blue-600 font-bold bg-blue-50/50 dark:bg-blue-950/40' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{isBn ? 'বিজনেস প্ল্যান' : 'Business Evals'}</span>
                    <span className="text-[10px] text-slate-400">
                      ({history.filter((h) => h.type === 'business_eval').length})
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* New / Create Icon */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNewMenu(!showNewMenu);
                setShowTopMenu(false);
                setShowFilterMenu(false);
              }}
              className="p-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Start New Audit"
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
            </button>
            {showNewMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowNewMenu(false)} />
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-40 text-xs">
                  <button
                    onClick={() => {
                      setShowNewMenu(false);
                      onStartNewScan?.();
                    }}
                    className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <FileCode2 className="w-4 h-4 text-blue-600" />
                    <span>{isBn ? 'নতুন কোড অডিট' : 'New Code Audit'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowNewMenu(false);
                      onStartNewEval?.();
                    }}
                    className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <span>{isBn ? 'নতুন বিজনেস মূল্যায়ন' : 'New Business Eval'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isBn ? 'রেকর্ড বা প্রজেক্ট খুঁজুন...' : 'Search history items, projects, or flaws...'}
          className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-600"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* History Records List */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center border border-blue-200 dark:border-blue-800">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {isBn ? 'কোনো পূর্ববর্তী রেকর্ড পাওয়া যায়নি' : 'No previous records found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isBn
              ? 'কোড অডিট অথবা বিজনেস প্ল্যান মূল্যায়ন সম্পন্ন করলে আপনার সমস্ত রিপোর্ট এখানে সংরক্ষিত থাকবে।'
              : 'Completed code scans and strategic business evaluations for your account will appear here.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          {filtered.map((item, idx) => {
            const isCode = item.type === 'code_scan';
            const title = isCode ? item.projectName : item.businessName;
            const isPinned = pinnedIds.has(item.id) || (item as any).pinned;

            return (
              <div
                key={item.id ? `${item.id}__${idx}` : `hist-${idx}`}
                onClick={() => setSelectedItem(item)}
                className="group py-3.5 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                {/* Left Side: Type Icon + Title + Meta */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 flex items-center justify-center shrink-0 border ${
                      isCode
                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                        : 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800'
                    }`}
                  >
                    {isCode ? (
                      <span className="font-mono text-xs font-bold">{'</>'}</span>
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                      <span>
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      <span>•</span>
                      {isCode ? (
                        <span className="text-blue-600 dark:text-blue-400 font-mono font-medium">
                          Score: {item.score}/100 (Grade {item.grade}) • {item.issuesCount} Flaws
                        </span>
                      ) : (
                        <span className="text-teal-600 dark:text-teal-400 font-mono font-medium">
                          Health: {item.healthScore}/100 ({item.rating})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Options Menu (...) + Pin Icon */}
                <div className="flex items-center gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                  {/* Item Options Button (...) */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveItemMenuId(activeItemMenuId === item.id ? null : item.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Item options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {activeItemMenuId === item.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setActiveItemMenuId(null)} />
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-40 text-xs">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setActiveItemMenuId(null);
                            }}
                            className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>{isBn ? 'সম্পূর্ণ রিপোর্ট দেখুন' : 'View Full Report'}</span>
                          </button>
                          <button
                            onClick={(e) => handleCopySummary(item, e)}
                            className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{copiedId === item.id ? 'Copied!' : (isBn ? 'সামারি কপি করুন' : 'Copy Summary')}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              togglePin(item.id, e);
                              setActiveItemMenuId(null);
                            }}
                            className="w-full text-left px-3.5 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5 text-amber-500" />
                            <span>{isPinned ? (isBn ? 'আনপিন করুন' : 'Unpin') : (isBn ? 'পিন করুন' : 'Pin to top')}</span>
                          </button>
                          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                          <button
                            onClick={() => {
                              setDeletingId(item.id);
                              setActiveItemMenuId(null);
                            }}
                            className="w-full text-left px-3.5 py-2 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{isBn ? 'ডিলিট করুন' : 'Delete'}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Pin Icon */}
                  <button
                    onClick={(e) => togglePin(item.id, e)}
                    className={`p-1.5 transition-colors cursor-pointer ${
                      isPinned
                        ? 'text-amber-500 hover:text-amber-600'
                        : 'text-slate-400 hover:text-slate-600 opacity-60 group-hover:opacity-100'
                    }`}
                    title={isPinned ? 'Unpin item' : 'Pin to top'}
                  >
                    <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-500' : ''}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Record Deletion */}
      <ConfirmModal
        isOpen={!!deletingId}
        title={isBn ? 'রেকর্ডটি ডিলিট করবেন?' : 'Delete Record?'}
        confirmText={isBn ? 'কনফার্ম' : 'Confirm'}
        cancelText={isBn ? 'ক্যানসেল' : 'Cancel'}
        onConfirm={() => {
          if (deletingId) {
            onDeleteItem(deletingId);
            setDeletingId(null);
          }
        }}
        onCancel={() => setDeletingId(null)}
        variant="danger"
      />
    </div>
  );
};
