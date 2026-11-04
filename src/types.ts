export type ViewMode = 'landing' | 'dashboard' | 'code-auditor' | 'business-evaluator' | 'history' | 'settings';

export interface UserProfile {
  fullName: string;
  email: string;
  username: string;
  bio: string;
  location: string;
  avatarUrl?: string;
  twoFactorEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  password?: string;
  notifications: {
    scanStatus: boolean;
    businessAlerts: boolean;
    productUpdates: boolean;
    marketingEmails: boolean;
  };
}

export interface VulnerabilityIssue {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'security' | 'dependency' | 'bug' | 'auth' | 'performance';
  file: string;
  line: number;
  endLine?: number;
  description: string;
  impact: string;
  originalSnippet: string;
  fixedSnippet: string;
  explanation: string;
  remediation?: string;
  cwe?: string;
  owaspCategory?: string;
  verificationSteps?: string[];
  isVerifiedFact?: boolean;
  evidenceBasis?: string;
  confidenceLevel?: 'Confirmed' | 'Probable' | 'Heuristic' | 'False Positive';
  statusCategory?: 'Confirmed' | 'Potential' | 'Test / Example Scope' | 'Needs Manual Review' | 'False Positive';
  verificationStatus?: 'confirmed' | 'probable' | 'false_positive' | 'test_scope';
  isTestOrExample?: boolean;
  exploitScenario?: string;
  sourceToSink?: {
    source: string;
    dataFlow?: string;
    sanitizerStatus: string;
    sink: string;
    exploitability: string;
    isReachable?: boolean;
  };
  dataFlowProof?: {
    source: string;
    sanitizerStatus: string;
    sink: string;
    exploitability: string;
  };
}

export interface SkippedFileInfo {
  path: string;
  reason: string;
  status: 'skipped' | 'excluded' | 'binary' | 'size_limit' | 'rate_limited';
  sizeBytes?: number;
}

export interface LanguageDistributionItem {
  language: string;
  filesCount: number;
  percentage: number;
}

export interface CodeScanResult {
  id: string;
  type: 'code_scan';
  projectName: string;
  sourceType: 'github' | 'paste' | 'upload';
  scanType: 'full' | 'quick' | 'security' | 'dependency';
  timestamp: string;
  status: 'completed' | 'in_progress' | 'failed';
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D';
  issuesCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount?: number;
  confirmedIssuesCount?: number;
  testScopeIssuesCount?: number;
  falsePositivesCount?: number;
  auditScopeType?: 'full_repo' | 'partial_repo' | 'snippet' | 'file_upload';
  auditScopeDescription?: string;
  scannedFilesCount: number;
  staticIssuesCount?: number;
  aiDeepAnalysisCount?: number;
  excludedFilesCount?: number;
  summary: string;
  issues: VulnerabilityIssue[];
  userEmail?: string;
  pinned?: boolean;
  codeQualityScore?: number;
  performanceScore?: number;
  detectedLanguage?: string;
  languageDistribution?: LanguageDistributionItem[];
  testedScopeNote?: string;
  untestedItems?: string[];
  architectureReview?: string;
  scoreCalculationExplanation?: string;
  finalRecommendations?: string[];
  bugDetectionReport?: {
    totalBugs: number;
    runtimeBugs: string[];
    logicBugs: string[];
    syntaxBugs: string[];
  };
  dependencyAnalysis?: {
    totalDependencies: number;
    vulnerableDependencies: {
      name: string;
      currentVersion: string;
      recommendedVersion: string;
      severity: string;
      advisory: string;
    }[];
    summary: string;
  };
  authSecurityAnalysis?: {
    authMechanismsFound: string[];
    issuesFound: string[];
    recommendations: string[];
  };
  dataIntegrity?: {
    verifiedFacts: string[];
    assumptions: string[];
    unverifiedScopeNote: string;
  };
  coverageDetails?: {
    totalFiles: number;
    scannedFilesCount: number;
    unscannedFilesCount: number;
    scannedFiles: string[];
    skippedFiles: string[];
    skippedFilesList?: SkippedFileInfo[];
    coveragePercent: number;
    isPartialScan: boolean;
    auditTypeLabel: string;
  };
  privateRepoNotice?: {
    isPrivate: boolean;
    repoName: string;
    message: string;
  };
  aiEngine?: {
    provider: 'meta' | 'static';
    model: string;
    liveAiVerified: boolean;
    note?: string;
  };
}

export interface ActionPlanItem {
  id: string;
  timeframe: '30_days' | '60_days' | '90_days';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  completed?: boolean;
}

