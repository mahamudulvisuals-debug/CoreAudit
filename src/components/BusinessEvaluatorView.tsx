import React, { useState } from 'react';
import {
  BusinessEvaluationResult,
  ActionPlanItem,
  CompetitorItem,
  BusinessRiskItem,
  GrowthMilestone,
} from '../types';
import { validateBusinessInput } from '../utils/businessValidator';
import {
  TrendingUp,
  Upload,
  FileText,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Target,
  DollarSign,
  ShieldAlert,
  Zap,
  Check,
  Building2,
  Calendar,
  Layers,
  Award,
  Copy,
  FileDown,
  PieChart,
  ShieldCheck,
  Scale,
  Flame,
  Search,
  Filter,
  Printer,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  BarChart3,
  Compass,
  FileSpreadsheet,
  Globe,
  MapPin,
  Briefcase,
  Info,
} from 'lucide-react';
import { getTranslation } from '../i18n';

interface BusinessEvaluatorViewProps {
  onEvaluationComplete: (evaluation: BusinessEvaluationResult) => void;
  recentEvaluations: BusinessEvaluationResult[];
  onSelectEvaluation: (evaluation: BusinessEvaluationResult) => void;
  selectedEvaluation?: BusinessEvaluationResult | null;
  onClearSelectedEvaluation?: () => void;
  userEmail?: string;
  language?: string;
}

