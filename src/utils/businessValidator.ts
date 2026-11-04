/**
 * Business Evaluator Input Validation Utility
 * Enforces real-world business data validation.
 * Rejects gibberish, pure numbers, and generic non-business text.
 * Evaluates business completeness and identifies missing critical parameters.
 */

export interface BusinessValidationResult {
  isValid: boolean;
  status: 'valid' | 'incomplete' | 'invalid';
  error?: string;
  confidence: 'high' | 'medium' | 'low';
  missingPillars: string[];
  followUpQuestions: string[];
  completenessScore: number; // 0 - 100
  detectedVertical?: string;
  contradictions?: string[];
}

// Common meaningless gibberish patterns (including Bengali and Latin keyboard mashes)
const GIBBERISH_PATTERNS = [
  /^[ঢতযড়ঢ়ষৎংঃঁ\s]+$/i, // Bengali keyboard smash like "ঢতযয"
  /^(asdf|qwer|zxcv|hjkl|poiuy|lkjh|mnbvc|1234|test123|blahblah)/i,
  /(.)\1{4,}/, // 5 or more repeated identical characters
];

// Greetings with no business content
const GREETINGS_ONLY = /^(hello|hi|hey|good\s*(morning|afternoon|evening)|hola|namaste|assalamu\s*alaikum|kemon\s*acho|হাই|হ্যালো|সালাম)\s*[!?.]*$/i;

// Comprehensive keywords that indicate business semantics (English and Bengali)
const BUSINESS_KEYWORDS = [
  /\b(product|service|customer|client|market|revenue|sales|profit|margin|cost|expense|pricing|subscription|fee|b2b|b2c|marketplace|platform|app|store|ecommerce|shop|manufacturing|saas|fintech|agency|startup|funding|invest|investment|runway|cac|ltv|churn|grow|growth|target|audience|brand|competitor|deal|order|users|traction|founder|business|company|পণ্য|সেবা|গ্রাহক|ক্রেতা|বাজার|মুনাফা|খরচ|মূল্য|বিনিয়োগ|ব্যবসা|বিক্রি|আয়|ব্যয়|বাজেট|লাভ|লোকসান|মূলধন|প্রতিদ্বন্দ্বী|প্রতিযোগী|মার্কেট|মার্কেটিং|ডেলিভারি|কাস্টমার|উৎপাদন|কারখানা|খুচরা|পাইকারি|অনলাইন|দোকান|ই-কমার্স|রেস্টুরেন্ট|রেস্তোরাঁ|সার্ভিস)\b/i
];

/**
 * Validates whether the given string represents legitimate, analyzable business information.
 */