export interface SwotAnalysis {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface FeasibilityAnalysis {
  problemSolved: string;
  targetCustomers: string;
  valueProposition: string;
  marketDemandVerdict?: string;
  marketDemand?: string;
  limitationsAndChallenges: string | string[];
  launchRequirements?: string | string[];
  startupRequirements?: string | string[];
}

export interface CompetitorItem {
  name: string;
  productSummary: string;
  pricing: string;
  pros: string;
  cons: string;
  ourAdvantage?: string;
  sourceBasis?: string; // Verified Benchmark, Public Registry, or 'Research required / Subject to verification'
}

export interface VerifiedMarketSource {
  dataPoint: string;
  sourceName: string;
  dateOrYear: string;
  isVerifiedBenchmark: boolean;
  url?: string;
}

export interface MarketAndCompetitorAnalysis {
  customerSegmentation: string;
  marketOpportunity: string;
  competitors: CompetitorItem[];
  marketTrends: string[];
  pricingStrategy: string;
  competitivePosition: string;
  verifiedSources: VerifiedMarketSource[];
  isMarketEstimateOnly: boolean;
}

export interface BreakEvenAnalysis {
  formula: string;
  calculationSteps: string;
  result: string;
}

export interface FinancialAnalysisDetailed {
  hasProvidedFinancials: boolean;
  missingFinancialData?: string[];
  totalRevenue: string | number;
  totalExpenses: string | number;
  netProfitOrLoss: string | number;
  grossProfitMargin: string;
  netProfitMargin: string;
  cashFlow: string;
  breakEvenPoint: BreakEvenAnalysis;
  operatingCosts: string;
  burnRateAndRunway: string;
  investmentRequired: string;
  financialSustainability: string;
  profitCalculationBasis?: string;
  expenseCalculationBasis?: string;
  healthScoreCalculationBasis?: string;
  scenarioForecast: {
    conservative: string;
    moderate: string;
    optimistic: string;
    scenarioNote: string;
  };
}

export interface BusinessRiskItem {
  category: 'Financial' | 'Market' | 'Operational' | 'Legal' | 'Technology' | 'Competition' | 'Customer Retention';
  riskTitle: string;
  rootCause: string;
  likelihood: 'High' | 'Medium' | 'Low';
  impact: 'High' | 'Medium' | 'Low';
  potentialLoss: string;
  earlyWarningSignals: string[];
  mitigationStrategy: string;
}

export interface InvestorReadinessDetailed {
  score: number;
  tier: string;
  keyStrengths: string[];
  redFlags: string[];
  requiredImprovementsBeforePitching: string[];
  disclaimer: string;
}

export interface GrowthMilestone {
  milestone: string;
  priority: 'high' | 'medium' | 'low';
  resourcesNeeded: string;
  expectedOutcome: string;
  metric: string;
}

export interface GrowthStrategyDetailed {
  thirtyDays: GrowthMilestone[];
  sixtyDays: GrowthMilestone[];
  ninetyDays: GrowthMilestone[];
}

export interface BusinessEvaluationResult {
  id: string;
  type: 'business_eval';
  businessName: string;
  sourceType: 'upload' | 'paste' | 'details';
  evaluationDepth: 'complete' | 'quick' | 'financial';
  timestamp: string;
  evaluatedAt?: string;
  status: 'completed' | 'in_progress' | 'failed';
  healthScore: number;
  rating: string;
  marketFitScore: number;
  financialRiskScore: number;
  operationalRiskScore: number;
  investorReadinessScore?: number;
  summary: string;
  marketAnalysis: {
    targetAudience?: string;
    marketDemand?: string;
    competitorLandscape?: string;
    riskLevel?: 'Low' | 'Medium' | 'High';
  };
  financialRisks: {
    costStructure?: string;
    revenueViability?: string;
    cashFlowRunway?: string;
    potentialLossAreas?: string[];
    costReductionStrategies?: string[];
    riskLevel?: 'Low' | 'Medium' | 'High';
  };
  businessModel: {
    pricingStrategy?: string;
    scalability?: string;
    unitEconomics?: string;
    riskLevel?: 'Low' | 'Medium' | 'High';
  };
  executionRisks: {
    teamRequirements?: string;
    keyObstacles?: string;
    regulatoryOrTechBarriers?: string;
    riskLevel?: 'Low' | 'Medium' | 'High';
  };
  swot?: SwotAnalysis;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  potentialLossAreas?: string[];
  costReductionStrategies?: string[];
  competitiveMoat?: string | string[];
  revenueExpansionAdvice?: string[];
  actionPlan: ActionPlanItem[];
  userEmail?: string;
  pinned?: boolean;

  // Real-world deep analytical sections:
  feasibility?: FeasibilityAnalysis;
  marketAndCompetitors?: MarketAndCompetitorAnalysis;
  financialAnalysis?: FinancialAnalysisDetailed;
  detailedRisks?: BusinessRiskItem[];
  investorReadiness?: InvestorReadinessDetailed;
  growthStrategy?: GrowthStrategyDetailed;
  scoreMethodologyExplanation?: string;
  isDataSufficient?: boolean;
  insufficientDataReason?: string;
  followUpQuestions?: string[];
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  confidenceExplanation?: string;
  contradictions?: string[];
  dataIntegrity?: {
    userDisclosures: string[];
    verifiedBenchmarks: string[];
    assumptions: string[];
    unverifiedWarning?: string;
  };
}

export type HistoryItem = CodeScanResult | BusinessEvaluationResult;

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'scan' | 'eval' | 'security' | 'system';
}