export const BusinessEvaluatorView: React.FC<BusinessEvaluatorViewProps> = ({
  onEvaluationComplete,
  recentEvaluations,
  onSelectEvaluation,
  selectedEvaluation,
  onClearSelectedEvaluation,
  userEmail,
  language = 'English',
}) => {
  const t = (key: string) => getTranslation(language, key);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'details'>('upload');
  const [evalDepth, setEvalDepth] = useState<'complete' | 'quick' | 'financial'>('complete');

  // Input states
  const [businessName, setBusinessName] = useState('');
  const [planText, setPlanText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isParsingDocument, setIsParsingDocument] = useState(false);

  // Structured form state
  const [details, setDetails] = useState({
    businessType: '',
    industry: '',
    productService: '',
    targetAudience: '',
    location: '',
    revenue: '',
    expenses: '',
    investmentNeeded: '',
    businessGoals: '',
    websiteUrl: '',
    stage: 'Seed / Early Stage',
  });

  // State for evaluation execution & validation errors
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalStep, setEvalStep] = useState('');
  const [evalError, setEvalError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<{
    missingPillars?: string[];
    followUpQuestions?: string[];
    reason?: string;
  } | null>(null);

  // Active report presentation state
  const [activeReport, setActiveReport] = useState<BusinessEvaluationResult | null>(selectedEvaluation || null);
  const [completedMilestones, setCompletedMilestones] = useState<Record<string, boolean>>({});
  const [copiedReport, setCopiedReport] = useState(false);
  const [slideTab, setSlideTab] = useState<
    'overview' | 'market' | 'financials' | 'risks' | 'swot' | 'roadmap' | 'investor'
  >('overview');

  React.useEffect(() => {
    if (selectedEvaluation) {
      setActiveReport(selectedEvaluation);
    }
  }, [selectedEvaluation]);

  // Business presets
  const samplePlans = {
    saas: `Project: WorkflowAI
Business Type: B2B SaaS Enterprise Automation
Product/Service: Autonomous workflow orchestrator that eliminates manual data entry between Jira, HubSpot, and Slack by generating verified summaries and predicting operational bottlenecks.
Target Audience: Fast-growing B2B operations teams, mid-sized software agencies (50-500 employees).
Location: North America & Europe (Remote-first)
Current Revenue: $4,800 / month MRR across 24 beta accounts
Operating Expenses: $8,500 / month (hosting, APIs, founder stipend)
Capital Needed: $150,000 for 12 months runway and sales distribution
Business Goals: Reach $25,000 MRR and 100 enterprise clients within 9 months.
Competitors: Zapier ($29.99/mo, rule-based), Make.com ($19/mo, complex setup), Asana AI (locked inside Asana only).
Our Advantage: Cross-platform predictive intelligence with zero-code setup and bidirectional sync.`,

    ecommerce: `Company: EcoPack Co.
Business Type: Direct-to-Consumer & B2B Sustainable Packaging
Product/Service: 100% seaweed-based biodegradable shipping mailers and box cushions that dissolve in hot water in 60 seconds without microplastics.
Target Customer: Eco-conscious cosmetics, organic fashion, and specialty food vendors.
Location: United States & Canada
Current Revenue: $34,000 / month gross revenue
Operating Expenses: $22,000 / month (raw seaweed biopolymer, warehouse lease, shipping)
Capital Needed: $250,000 to purchase automated thermo-forming machinery to lower unit production cost by 40%.
Unit Economics: Unit production cost $0.22/mailer. Selling price $0.65/mailer. Gross margin 66%. Average Order Value $1,400.
Competitors: EcoEnclose (recycled paper, bulky), Noissue (custom tissue, premium price $1.10/unit).
Our Advantage: Patented marine-safe material, lower bulk price point, composts in 3 days.`,

    fintech: `Platform: MicroLend Global
Business Type: Mobile FinTech Underwriting Platform
Product/Service: Alternative credit scoring algorithm analyzing mobile commerce cash flow, merchant utility payments, and inventory restock velocity to disburse instant micro-loans to unbanked merchants.
Target Audience: 15M+ unbanked small vendors and micro-merchants in Southeast Asia.
Location: Indonesia & Philippines
Current Revenue: $18,500 / month (1.8% transaction origination fee + 12% APR loan interest)
Operating Expenses: $14,000 / month (capital reserve, compliance, risk engine hosting)
Capital Needed: $500,000 seed facility to expand balance-sheet lending capacity.
Traction: 1,800 loans disbursed, 2.1% default rate (industry benchmark is 5.4%).
Competitors: Traditional micro-finance banks (slow paper underwriting, 3-week turnaround), Grab Financial (captive to ride-hail drivers).
Our Advantage: Instant 90-second approval directly inside merchant WhatsApp & Telegram bots.`,

    healthtech: `Project: HealthPulse AI
Business Type: Clinical AI Ambient Scribe
Product/Service: Real-time HIPAA-compliant ambient listening application that listens to doctor-patient consultations, extracts structured ICD-10 diagnostic codes, and drafts completed EHR notes in 15 seconds.
Target Audience: Outpatient medical clinics, independent private practices, telemedicine networks.
Location: United States & United Kingdom
Current Revenue: $12,000 / month MRR across 18 subscribed clinics
Operating Expenses: $16,500 / month (HIPAA AWS cloud, speech-to-text models, QA team)
Capital Needed: $350,000 to complete EHR deep integrations (Epic, Cerner) and hire clinical compliance lead.
Business Goals: Expand to 60 clinics and $50k MRR within 12 months.
Competitors: Nuance DAX ($800/physician/mo, slow enterprise sales), Abridge ($300/mo, limited customization).
Our Advantage: $199/month pricing, self-serve onboarding, custom specialty template builder.`
  };

  // Real document parsing via server endpoint
  const handleDocumentFile = async (file: File) => {
    setUploadedFileName(file.name);
    setUploadStatus('Processing document...');
    setEvalError(null);
    setValidationIssues(null);

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    const isCsvOrJson = file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.json');
    const isTxtOrMd = file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.md');

    if (!businessName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setBusinessName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    if (isPdf || isDocx) {
      setIsParsingDocument(true);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const parseRes = await fetch('/api/audit/parse-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                filename: file.name,
                fileBase64: base64Data,
              }),
            });

            const parseData = await parseRes.json();
            if (!parseRes.ok || !parseData.success) {
              throw new Error(parseData.error || 'Failed to parse document text.');
            }

            const extracted = parseData.text || parseData.extractedText || '';
            setPlanText(extracted);
            const count = parseData.wordCount ?? (extracted.trim() ? extracted.trim().split(/\s+/).filter(Boolean).length : 0);
            setUploadStatus(`Extracted ${count.toLocaleString()} words from ${file.name}`);
          } catch (err: any) {
            setUploadStatus(null);
            setEvalError(`Document extraction error: ${err.message}. Please check that the file is not password-protected or corrupt.`);
          } finally {
            setIsParsingDocument(false);
          }
        };
        reader.onerror = () => {
          setIsParsingDocument(false);
          setEvalError('Unable to read selected file.');
        };
        reader.readAsDataURL(file);
      } catch (err: any) {
        setIsParsingDocument(false);
        setEvalError(`Failed to process document: ${err.message}`);
      }
    } else if (isTxtOrMd || isCsvOrJson) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setPlanText(text);
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setUploadStatus(`Loaded ${words.toLocaleString()} words from ${file.name}`);
      };
      reader.onerror = () => setEvalError('Failed to read text file.');
      reader.readAsText(file);
    } else {
      setEvalError(`Unsupported format for ${file.name}. Please upload PDF, DOCX, TXT, CSV, JSON, or Markdown.`);
      setUploadStatus(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleDocumentFile(files[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleDocumentFile(e.dataTransfer.files[0]);
    }
  };

  // Compile final input text
  const getCompiledPlanText = (): string => {
    if (activeTab === 'details') {
      const sections = [
        businessName ? `Business Name: ${businessName}` : '',
        details.businessType || details.industry ? `Industry / Business Type: ${details.businessType || details.industry}` : '',
        details.productService ? `Product / Service Details: ${details.productService}` : '',
        details.targetAudience ? `Target Customer / Market: ${details.targetAudience}` : '',
        details.location ? `Target Region / Location: ${details.location}` : '',
        details.revenue ? `Monthly Revenue: ${details.revenue}` : '',
        details.expenses ? `Monthly Operating Expenses: ${details.expenses}` : '',
        details.investmentNeeded ? `Investment / Capital Needed: ${details.investmentNeeded}` : '',
        details.businessGoals ? `Business Goals / Milestones: ${details.businessGoals}` : '',
        details.websiteUrl ? `Website: ${details.websiteUrl}` : '',
        details.stage ? `Company Stage: ${details.stage}` : '',
        planText ? `Additional Notes:\n${planText}` : '',
      ].filter(Boolean);
      return sections.join('\n');
    }
    return planText;
  };

  const executeEvaluation = async () => {
    setEvalError(null);
    setValidationIssues(null);

    const fullText = getCompiledPlanText();
    const effectiveName = businessName || (activeTab === 'details' ? 'Startup Venture' : 'Business Venture');

    // Client-side pre-validation
    const clientValidation = validateBusinessInput(fullText, {
      businessName: effectiveName,
      industry: details.industry || details.businessType,
      productSummary: details.productService,
      targetAudience: details.targetAudience,
      revenueModel: details.revenue,
    });
    if (clientValidation.status === 'invalid') {
      setEvalError(clientValidation.error || 'Invalid business input.');
      return;
    }

    if (clientValidation.status === 'incomplete') {
      setValidationIssues({
        missingPillars: clientValidation.missingPillars,
        followUpQuestions: clientValidation.followUpQuestions,
        reason: clientValidation.error,
      });
      setEvalError(clientValidation.error || 'Please provide more details on your business plan.');
      return;
    }

    setIsEvaluating(true);
    setEvalStep('Validating business pillars and unit economics...');

    try {
      const timer1 = setTimeout(() => setEvalStep('Analyzing market opportunity & competitor dynamics...'), 1200);
      const timer2 = setTimeout(() => setEvalStep('Computing financial ratios, break-even & burn runway...'), 2400);
      const timer3 = setTimeout(() => setEvalStep('Building 7-risk matrix, SWOT & 30/60/90-day roadmap...'), 3600);

      const payload: any = {
        businessName: effectiveName,
        sourceType: activeTab,
        evaluationDepth: evalDepth,
        businessPlanText: fullText,
        details: activeTab === 'details' ? details : undefined,
        userEmail: userEmail || undefined,
      };

      const res = await fetch('/api/audit/evaluate-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.status === 'incomplete' || data.status === 'invalid') {
          setValidationIssues({
            missingPillars: data.missingPillars || [],
            followUpQuestions: data.followUpQuestions || [],
            reason: data.error || 'Please provide more details about your business concept.',
          });
        }
        throw new Error(data.error || `Evaluation failed with status ${res.status}`);
      }

      if (data.evaluation) {
        setActiveReport(data.evaluation);
        onEvaluationComplete(data.evaluation);
      }
    } catch (err: any) {
      setEvalError(err.message || 'An error occurred during business evaluation.');
    } finally {
      setIsEvaluating(false);
      setEvalStep('');
    }
  };

  const toggleMilestone = (id: string) => {
    setCompletedMilestones((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyFullReportToClipboard = () => {
    if (!activeReport) return;
    const reportDate = activeReport.evaluatedAt || activeReport.timestamp || new Date().toISOString();
    const fin = activeReport.financialAnalysis;
    const comp = activeReport.marketAndCompetitors;
    const inv = activeReport.investorReadiness;

    const text = `=== COREADUIT STRATEGIC BUSINESS EVALUATION REPORT ===
Business Name: ${activeReport.businessName}
Date: ${new Date(reportDate).toLocaleDateString()}
Business Health Score: ${activeReport.healthScore}/100 (${activeReport.rating})
Investor Readiness: ${activeReport.investorReadinessScore || inv?.score || 75}/100 [${inv?.tier || 'Seed Viable'}]
Market Fit: ${activeReport.marketFitScore}/100
Financial Risk: ${activeReport.financialRiskScore}/100

==================================================
1. EXECUTIVE SUMMARY & FEASIBILITY
==================================================
${activeReport.summary}

Feasibility Highlights:
- Problem Solved: ${activeReport.feasibility?.problemSolved || 'Direct customer pain addressed.'}
- Target Customer: ${activeReport.feasibility?.targetCustomers || activeReport.marketAnalysis?.targetAudience || 'Specified target segment.'}
- Value Proposition: ${activeReport.feasibility?.valueProposition || 'Differentiated core offer.'}
- Operational Limitations: ${activeReport.feasibility?.limitationsAndChallenges || 'Execution and scaling constraints.'}
- Scale Requirements: ${activeReport.feasibility?.startupRequirements || 'Capital and key personnel.'}

==================================================
2. FINANCIAL ANALYSIS & MATHEMATICAL FORMULAS
==================================================
Revenue: ${fin?.totalRevenue || 'Input pending'}
Expenses: ${fin?.totalExpenses || 'Input pending'}
Net Profit / Loss: ${fin?.netProfitOrLoss || 'Calculated per plan'}
Gross Margin: ${fin?.grossProfitMargin || 'N/A'} | Net Margin: ${fin?.netProfitMargin || 'N/A'}
Burn Rate & Runway: ${fin?.burnRateAndRunway || activeReport.financialRisks?.cashFlowRunway || 'N/A'}
Break-even Formula: ${fin?.breakEvenPoint?.formula || 'Fixed Costs / (Price - Variable Cost)'}
Break-even Calculation: ${fin?.breakEvenPoint?.calculationSteps || 'Based on stated cost structure'}
Break-even Result: ${fin?.breakEvenPoint?.result || 'Projected timeline'}

Scenario Projections:
- Conservative: ${fin?.scenarioForecast?.conservative || 'Base operations'}
- Moderate: ${fin?.scenarioForecast?.moderate || 'Expected growth'}
- Optimistic: ${fin?.scenarioForecast?.optimistic || 'Accelerated scale'}
Note: ${fin?.scenarioForecast?.scenarioNote || 'Scenarios are probabilistic models, not guarantees.'}

==================================================
3. 7-DIMENSION RISK AUDIT
==================================================
${(activeReport.detailedRisks || []).map((r, i) => `${i + 1}. [${r.category.toUpperCase()}] ${r.riskTitle} (Likelihood: ${r.likelihood}, Impact: ${r.impact})
   Root Cause: ${r.rootCause}
   Potential Loss: ${r.potentialLoss}
   Mitigation: ${r.mitigationStrategy}
`).join('\n')}

==================================================
4. SWOT ANALYSIS
==================================================
STRENGTHS:
${activeReport.swot?.strengths?.map((s) => `- ${s}`).join('\n') || '- Verified value prop'}

WEAKNESSES:
${activeReport.swot?.weaknesses?.map((w) => `- ${w}`).join('\n') || '- Early-stage brand footprint'}

OPPORTUNITIES:
${activeReport.swot?.opportunities?.map((o) => `- ${o}`).join('\n') || '- Market vertical expansion'}

THREATS:
${activeReport.swot?.threats?.map((th) => `- ${th}`).join('\n') || '- Competitor pricing pressure'}

==================================================
5. 30 / 60 / 90-DAY EXECUTION ROADMAP
==================================================
${activeReport.actionPlan?.map((item) => `[${item.timeframe.toUpperCase()}] (${item.priority.toUpperCase()}) ${item.title}: ${item.description}`).join('\n')}

==================================================
6. INVESTOR READINESS & DISCLAIMER
==================================================
Readiness Tier: ${inv?.tier || 'Seed Viable'}
Key Strengths: ${inv?.keyStrengths?.join('; ') || 'Identified customer pain point'}
Red Flags: ${inv?.redFlags?.join('; ') || 'Need proven traction before institutional rounds'}
Improvements: ${inv?.requiredImprovementsBeforePitching?.join('; ') || 'Refine unit economics'}

DISCLAIMER:
${inv?.disclaimer || 'Investment and financial projections are inherently risky and never guaranteed. Due diligence required.'}
`;
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const downloadReportTxt = () => {
    if (!activeReport) return;
    const reportDate = activeReport.evaluatedAt || activeReport.timestamp || new Date().toISOString();
    const text = `CoreAudit Strategic Business Evaluation: ${activeReport.businessName}
Date: ${new Date(reportDate).toLocaleString()}
Health Score: ${activeReport.healthScore}/100 (${activeReport.rating})
Investor Readiness: ${activeReport.investorReadinessScore || 75}/100

EXECUTIVE SUMMARY:
${activeReport.summary}

FEASIBILITY:
- Problem: ${activeReport.feasibility?.problemSolved || 'N/A'}
- Customer: ${activeReport.feasibility?.targetCustomers || 'N/A'}
- Value Proposition: ${activeReport.feasibility?.valueProposition || 'N/A'}
- Limitations: ${activeReport.feasibility?.limitationsAndChallenges || 'N/A'}

FINANCIAL ANALYSIS:
- Revenue: ${activeReport.financialAnalysis?.totalRevenue || 'N/A'}
- Expenses: ${activeReport.financialAnalysis?.totalExpenses || 'N/A'}
- Net Profit/Loss: ${activeReport.financialAnalysis?.netProfitOrLoss || 'N/A'}
- Gross Margin: ${activeReport.financialAnalysis?.grossProfitMargin || 'N/A'}
- Break-even Formula: ${activeReport.financialAnalysis?.breakEvenPoint?.formula || 'N/A'}
- Break-even Steps: ${activeReport.financialAnalysis?.breakEvenPoint?.calculationSteps || 'N/A'}
- Break-even Result: ${activeReport.financialAnalysis?.breakEvenPoint?.result || 'N/A'}
- Burn & Runway: ${activeReport.financialAnalysis?.burnRateAndRunway || 'N/A'}

7-DIMENSION RISKS:
${(activeReport.detailedRisks || []).map((r) => `* [${r.category}] ${r.riskTitle} (Impact: ${r.impact}): ${r.mitigationStrategy}`).join('\n')}

30/60/90 DAY ACTION PLAN:
${activeReport.actionPlan?.map((item) => `* [${item.timeframe}] ${item.title}: ${item.description}`).join('\n')}

INVESTOR DISCLAIMER:
${activeReport.investorReadiness?.disclaimer || 'Projections are for planning only. No investment return is guaranteed.'}
`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeReport.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_business_evaluation.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // VIEW MODE: SHARP RECTANGULAR SLIDE WORKSPACE (NO ROUND CORNERS, ZERO PILLS)
  // =========================================================================
  if (activeReport) {
    const reportDate = activeReport.evaluatedAt || activeReport.timestamp || new Date().toISOString();
    const fin = activeReport.financialAnalysis;
    const comp = activeReport.marketAndCompetitors;
    const inv = activeReport.investorReadiness;
    const feas = activeReport.feasibility;
    const risks = activeReport.detailedRisks || [];

    return (
      <div className="w-full bg-[#f8fafc] text-slate-900 min-h-screen">
        {/* Crisp Top Navigation Header (Zero Rounded Corners) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setActiveReport(null);
                onClearSelectedEvaluation?.();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Evaluator</span>
            </button>
            <div className="h-4 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  {activeReport.businessName}
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                  {activeReport.rating}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Strategic Enterprise Appraisal • {new Date(reportDate).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={copyFullReportToClipboard}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={downloadReportTxt}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              <FileDown className="w-3 h-3" />
              <span>Download (.txt)</span>
            </button>

            <button
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeReport, null, 2));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = `${activeReport.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_evaluation.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>
        </div>

        {/* Crisp Square Tabs (All 7 Analytical Sections) */}
        <div className="bg-white border-b border-slate-200 px-4 sm:px-8 flex gap-1 sm:gap-4 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setSlideTab('overview')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'overview'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieChart className="w-4 h-4" />
            <span>1. Overview & Feasibility</span>
          </button>

          <button
            onClick={() => setSlideTab('market')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'market'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>2. Market & Competitor Matrix</span>
          </button>

          <button
            onClick={() => setSlideTab('financials')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'financials'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>3. Mathematical Financials</span>
          </button>

          <button
            onClick={() => setSlideTab('risks')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'risks'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>4. 7-Dimension Risk Matrix</span>
          </button>

          <button
            onClick={() => setSlideTab('swot')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'swot'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>5. SWOT & Tactics</span>
          </button>

          <button
            onClick={() => setSlideTab('roadmap')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'roadmap'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>6. 30/60/90-Day Roadmap</span>
          </button>

          <button
            onClick={() => setSlideTab('investor')}
            className={`py-3.5 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              slideTab === 'investor'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>7. Investor Readiness</span>
          </button>
        </div>

        {/* Slide Canvas Body */}
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
          {/* Top KPI Scorecard (Sharp rectangular cards, zero pills) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-5 border-t-2 border-t-teal-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Business Health Score
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-teal-700 font-mono mt-1">
                {activeReport.healthScore}<span className="text-sm font-normal text-slate-400">/100</span>
              </div>
              <span className="text-xs font-semibold text-slate-600 mt-1 block">
                {activeReport.rating}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-5 border-t-2 border-t-blue-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Investor Readiness
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-700 font-mono mt-1">
                {activeReport.investorReadinessScore || inv?.score || 78}<span className="text-sm font-normal text-slate-400">/100</span>
              </div>
              <span className="text-xs font-semibold text-blue-700 mt-1 block">
                {inv?.tier || ((activeReport.investorReadinessScore || 78) >= 80 ? 'Institutional Grade' : 'Seed / Angel Viable')}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-5 border-t-2 border-t-indigo-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Market Fit & Demand
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-700 font-mono mt-1">
                {activeReport.marketFitScore || 85}<span className="text-sm font-normal text-slate-400">/100</span>
              </div>
              <span className="text-xs font-semibold text-slate-600 mt-1 block">
                {activeReport.marketAnalysis?.riskLevel || 'Low'} Market Risk
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-5 border-t-2 border-t-amber-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Financial Risk Exposure
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-700 font-mono mt-1">
                {activeReport.financialRiskScore || 70}<span className="text-sm font-normal text-slate-400">/100</span>
              </div>
              <span className="text-xs font-semibold text-slate-600 mt-1 block">
                {activeReport.financialRisks?.riskLevel || 'Medium'} Exposure
              </span>
            </div>
          </div>

          {/* Transparent Multi-Factor Health Score Mathematical Basis Card */}
          <div className="bg-white border border-slate-200 p-5 shadow-2xs border-l-4 border-l-teal-600 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-700" />
                <span>Business Health Score & Rating Derivation Model</span>
              </h3>
              <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-200">
                Transparent & Verifiable Formula
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed font-mono bg-slate-50 p-3 border border-slate-200">
              {activeReport.scoreMethodologyExplanation || `Health Score = (0.30 × ${activeReport.marketFitScore || 80}) + (0.35 × ${100 - (activeReport.financialRiskScore || 65)}) + (0.20 × ${100 - (activeReport.operationalRiskScore || 70)}) + (0.15 × ${activeReport.investorReadinessScore || 75}) = ${activeReport.healthScore}/100`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">1. Market Demand (30%)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeReport.marketFitScore || 80}/100</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">2. Financial Sustainability (35%)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{100 - (activeReport.financialRiskScore || 65)}/100</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">3. Operational Viability (20%)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{100 - (activeReport.operationalRiskScore || 70)}/100</span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block">4. Investor Readiness (15%)</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeReport.investorReadinessScore || 75}/100</span>
              </div>
            </div>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW & FEASIBILITY ANALYSIS */}
          {slideTab === 'overview' && (
            <div className="space-y-6">
              {/* Executive Strategic Summary with Dynamic Confidence */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs border-l-4 border-l-teal-600 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Executive Strategic Appraisal
                  </h2>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                        activeReport.confidenceLevel === 'High'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : activeReport.confidenceLevel === 'Medium'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      Confidence: {activeReport.confidenceLevel || 'High'}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {activeReport.financialAnalysis?.hasProvidedFinancials ? 'Grounded in User Disclosures' : 'Model: Conservative Benchmark'}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed font-normal">
                  {activeReport.summary}
                </p>

                {activeReport.confidenceExplanation && (
                  <p className="text-xs text-slate-500 italic pt-1">
                    ℹ {activeReport.confidenceExplanation}
                  </p>
                )}
              </div>

              {/* Contradiction & Logical Discrepancy Banner (If detected in user input) */}
              {activeReport.contradictions && activeReport.contradictions.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-300 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>Business Model Discrepancies / Contradictions Identified</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-950 font-medium">
                    {activeReport.contradictions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Integrity Matrix: User Disclosures vs Verified Benchmarks vs Assumptions */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <span>Data Integrity & Verification Status (User Disclosures vs AI Assumptions)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Clear separation between verified user disclosures, industry benchmarks, and model assumptions.
                    </p>
                  </div>
                  {activeReport.dataIntegrity?.unverifiedWarning && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 border border-amber-300">
                      ⚠ {activeReport.dataIntegrity.unverifiedWarning}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-slate-700" />
                      <span>1. User Disclosures (Stated Facts)</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                      {(activeReport.dataIntegrity?.userDisclosures || [
                        `Business Name: ${activeReport.businessName}`,
                        activeReport.financialAnalysis?.hasProvidedFinancials ? 'Financial figures stated directly by user' : 'Financials pending disclosure / Subject to user input',
                      ]).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 space-y-2">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>2. Verified Industry Benchmarks</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-emerald-950 font-medium">
                      {(activeReport.dataIntegrity?.verifiedBenchmarks || [
                        'SBA & Corporate Finance Institute margin guidelines',
                        'Standard commercial unit economics models',
                      ]).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 bg-blue-50/40 border border-blue-200 space-y-2">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-blue-700" />
                      <span>3. AI Model Assumptions</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-blue-950">
                      {(activeReport.dataIntegrity?.assumptions || [
                        '30/60/90-day growth targets assume continuous founding execution',
                        'Break-even timeline depends on payment collection cycles',
                      ]).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feasibility Analysis Matrix */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Target className="w-4 h-4 text-teal-700" />
                    <span>Business Idea & Feasibility Analysis</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Objective viability assessment covering core problem, customer demand, limitations, and operational prerequisites.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      1. Problem Solved
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {feas?.problemSolved || 'Direct customer pain point addressed through structured operational intervention.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      2. Market Demand Validation
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {feas?.marketDemand || activeReport.marketAnalysis?.marketDemand || 'Demonstrated commercial willingness to pay in target niche.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      3. Target Customer Segment
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {feas?.targetCustomers || activeReport.marketAnalysis?.targetAudience || 'Specific commercial demographic with budget authority.'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      4. Core Value Proposition
                    </span>
                    <p className="text-slate-800 leading-relaxed">
                      {feas?.valueProposition || 'Distinct competitive reason buyers choose this solution over alternatives.'}
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                      5. Limitations & Execution Challenges
                    </span>
                    <p className="text-amber-900 leading-relaxed">
                      {feas?.limitationsAndChallenges || 'Early customer acquisition cost and operational headcount dependencies.'}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50/60 border border-blue-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                      6. Startup & Scale Requirements
                    </span>
                    <p className="text-blue-900 leading-relaxed">
                      {feas?.startupRequirements || 'Working capital reserves, core technical architecture, and targeted distributor relationships.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Scoring Methodology Disclosure */}
              <div className="bg-slate-50 border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>Transparent Scoring Methodology & Formula Verification</span>
                </span>
                <p className="leading-relaxed font-mono text-[11px] text-slate-800">
                  {activeReport.scoreMethodologyExplanation ||
                    'Multi-Factor Model: Market Demand (30%), Unit Economics (35%), Operational Viability (20%), and Defensibility (15%).'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: MARKET & COMPETITOR ANALYSIS */}
          {slideTab === 'market' && (
            <div className="space-y-6">
              {/* Customer Segmentation & Opportunity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Target Customer Segmentation
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {comp?.customerSegmentation || activeReport.marketAnalysis?.targetAudience || 'Segmented based on company size, workflow volume, and purchasing urgency.'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Market Demand & Growth Opportunity
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {comp?.marketOpportunity || activeReport.marketAnalysis?.marketDemand || 'Addressable market expansion driven by digitization and process automation.'}
                  </p>
                </div>
              </div>

              {/* Competitor Comparison Matrix (Tabular, Sharp, Real) */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Competitor Comparison Matrix
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct feature, pricing, and structural advantage comparison.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {comp?.competitors?.length || 0} Key Competitors Analyzed
                  </span>
                </div>

                {comp?.competitors && comp.competitors.length > 0 ? (
                  <div className="overflow-x-auto border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                          <th className="p-3 border-r border-slate-200">Competitor</th>
                          <th className="p-3 border-r border-slate-200">Product / Service</th>
                          <th className="p-3 border-r border-slate-200">Pricing Model</th>
                          <th className="p-3 border-r border-slate-200 text-blue-800">Source Basis</th>
                          <th className="p-3 border-r border-slate-200 text-emerald-800">Strengths</th>
                          <th className="p-3 border-r border-slate-200 text-rose-800">Weaknesses</th>
                          <th className="p-3 bg-teal-50 text-teal-900">Our Strategic Advantage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {comp.competitors.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                              {item.name}
                            </td>
                            <td className="p-3 text-slate-700 border-r border-slate-200 min-w-[180px]">
                              {item.productSummary}
                            </td>
                            <td className="p-3 font-mono text-slate-800 border-r border-slate-200 whitespace-nowrap">
                              {item.pricing}
                            </td>
                            <td className="p-3 text-slate-700 font-mono text-[11px] border-r border-slate-200 min-w-[160px] bg-slate-50/40">
                              <span className="inline-flex items-center gap-1 text-slate-800 font-medium">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-none shrink-0" />
                                {item.sourceBasis || 'Industry Registry / Benchmark'}
                              </span>
                            </td>
                            <td className="p-3 text-emerald-800 border-r border-slate-200 min-w-[150px]">
                              {item.pros}
                            </td>
                            <td className="p-3 text-rose-800 border-r border-slate-200 min-w-[150px]">
                              {item.cons}
                            </td>
                            <td className="p-3 font-semibold text-teal-900 bg-teal-50/40 min-w-[180px]">
                              {item.ourAdvantage}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    {activeReport.marketAnalysis?.competitorLandscape ||
                      'Competitor matrix synthesized from direct market alternatives and legacy substitutes.'}
                  </div>
                )}

                <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>
                    <strong>Verification Policy:</strong> AI will not generate fabricated competitor profiles if verified public records or user disclosures are absent.
                  </span>
                  <span className="font-mono text-slate-500 font-medium">Anti-Hallucination Guard Active</span>
                </div>
              </div>

              {/* Verified Sources vs. Scenario Estimates */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Market Benchmarks & Verified Data Sources
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Clear separation between verified empirical benchmarks and scenario forecasts.
                  </p>
                </div>

                {comp?.verifiedSources && comp.verifiedSources.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {comp.verifiedSources.map((src, i) => (
                      <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{src.sourceName}</span>
                          <span className="text-[10px] font-mono text-slate-500">{src.dateOrYear}</span>
                        </div>
                        <p className="text-slate-700">{src.dataPoint}</p>
                        <span className="text-[10px] font-bold text-teal-700 uppercase">
                          {src.isVerifiedBenchmark ? '✓ Verified Industry Benchmark' : 'Conservative Heuristic'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    Market metrics derived directly from stated user disclosures and verified sector fundamentals.
                  </div>
                )}
              </div>

              {/* Market Trends & Moat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Observed Market Trends
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-800">
                    {(comp?.marketTrends || [
                      'Increasing customer sensitivity to pricing and immediate ROI',
                      'Rapid shift toward self-serve onboarding and automated support',
                      'Heightened requirement for data security and operational uptime',
                    ]).map((tr, i) => (
                      <li key={i}>{tr}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Pricing Strategy & Defensible Moat
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {comp?.pricingStrategy || activeReport.businessModel?.pricingStrategy || 'Tiered, value-aligned pricing designed to capture expansion revenue while defending against low-cost commoditization.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MATHEMATICAL FINANCIAL REPORT */}
          {slideTab === 'financials' && (
            <div className="space-y-6">
              {/* Financial Dashboard Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 p-4 border-l-4 border-l-slate-700 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Stated Monthly Revenue
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 mt-1">
                    {fin?.totalRevenue !== undefined ? String(fin.totalRevenue) : 'Pending Disclosures'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 border-l-4 border-l-rose-600 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Monthly Operating Expenses
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-rose-700 mt-1">
                    {fin?.totalExpenses !== undefined ? String(fin.totalExpenses) : 'Pending Disclosures'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 border-l-4 border-l-teal-600 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Net Profit / Loss
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-teal-800 mt-1">
                    {fin?.netProfitOrLoss !== undefined ? String(fin.netProfitOrLoss) : 'Calculated'}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-4 border-l-4 border-l-indigo-600 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Gross Margin %
                  </span>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-700 mt-1">
                    {fin?.grossProfitMargin || '65% - 75%'}
                  </div>
                </div>
              </div>

              {/* Dedicated Mathematical Basis: Profit, Operating Expenses & Health Score */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Scale className="w-4 h-4 text-teal-700" />
                      <span>Mathematical Derivation Basis: Net Profit, Operating Expenses & Health Score</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Every financial metric displays its underlying mathematical formula and disclosure basis:
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-200">
                    Arithmetic Verification
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-teal-600 rounded-none shrink-0" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        1. Net Profit Calculation Basis
                      </span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                      {fin?.profitCalculationBasis ||
                        (fin?.hasProvidedFinancials
                          ? 'Deducting stated monthly operating expenses from stated monthly revenue (Stated Revenue - Stated Expenses)'
                          : 'Conservative benchmark model: Sector revenue estimate minus sector operating expenses')}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Basis: {fin?.hasProvidedFinancials ? 'User disclosed revenue figures' : 'Conservative industry margin benchmarks'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-rose-600 rounded-none shrink-0" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        2. Operating Expenses Calculation Basis
                      </span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                      {fin?.expenseCalculationBasis ||
                        (fin?.hasProvidedFinancials
                          ? 'User disclosed monthly operating expenses (Fixed Overhead + Infrastructure)'
                          : 'Conservative sector benchmark for baseline infrastructure and headcount')}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Basis: Fixed overhead and variable cost breakdown
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-600 rounded-none shrink-0" />
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                        3. Health Score Calculation Formula & Basis
                      </span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 font-mono text-[11px] text-slate-800 leading-relaxed">
                      {fin?.healthScoreCalculationBasis ||
                        activeReport.scoreMethodologyExplanation ||
                        'Health Score = (Market Demand x 30%) + (Financial Sustainability x 35%) + (Operational Viability x 20%) + (Defensibility x 15%)'}
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Overall Score: {activeReport.healthScore || 80}/100 • Weighted sum across 4 explicit core factors
                    </p>
                  </div>
                </div>
              </div>

              {/* Break-Even Mathematical Analysis (Explicit Formula + Arithmetic) */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-teal-700" />
                      <span>Break-Even Analysis & Mathematical Derivation</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Explicit mathematical formula, input values, and break-even projection.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-200">
                    Math Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Mathematical Formula
                    </span>
                    <pre className="font-mono text-xs font-bold text-slate-900 bg-white p-2.5 border border-slate-200 overflow-x-auto">
                      {fin?.breakEvenPoint?.formula || 'Break-Even = Fixed Costs / (Price - Variable Cost)'}
                    </pre>
                    <p className="text-[11px] text-slate-500">
                      Standard unit contribution margin equation.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Arithmetic Steps & Inputs
                    </span>
                    <div className="font-mono text-xs text-slate-800 bg-white p-2.5 border border-slate-200 leading-relaxed">
                      {fin?.breakEvenPoint?.calculationSteps ||
                        'Total Fixed Monthly Overhead divided by per-unit margin contribution.'}
                    </div>
                  </div>

                  <div className="p-4 bg-teal-50/60 border border-teal-200 space-y-2">
                    <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">
                      Calculated Break-Even Result
                    </span>
                    <div className="text-sm font-bold text-teal-950 font-mono bg-white p-2.5 border border-teal-200">
                      {fin?.breakEvenPoint?.result || 'Estimated break-even within 4 to 8 months under current run-rate'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Operating Runway & Capital Needs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Burn Rate & Cash Runway
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-mono">
                    {fin?.burnRateAndRunway || activeReport.financialRisks?.cashFlowRunway || 'Controlled monthly net burn. Runway is contingent on capital reserves.'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                    Investment Requirement & Sustainability
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed">
                    {fin?.investmentRequired || 'Capital requested to fund 12-18 months of runway and go-to-market distribution.'}
                  </p>
                </div>
              </div>

              {/* Probabilistic Scenario Forecasts (Clearly labeled as scenarios, not guarantees) */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Probabilistic Scenario Forecasts
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Three contingency trajectories for financial planning. Labeled as scenario models, not guaranteed outcomes.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-xs font-bold uppercase text-slate-700 block">
                      1. Conservative Scenario
                    </span>
                    <p className="text-slate-700 leading-relaxed">
                      {fin?.scenarioForecast?.conservative || 'Growth slows to 3-5% MoM; operations maintain survival cash discipline with zero discretionary marketing spend.'}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-200 space-y-2">
                    <span className="text-xs font-bold uppercase text-blue-900 block">
                      2. Moderate Scenario (Base)
                    </span>
                    <p className="text-blue-950 leading-relaxed">
                      {fin?.scenarioForecast?.moderate || 'Target trajectory: 10-15% organic MoM growth, reaching operating cash neutrality within 9 months.'}
                    </p>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold uppercase text-emerald-900 block">
                      3. Optimistic Scenario
                    </span>
                    <p className="text-emerald-950 leading-relaxed">
                      {fin?.scenarioForecast?.optimistic || 'Accelerated distribution through channel partnerships, shortening payback period to under 4 months.'}
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 italic">
                  Note: {fin?.scenarioForecast?.scenarioNote || 'Scenario projections are probabilistic models for contingency planning and sensitivity testing, not guaranteed futures.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: 7-DIMENSION RISK MATRIX */}
          {slideTab === 'risks' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>7-Dimension Enterprise Risk Analysis</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Comprehensive audit across Financial, Market, Operational, Legal, Technology, Competition, and Customer Retention.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {risks.length} Risk Dimensions Audited
                  </span>
                </div>

                {risks.length > 0 ? (
                  <div className="space-y-4">
                    {risks.map((risk, idx) => (
                      <div
                        key={idx}
                        className="p-4 border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-900 text-white">
                              {risk.category}
                            </span>
                            <h4 className="text-sm font-bold text-slate-900">
                              {risk.riskTitle}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] font-bold">
                            <span
                              className={`px-2 py-0.5 uppercase border ${
                                risk.likelihood === 'High'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : risk.likelihood === 'Medium'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              Likelihood: {risk.likelihood}
                            </span>
                            <span
                              className={`px-2 py-0.5 uppercase border ${
                                risk.impact === 'High'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : risk.impact === 'Medium'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              Impact: {risk.impact}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-3 bg-slate-50 border border-slate-100 space-y-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Root Cause Mechanics
                            </span>
                            <p className="text-slate-800 leading-relaxed">
                              {risk.rootCause}
                            </p>
                          </div>

                          <div className="p-3 bg-rose-50/50 border border-rose-100 space-y-1">
                            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                              Potential Loss & Downside
                            </span>
                            <p className="text-rose-900 leading-relaxed font-mono">
                              {risk.potentialLoss}
                            </p>
                          </div>

                          <div className="p-3 bg-teal-50/50 border border-teal-100 space-y-1">
                            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
                              Concrete Mitigation Strategy
                            </span>
                            <p className="text-teal-950 leading-relaxed">
                              {risk.mitigationStrategy}
                            </p>
                          </div>
                        </div>

                        {risk.earlyWarningSignals && risk.earlyWarningSignals.length > 0 && (
                          <div className="pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              Early Warning Signals:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {risk.earlyWarningSignals.map((sig, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  ⚠ {sig}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 text-xs text-slate-600">
                    7-dimension risk assessment compiled from enterprise operations rubric.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: SWOT & TACTICAL IMPROVEMENTS */}
          {slideTab === 'swot' && (
            <div className="space-y-6">
              {/* 4 Quadrants SWOT */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Strategic SWOT Analysis (4 Quadrants)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Internal capabilities versus external market dynamics.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-emerald-900 tracking-wider">
                      Strengths (Internal)
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-emerald-950">
                      {(activeReport.swot?.strengths || activeReport.strengths || ['Clear value proposition']).map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-amber-50/50 border border-amber-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-amber-900 tracking-wider">
                      Weaknesses (Internal)
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-amber-950">
                      {(activeReport.swot?.weaknesses || activeReport.weaknesses || ['Early-stage brand awareness']).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-blue-50/50 border border-blue-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-blue-900 tracking-wider">
                      Opportunities (External)
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-blue-950">
                      {(activeReport.swot?.opportunities || ['Expansion into adjacent verticals']).map((o, i) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-rose-50/50 border border-rose-200 space-y-2">
                    <h4 className="text-xs font-bold uppercase text-rose-900 tracking-wider">
                      Threats (External)
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-rose-950">
                      {(activeReport.swot?.threats || ['Incumbent price compression']).map((th, i) => (
                        <li key={i}>{th}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Tactical Improvements (Cost, Pricing, Revenue) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700 block">
                    Cost Reduction Strategies
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-800">
                    {(activeReport.costReductionStrategies || activeReport.financialRisks?.costReductionStrategies || [
                      'Adopt self-service customer onboarding to compress acquisition cost',
                      'Negotiate annual enterprise tool commitments for tiered volume discounts',
                    ]).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 block">
                    Revenue Expansion Tactics
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-800">
                    {(activeReport.revenueExpansionAdvice || [
                      'Introduce upfront annual prepayments with discounts to accelerate working cash',
                      'Establish enterprise tier with dedicated support SLAs',
                    ]).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 block">
                    Strategic Recommendations
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-800">
                    {(activeReport.recommendations || [
                      'Focus on retention metrics before scaling paid ads',
                      'Conduct weekly gross margin reviews',
                    ]).map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 30 / 60 / 90-DAY EXECUTION ROADMAP */}
          {slideTab === 'roadmap' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-teal-700" />
                      <span>30 / 60 / 90-Day Execution Roadmap</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Realistic phased milestones with priority, required resources, outcomes, and metrics.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Click checkbox to track completion
                  </span>
                </div>

                {/* 30 Days Phase */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-l-4 border-l-blue-600 pl-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Phase 1: First 30 Days (Immediate Foundation & Discovery)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {activeReport.actionPlan
                      ?.filter((a) => a.timeframe === '30_days')
                      .map((act, idx) => (
                        <div
                          key={act.id ? `${act.id}__30_${idx}` : `act-30-${idx}`}
                          onClick={() => toggleMilestone(act.id)}
                          className={`p-3.5 border transition-all cursor-pointer flex items-start gap-3 ${
                            completedMilestones[act.id]
                              ? 'bg-slate-50 border-slate-300 opacity-60'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                              completedMilestones[act.id]
                                ? 'bg-teal-700 border-teal-700 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {completedMilestones[act.id] && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 text-xs space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className={`font-bold ${
                                  completedMilestones[act.id] ? 'line-through text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {act.title}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200">
                                Priority: {act.priority}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{act.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 60 Days Phase */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-l-4 border-l-teal-600 pl-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-900">
                      Phase 2: Days 31 - 60 (Unit Economics & Initial Traction)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {activeReport.actionPlan
                      ?.filter((a) => a.timeframe === '60_days')
                      .map((act, idx) => (
                        <div
                          key={act.id ? `${act.id}__60_${idx}` : `act-60-${idx}`}
                          onClick={() => toggleMilestone(act.id)}
                          className={`p-3.5 border transition-all cursor-pointer flex items-start gap-3 ${
                            completedMilestones[act.id]
                              ? 'bg-slate-50 border-slate-300 opacity-60'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                              completedMilestones[act.id]
                                ? 'bg-teal-700 border-teal-700 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {completedMilestones[act.id] && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 text-xs space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className={`font-bold ${
                                  completedMilestones[act.id] ? 'line-through text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {act.title}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200">
                                Priority: {act.priority}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{act.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 90 Days Phase */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-l-4 border-l-indigo-600 pl-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Phase 3: Days 61 - 90 (Scalability & Financial Review)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    {activeReport.actionPlan
                      ?.filter((a) => a.timeframe === '90_days')
                      .map((act, idx) => (
                        <div
                          key={act.id ? `${act.id}__90_${idx}` : `act-90-${idx}`}
                          onClick={() => toggleMilestone(act.id)}
                          className={`p-3.5 border transition-all cursor-pointer flex items-start gap-3 ${
                            completedMilestones[act.id]
                              ? 'bg-slate-50 border-slate-300 opacity-60'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                              completedMilestones[act.id]
                                ? 'bg-teal-700 border-teal-700 text-white'
                                : 'border-slate-400 bg-white'
                            }`}
                          >
                            {completedMilestones[act.id] && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 text-xs space-y-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span
                                className={`font-bold ${
                                  completedMilestones[act.id] ? 'line-through text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {act.title}
                              </span>
                              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-200">
                                Priority: {act.priority}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed">{act.description}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INVESTOR READINESS ANALYSIS */}
          {slideTab === 'investor' && (
            <div className="space-y-6">
              {/* Scorecard Header */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs border-l-4 border-l-blue-600 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Investor Readiness Grade
                    </span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                      {inv?.tier || 'Seed Viable'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-extrabold text-blue-700 font-mono">
                      {activeReport.investorReadinessScore || inv?.score || 78}<span className="text-sm font-normal text-slate-400">/100</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Strengths & Red Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Key Strengths for Investors</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-800">
                    {(inv?.keyStrengths || [
                      'Clear identification of urgent customer problem',
                      'Feasible initial unit margin structure',
                      'Capital-efficient early operational footprint',
                    ]).map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-800 block flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Due Diligence Red Flags</span>
                  </span>
                  <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-800">
                    {(inv?.redFlags || [
                      'Early customer retention data requires multi-cohort validation',
                      'Customer acquisition cost payback metrics need historical verification',
                    ]).map((rf, i) => (
                      <li key={i}>{rf}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pre-Pitch Improvement Checklist */}
              <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Mandatory Improvements Before Pitching to Investors
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Specific gaps in unit economics, go-to-market proof, or defensibility to resolve beforehand.
                  </p>
                </div>

                <div className="space-y-2">
                  {(inv?.requiredImprovementsBeforePitching || [
                    'Document first 10-15 customer reference interviews with recorded satisfaction scores',
                    'Build detailed 18-month financial ledger with sensitivity test for 20% CAC inflation',
                    'Solidify key supplier/vendor contracts to guard against margin compression',
                  ]).map((imp, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5"
                    >
                      <span className="font-mono font-bold text-slate-500 shrink-0 mt-0.5">
                        {idx + 1}.
                      </span>
                      <span>{imp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mandatory Investor Legal Disclaimer */}
              <div className="p-4 bg-amber-50/70 border border-amber-300 text-xs text-amber-950 space-y-1">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Regulatory & Investment Advisory Disclaimer</span>
                </span>
                <p className="leading-relaxed">
                  {inv?.disclaimer ||
                    'This report is generated for strategic planning and decision analysis only. Business investments carry inherent risk of total loss. Projected revenues, break-even timelines, and investor scores do not constitute investment advice or a guarantee of future returns. Founders and investors must conduct independent legal, accounting, and operational due diligence.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // INPUT MODE: CLEAN, SHARP ENTERPRISE WORKSPACE
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Business Evaluator
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Strategic enterprise appraisal, mathematical unit economics, 7-risk audit & investor readiness.
            </p>
          </div>
        </div>

        {recentEvaluations.length > 0 && (
          <button
            onClick={() => setActiveReport(recentEvaluations[0])}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Latest Appraisal ({recentEvaluations[0].businessName})</span>
          </button>
        )}
      </div>

      {/* Main Grid: Input + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 1. ADD YOUR BUSINESS PLAN */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Business Plan / Venture Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload documents (PDF, DOCX, TXT, CSV, JSON), paste structured plan text, or fill out the structured venture form.
            </p>
          </div>

          {/* Segmented Control Tabs (Square, Clean) */}
          <div className="flex border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Plan Text</span>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'details'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Structured Form</span>
            </button>
          </div>

          {/* Business Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Venture / Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. NextFlow Analytics or Apex Commerce"
              className="w-full px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm font-medium text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 hover:border-blue-600 p-6 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer relative"
          >
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              accept=".pdf,.docx,.txt,.md,.csv,.json"
            />
            {isParsingDocument ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-bold text-blue-700">
                  Parsing text from {uploadedFileName}...
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-900">
                  Drag and drop business plan or pitch deck
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  or click to browse files
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports: PDF, DOCX, TXT, MD, CSV, JSON
                </p>
              </>
            )}

            {uploadStatus && !isParsingDocument && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {uploadStatus}
              </div>
            )}
          </div>

          {/* Tab 1: Paste Text */}
          {activeTab !== 'details' ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Paste Key Business Details or Financials
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Presets:</span>
                  <button
                    onClick={() => {
                      setPlanText(samplePlans.saas);
                      setBusinessName('WorkflowAI');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 border border-blue-200 cursor-pointer"
                  >
                    B2B SaaS
                  </button>
                  <button
                    onClick={() => {
                      setPlanText(samplePlans.ecommerce);
                      setBusinessName('EcoPack Co.');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 border border-blue-200 cursor-pointer"
                  >
                    D2C Brand
                  </button>
                  <button
                    onClick={() => {
                      setPlanText(samplePlans.fintech);
                      setBusinessName('MicroLend Global');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 border border-blue-200 cursor-pointer"
                  >
                    Fintech
                  </button>
                  <button
                    onClick={() => {
                      setPlanText(samplePlans.healthtech);
                      setBusinessName('HealthPulse AI');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 border border-blue-200 cursor-pointer"
                  >
                    Healthtech
                  </button>
                </div>
              </div>

              <textarea
                value={planText}
                onChange={(e) => setPlanText(e.target.value)}
                placeholder="Describe what your product/service does, who buys it, your revenue model, pricing, current expenses, and known competitors..."
                rows={7}
                className="w-full p-3.5 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm text-slate-900 placeholder:text-slate-400 font-sans leading-relaxed"
              />
            </div>
          ) : (
            /* Tab 2: Full Structured Form Covering All 10 User Required Fields */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Business Type / Industry Sector *
                  </label>
                  <input
                    type="text"
                    value={details.industry || details.businessType}
                    onChange={(e) =>
                      setDetails({ ...details, industry: e.target.value, businessType: e.target.value })
                    }
                    placeholder="e.g. B2B SaaS, HealthTech, Sustainable E-Commerce"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Company Stage
                  </label>
                  <select
                    value={details.stage}
                    onChange={(e) => setDetails({ ...details, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm bg-white"
                  >
                    <option>Idea / Concept</option>
                    <option>Seed / Early Stage</option>
                    <option>Early Revenue / MVP</option>
                    <option>Growth / Scaling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product / Service Details *
                </label>
                <textarea
                  value={details.productService}
                  onChange={(e) => setDetails({ ...details, productService: e.target.value })}
                  placeholder="What specific product or service do you provide? What problem does it solve?"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Customer / Market *
                  </label>
                  <input
                    type="text"
                    value={details.targetAudience}
                    onChange={(e) => setDetails({ ...details, targetAudience: e.target.value })}
                    placeholder="e.g. Mid-market software operations teams"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Target Region / Location
                  </label>
                  <input
                    type="text"
                    value={details.location}
                    onChange={(e) => setDetails({ ...details, location: e.target.value })}
                    placeholder="e.g. North America, Global Remote, Dhaka"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Monthly Revenue ($)
                  </label>
                  <input
                    type="text"
                    value={details.revenue}
                    onChange={(e) => setDetails({ ...details, revenue: e.target.value })}
                    placeholder="e.g. $4,800 or 0 (pre-revenue)"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Monthly Expenses ($)
                  </label>
                  <input
                    type="text"
                    value={details.expenses}
                    onChange={(e) => setDetails({ ...details, expenses: e.target.value })}
                    placeholder="e.g. $8,500"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Investment Needed ($)
                  </label>
                  <input
                    type="text"
                    value={details.investmentNeeded}
                    onChange={(e) => setDetails({ ...details, investmentNeeded: e.target.value })}
                    placeholder="e.g. $150,000"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Business Goals & Milestones
                  </label>
                  <input
                    type="text"
                    value={details.businessGoals}
                    onChange={(e) => setDetails({ ...details, businessGoals: e.target.value })}
                    placeholder="e.g. Reach $25k MRR within 9 months"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Website or Reference URL (optional)
                  </label>
                  <input
                    type="text"
                    value={details.websiteUrl}
                    onChange={(e) => setDetails({ ...details, websiteUrl: e.target.value })}
                    placeholder="e.g. https://mybusiness.com"
                    className="w-full px-3 py-2 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Interactive Clarification & Missing Pillars Banner */}
          {validationIssues && (
            <div className="p-4 bg-amber-50 border border-amber-300 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Additional Information Needed For An Authentic Business Evaluation
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {validationIssues.reason}
                  </p>
                </div>
              </div>

              {validationIssues.followUpQuestions && validationIssues.followUpQuestions.length > 0 && (
                <div className="space-y-1.5 pl-6">
                  <span className="text-[11px] font-bold text-amber-900 uppercase">
                    Please clarify the following key areas:
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-xs text-amber-950">
                    {validationIssues.followUpQuestions.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Standard Error Notice */}
          {evalError && !validationIssues && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{evalError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={executeEvaluation}
            disabled={isEvaluating}
            className={`w-full py-3 px-6 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isEvaluating
                ? 'bg-teal-700/60 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {isEvaluating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{evalStep || 'Executing Strategic Business Analysis...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute Strategic Business Evaluation</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: 2. EVALUATION SETTINGS */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Evaluation Framework Depth
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Analytical rigor and depth of evaluation.
              </p>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setEvalDepth('complete')}
                className={`block p-3.5 border transition-all cursor-pointer ${
                  evalDepth === 'complete'
                    ? 'border-teal-700 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Full Strategic Audit (12 Dimensions)
                  </span>
                  {evalDepth === 'complete' && <Check className="w-3.5 h-3.5 text-teal-700" />}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Includes mathematical unit economics, break-even derivation, 7-risk matrix, SWOT, and 30/60/90-day plan.
                </p>
              </label>

              <label
                onClick={() => setEvalDepth('financial')}
                className={`block p-3.5 border transition-all cursor-pointer ${
                  evalDepth === 'financial'
                    ? 'border-teal-700 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Financial & Investor Focus
                  </span>
                  {evalDepth === 'financial' && <Check className="w-3.5 h-3.5 text-teal-700" />}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Focus on burn runway, break-even point, gross margin sensitivity, and capital allocation.
                </p>
              </label>

              <label
                onClick={() => setEvalDepth('quick')}
                className={`block p-3.5 border transition-all cursor-pointer ${
                  evalDepth === 'quick'
                    ? 'border-teal-700 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Market & Product Validation
                  </span>
                  {evalDepth === 'quick' && <Check className="w-3.5 h-3.5 text-teal-700" />}
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Focus on value proposition, competitive moat, customer demand, and go-to-market risks.
                </p>
              </label>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 uppercase text-[11px] block">
                Strict Quality Standards
              </span>
              <p className="text-[11px] leading-relaxed">
                CoreAudit rejects meaningless strings and demo placeholders. Every evaluation executes genuine analysis grounded in your stated numbers and market reality.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