export function validateBusinessInput(
  text: string,
  details?: {
    businessName?: string;
    industry?: string;
    productSummary?: string;
    targetAudience?: string;
    revenueModel?: string;
    revenue?: string | number;
    expenses?: string | number;
    investment?: string | number;
    competitors?: string;
    goals?: string;
    websiteUrl?: string;
  }
): BusinessValidationResult {
  const trimmed = (text || '').trim();
  const hasDetails = details && (
    (details.businessName && details.businessName.trim().length > 1) ||
    (details.industry && details.industry.trim().length > 1) ||
    (details.productSummary && details.productSummary.trim().length > 5) ||
    (details.revenueModel && details.revenueModel.trim().length > 3)
  );

  // 1. Empty Check
  if (!trimmed && !hasDetails) {
    return {
      isValid: false,
      status: 'invalid',
      error: 'Please enter your business plan text, upload a business document (PDF/DOCX/TXT/CSV/JSON), or fill in the structured business details.',
      confidence: 'high',
      missingPillars: ['Business Concept', 'Product / Service', 'Target Customer', 'Revenue Model', 'Financial Estimates'],
      followUpQuestions: [
        'What is your business name and core product or service?',
        'Who is your target customer or market demographic?',
        'How does this business generate revenue and what is your pricing model?',
        'What are your estimated or actual monthly revenue and operating expenses?',
      ],
      completenessScore: 0,
    };
  }

  // Combine text and structured fields for full text inspection
  const combinedText = [
    trimmed,
    details?.businessName,
    details?.industry,
    details?.productSummary,
    details?.targetAudience,
    details?.revenueModel,
    details?.competitors,
    details?.goals,
  ].filter(Boolean).join(' ').trim();

  // 2. Length check: Must be at least 15 characters to be meaningful
  if (combinedText.length < 15) {
    return {
      isValid: false,
      status: 'invalid',
      error: `The provided text is too brief (${combinedText.length} characters) to perform a rigorous business analysis. Please describe what product or service is offered, target customers, and revenue strategy.`,
      confidence: 'high',
      missingPillars: ['Product / Service Description', 'Target Customer', 'Revenue Model'],
      followUpQuestions: [
        'What specific problem does your product or service solve?',
        'Who will pay for this offering and how much will it cost?',
      ],
      completenessScore: 10,
    };
  }

  // 3. Reject pure numeric strings (e.g. "123456", "999999999")
  if (/^[\d\s,.-]+$/.test(combinedText)) {
    return {
      isValid: false,
      status: 'invalid',
      error: 'Numeric digits alone do not represent a business plan. Please provide details about your business concept, target market, and products.',
      confidence: 'high',
      missingPillars: ['Business Concept', 'Product / Service', 'Market Model'],
      followUpQuestions: [
        'What business do these numbers belong to?',
        'What product or service is being sold?',
      ],
      completenessScore: 5,
    };
  }

  // 4. Reject greetings only (e.g. "hello", "hi")
  if (GREETINGS_ONLY.test(combinedText)) {
    return {
      isValid: false,
      status: 'invalid',
      error: 'General greeting detected without business information. Please describe your business idea, product or service, target customer, or financial structure.',
      confidence: 'high',
      missingPillars: ['Business Concept', 'Target Customer', 'Revenue Model'],
      followUpQuestions: [
        'What business idea or company would you like to evaluate?',
        'What is the core offering and target audience?',
      ],
      completenessScore: 5,
    };
  }

  // 5. Reject gibberish keyboard mashes (e.g. "ঢতযয", "asdfghjkl")
  for (const pattern of GIBBERISH_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        isValid: false,
        status: 'invalid',
        error: 'The entered text appears to be arbitrary characters or keyboard mash. Please provide authentic, readable information regarding your business.',
        confidence: 'high',
        missingPillars: ['Legitimate Business Information'],
        followUpQuestions: [
          'What is the actual name and purpose of your business?',
          'What products or services do you offer to your customers?',
        ],
        completenessScore: 0,
      };
    }
  }

  // 6. Check Business Completeness Across 5 Key Pillars
  const missingPillars: string[] = [];
  const followUpQuestions: string[] = [];
  let score = 0;

  // Pillar 1: Product / Service & Solution
  const hasProductOrService = /\b(product|service|app|platform|store|tool|software|device|consulting|food|fashion|course|package|hardware|delivery|retail|supermarket|shop)\b/i.test(combinedText)
    || /(?:পণ্য|সেবা|অ্যাপ|দোকান|প্ল্যাটফর্ম|খুচরা|সুপারশপ|গ্রোসারি|কসমেটিকস|ডেলিভারি|রেস্টুরেন্ট|কারখানা)/.test(combinedText);
  if (hasProductOrService || (details?.productSummary && details.productSummary.length > 8)) {
    score += 25;
  } else {
    missingPillars.push('Product / Service Offering');
    followUpQuestions.push('What specific product, service, or solution does your business provide?');
  }

  // Pillar 2: Target Audience / Customers
  const hasTargetAudience = /\b(customer|client|user|audience|demographic|b2b|b2c|smb|enterprise|student|shopper|merchant|doctor|patient|driver|buyer|consumer)\b/i.test(combinedText)
    || /(?:গ্রাহক|ক্রেতা|ইউজার|কাস্টমার|মানুষ|জনগণ|কোম্পানি|মার্কেট)/.test(combinedText);
  if (hasTargetAudience || (details?.targetAudience && details.targetAudience.length > 5)) {
    score += 20;
  } else {
    missingPillars.push('Target Customers / Audience');
    followUpQuestions.push('Who is your ideal customer or target market demographic?');
  }

  // Pillar 3: Revenue Model / Pricing
  const hasRevenueModel = /\b(revenue|pricing|price|subscription|fee|commission|monetiz|sale|sales|charge|cost|\$|€|£|৳|taka|dollar|per\s+month|per\s+year|freemium)\b/i.test(combinedText)
    || /(?:আয়|মূল্য|ফি|সাবস্ক্রিপশন|বিক্রি|বিক্রয়|রাজস্ব|চার্জ|মুনাফা)/.test(combinedText);
  if (hasRevenueModel || (details?.revenueModel && details.revenueModel.length > 4)) {
    score += 25;
  } else {
    missingPillars.push('Revenue Model & Pricing');
    followUpQuestions.push('How does the business generate revenue and what is your pricing structure?');
  }

  // Pillar 4: Financial Metrics / Capital / Runway
  const hasFinancialMetrics = /\b(\$|€|£|৳|\b\d+k\b|\b\d+m\b|\b\d{3,}\b|expense|expenses|cost|burn|runway|profit|loss|margin|investment|funding|seed|budget|capital)\b/i.test(combinedText)
    || /(?:খরচ|ব্যয়|বিনিয়োগ|মূলধন|লাভ|লোকসান|বাজেট|মার্জিন)/.test(combinedText);
  if (hasFinancialMetrics || details?.revenue || details?.expenses || details?.investment) {
    score += 20;
  } else {
    missingPillars.push('Financial Metrics (Revenue / Expenses / Budget)');
    followUpQuestions.push('What are your estimated or actual monthly revenues, expenses, or investment requirements?');
  }

  // Pillar 5: Competitors & Advantage
  const hasCompetitorOrAdvantage = /\b(competitor|competitors|competition|alternative|advantage|moat|unique|different|barrier|rival|market\s+share)\b/i.test(combinedText)
    || /(?:প্রতিযোগী|প্রতিদ্বন্দ্বী|সুবিধা|পার্থক্য|বাজার|বিকল্প)/.test(combinedText);
  if (hasCompetitorOrAdvantage || (details?.competitors && details.competitors.length > 3)) {
    score += 10;
  } else {
    missingPillars.push('Competitive Landscape & Differentiators');
    followUpQuestions.push('Who are your main competitors, and what makes your business unique?');
  }

  // If text doesn't contain any business keywords at all, reject
  const hasAnyBusinessWord = BUSINESS_KEYWORDS.some(kw => kw.test(combinedText));
  if (!hasAnyBusinessWord && score === 0) {
    return {
      isValid: false,
      status: 'invalid',
      error: 'The entered content does not contain recognizable business or commercial terms. Please describe your business venture with details on products, customers, and operations.',
      confidence: 'high',
      missingPillars: ['Business Context', 'Commercial Logic'],
      followUpQuestions: [
        'What is your business concept or company mission?',
        'What product or service are you launching or analyzing?',
      ],
      completenessScore: 10,
    };
  }

  // If the score is very low (e.g. user just said "coffee shop in dhaka" without product, pricing, or revenue details)
  if (score < 40 && missingPillars.length >= 3) {
    return {
      isValid: true,
      status: 'incomplete',
      error: 'Business information is incomplete. To generate an accurate financial model, feasibility review, and 30/60/90-day plan, please provide the essential details outlined below.',
      confidence: 'medium',
      missingPillars,
      followUpQuestions,
      completenessScore: score,
    };
  }

  // 7. Check for potential business contradictions / discrepancies
  const contradictions: string[] = [];
  let rev = parseFloat(String(details?.revenue || '').replace(/[^0-9.]/g, '')) || 0;
  let exp = parseFloat(String(details?.expenses || '').replace(/[^0-9.]/g, '')) || 0;
  let inv = parseFloat(String(details?.investment || '').replace(/[^0-9.]/g, '')) || 0;

  // Extract from plain text if not structured
  if (rev === 0) {
    const revMatch = combinedText.match(/(?:revenue|রাজস্ব|বিক্রয়|sales)[^0-9$৳€£]*([$৳€£]?\s*[\d,]+)/i);
    if (revMatch) {
      rev = parseFloat(revMatch[1].replace(/[^0-9.]/g, '')) || 0;
    }
  }
  const statesZeroExpense = /(?:expense|ব্যয়|খরচ)[^0-9$৳€£]*[$৳€£]?\s*0\b/i.test(combinedText);
  if (statesZeroExpense) {
    exp = 0;
  } else if (exp === 0) {
    const expMatch = combinedText.match(/(?:expense|ব্যয়|খরচ|burn)[^0-9$৳€£]*([$৳€£]?\s*[\d,]+)/i);
    if (expMatch) {
      exp = parseFloat(expMatch[1].replace(/[^0-9.]/g, '')) || 0;
    }
  }

  if (rev > 50000 && (combinedText.toLowerCase().includes('idea stage') || combinedText.toLowerCase().includes('pre-revenue') || details?.revenueModel?.toLowerCase().includes('pre-revenue'))) {
    contradictions.push('Stated pre-revenue / idea stage contradicts high active monthly revenue entry.');
  }

  if ((rev > 5000 || statesZeroExpense) && exp === 0 && (hasProductOrService || details?.productSummary)) {
    contradictions.push('Claiming $0 operating expenses while maintaining active commercial operations or facilities is structurally unsustainable.');
  }

  if (exp > rev * 3 && rev > 0 && inv === 0) {
    contradictions.push('High monthly operating burn relative to current revenue without stated investment or cash reserve.');
  }

  const mentionsNoCompetitors = /(?:no\s+competitor|no\s+competition|zero\s+competitor|none|নেই|কোনো\s+প্রতিযোগী\s+নেই|প্রতিদ্বন্দ্বী\s+নেই)/i.test(combinedText);
  if (mentionsNoCompetitors) {
    contradictions.push('Claiming zero competition in an active market segment overlooks direct and substitute solutions.');
  }

  return {
    isValid: true,
    status: 'valid',
    confidence: score >= 60 ? 'high' : 'medium',
    missingPillars,
    followUpQuestions,
    completenessScore: Math.min(100, Math.max(score, 50)),
    contradictions: contradictions.length > 0 ? contradictions : undefined,
  };
}
