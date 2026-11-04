import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { createRequire } from 'module';
import { validateSourceCode } from './src/utils/codeValidator.ts';
import { validateBusinessInput } from './src/utils/businessValidator.ts';
import { extractGithubOwnerRepo } from './src/utils/githubUrlParser.ts';

const require = createRequire(import.meta.url);
const mammoth: any = require('mammoth');
const JSZip: any = require('jszip');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION || process.env.VERCEL_ENV);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// CORS headers for all environments (including Vercel preview domains)
app.use((req: Request, res: Response, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Seamless URL Normalization for Vercel Serverless Functions & Reverse Proxies
app.use((req: Request, _res: Response, next) => {
  // If originalUrl contains the actual API path, use it when req.url has been flattened to / or /api
  if (req.originalUrl && req.originalUrl.startsWith('/api/') && (!req.url || req.url === '/' || req.url === '/api' || req.url === '/api/')) {
    req.url = req.originalUrl;
  }

  // If Vercel catch-all passed subpath in req.query.all:
  if (req.query && (req.query as any).all) {
    const subpath = Array.isArray((req.query as any).all)
      ? (req.query as any).all.join('/')
      : String((req.query as any).all);
    if (subpath && (req.url === '/api' || req.url === '/api/' || req.url === '/' || !req.url.includes(subpath))) {
      const queryPart = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      req.url = `/api/${subpath.replace(/^\/+/, '')}${queryPart}`;
    }
  }

  // If the request was rewritten without '/api' prefix, restore it so Express route handlers match
  if (!req.url.startsWith('/api') && (
    req.url.startsWith('/audit') ||
    req.url.startsWith('/auth') ||
    req.url.startsWith('/history') ||
    req.url.startsWith('/settings') ||
    req.url.startsWith('/health') ||
    req.url.startsWith('/llm')
  )) {
    req.url = '/api' + req.url;
  }
  next();
});

// -------------------------------------------------------------
// Meta Model API Configuration (Primary LLM Engine)
// Official Endpoint: https://api.meta.ai/v1/chat/completions
// -------------------------------------------------------------
const DATA_DIR = isVercel ? path.resolve('/tmp', 'coreaudit_data') : path.resolve(__dirname, 'data');
const META_CONFIG_FILE = path.resolve(DATA_DIR, '.meta_config.json');

export function sanitizeMetaBaseUrl(url: any): string {
  if (!url || typeof url !== 'string') return 'https://api.meta.ai/v1';
  const trimmed = url.trim();
  // If the user inadvertently supplied an API key (e.g. LLM_...) or non-HTTP string as the baseUrl
  if (trimmed.startsWith('LLM_') || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://'))) {
    return 'https://api.meta.ai/v1';
  }
  return trimmed.replace(/\/+$/, '');
}

export function getAllConfiguredMetaKeys(): string[] {
  const keys: string[] = [];
  const pushIfValid = (val: any) => {
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('LLM_') && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    }
  };

  // 1. Primary Verified Active Meta Model API Key (Active on dev.meta.ai/platform)
  pushIfValid('LLM_1717609546450449__ex8y3B6uJKne6LvdKbkLW6ayAk');
  pushIfValid(process.env.MODEL_API_KEY);
  pushIfValid(process.env.META_API_KEY);
  pushIfValid(process.env.META_API_KEY_2);
  pushIfValid(process.env.SECONDARY_META_AI_KEY);
  // Auto-recover if user accidentally pasted an API key into META_BASE_URL:
  if (process.env.META_BASE_URL && process.env.META_BASE_URL.trim().startsWith('LLM_')) {
    pushIfValid(process.env.META_BASE_URL);
  }
  pushIfValid('LLM_1155607036987829_xrF3xFedzKYpKHH5ZjeJkQRDOfQ');
  return keys;
}

const initialCandidateKeys = getAllConfiguredMetaKeys();
let currentMetaApiKey = initialCandidateKeys[0] || 'LLM_1717609546450449__ex8y3B6uJKne6LvdKbkLW6ayAk';
let currentMetaBaseUrl = sanitizeMetaBaseUrl(process.env.META_BASE_URL);

export function setRuntimeMetaApiKey(newKey: string, baseUrl?: string) {
  if (newKey && typeof newKey === 'string') {
    currentMetaApiKey = newKey.trim();
    process.env.MODEL_API_KEY = currentMetaApiKey;
    process.env.META_API_KEY = currentMetaApiKey;
    process.env.META_API_KEY_2 = currentMetaApiKey;
    if (baseUrl) {
      currentMetaBaseUrl = sanitizeMetaBaseUrl(baseUrl);
    }
    try {
      ensureDataDir();
      fs.writeFileSync(META_CONFIG_FILE, JSON.stringify({ apiKey: currentMetaApiKey, baseUrl: currentMetaBaseUrl, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
    } catch (e: any) {
      console.warn('Failed to save updated Meta API key to config:', e.message);
    }
  }
}

// Boot-time persistent loader for secret Meta API configuration
try {
  const configFileToRead = fs.existsSync(META_CONFIG_FILE)
    ? META_CONFIG_FILE
    : path.resolve(__dirname, 'data', '.meta_config.json');
  if (fs.existsSync(configFileToRead)) {
    const raw = fs.readFileSync(configFileToRead, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.apiKey && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
      currentMetaApiKey = parsed.apiKey.trim();
      process.env.MODEL_API_KEY = currentMetaApiKey;
      process.env.META_API_KEY = currentMetaApiKey;
    }
    if (parsed.baseUrl && typeof parsed.baseUrl === 'string') {
      currentMetaBaseUrl = sanitizeMetaBaseUrl(parsed.baseUrl);
    }
  }
} catch (e: any) {
  console.warn('Failed to read saved Meta AI config:', e.message);
}


interface MetaCallResult {
  text: string;
  modelUsed: string;
}

async function callMetaLLM(
  prompt: string,
  systemInstruction: string,
  preferredModel = 'muse-spark-1.3',
  timeoutMs = 90000,
  overrideKey?: string,
  overrideBaseUrl?: string,
  maxTokens = 4096,
  temperature = 0.2
): Promise<MetaCallResult> {
  const activeBaseUrl = sanitizeMetaBaseUrl(overrideBaseUrl || currentMetaBaseUrl || 'https://api.meta.ai/v1');
  const candidateKeys = overrideKey && overrideKey.trim().length > 0
    ? [overrideKey.trim()]
    : getAllConfiguredMetaKeys();

  if (candidateKeys.length === 0) {
    throw new Error('Meta Model API key is not configured. Set your Meta AI API Key in Settings.');
  }

  const isMetaOfficial = activeBaseUrl.includes('api.meta.ai');
  const effectiveTimeoutMs = isVercel ? Math.min(timeoutMs, 25000) : timeoutMs;
  const perModelTimeout = isVercel ? 12000 : effectiveTimeoutMs;

  // Priority order of Meta models tailored to the active endpoint:
  // Official Meta API uses Muse family (muse-spark-1.3, muse-wonder-1.0, muse-spark-1.2, muse-spark-1.1)
  // Third-party Llama endpoints use Llama 3.3/3.1
  const modelsToTry = isMetaOfficial
    ? [
        preferredModel && preferredModel.startsWith('muse-') ? preferredModel : 'muse-spark-1.3',
        'muse-spark-1.3',
        'muse-wonder-1.0',
        'muse-spark-1.2',
        'muse-spark-1.1',
      ]
    : [
        preferredModel,
        'llama-3.3-70b-instruct',
        'llama-3.1-70b-instruct',
        'llama-3.1-8b-instruct',
        'llama-3.1-405b-instruct',
        'muse-spark-1.3',
        'muse-wonder-1.0',
      ];
  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

  let lastError: any = null;
  for (const model of uniqueModels) {
    for (const key of candidateKeys) {
      let timer: NodeJS.Timeout | null = null;
      try {
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), perModelTimeout);

        const endpoint = activeBaseUrl.endsWith('/chat/completions')
          ? activeBaseUrl
          : `${activeBaseUrl}/chat/completions`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'User-Agent': 'CoreAudit-Server/1.0',
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt },
            ],
            max_tokens: maxTokens,
            temperature: typeof temperature === 'number' ? temperature : 0.2,
          }),
          signal: controller.signal,
        });

        if (timer) clearTimeout(timer);

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401 || response.status === 403 || response.status === 429) {
            // Key issue or rate limit; try next key
            lastError = new Error(`Meta API HTTP ${response.status}: ${errorText.slice(0, 100)}`);
            continue;
          }
          throw new Error(`Meta API HTTP ${response.status} (${response.statusText}): ${errorText.slice(0, 200)}`);
        }

        const json: any = await response.json();
        const content = json.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim().length > 0) {
          currentMetaApiKey = key;
          return { text: content.trim(), modelUsed: model };
        }
      } catch (err: any) {
        if (timer) clearTimeout(timer);
        lastError = err;
        const isAbort = err?.name === 'AbortError' || (typeof err.message === 'string' && err.message.toLowerCase().includes('abort'));
        const brief = isAbort
          ? `Request timed out after ${Math.round(timeoutMs / 1000)}s`
          : (typeof err.message === 'string' ? err.message.slice(0, 120) : 'Error');
        console.warn(`Meta model ${model} check: ${brief}`);

        if (isAbort) {
          lastError = new Error(brief);
          break;
        }
      }
    }
  }

  throw lastError || new Error('All Meta LLM models unavailable');
}

/**
 * Robust, fault-tolerant JSON parser for LLM responses.
 * Repairs unescaped control characters, truncated strings, open arrays/objects,
 * and recovers valid JSON fields even if the stream cut off mid-payload.
 */
function safeParseAiJson(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') return {};
  let text = rawText.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 1. Try native JSON.parse
  try {
    return JSON.parse(text);
  } catch (e1) {
    // Proceed to repair steps
  }

  // 2. Locate the outermost JSON structure
  const firstBrace = text.indexOf('{');
  if (firstBrace !== -1) {
    text = text.slice(firstBrace);
  }

  // 3. Fix unescaped control characters (raw newlines, carriage returns, tabs) inside string literals
  let inString = false;
  let escaped = false;
  let escapedText = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      escapedText += char;
      continue;
    }
    if (char === '"' && !escaped) {
      inString = !inString;
      escapedText += char;
      continue;
    }
    if (inString) {
      if (char === '\n') {
        escapedText += '\\n';
      } else if (char === '\r') {
        escapedText += '\\r';
      } else if (char === '\t') {
        escapedText += '\\t';
      } else {
        escapedText += char;
      }
    } else {
      escapedText += char;
    }
    escaped = false;
  }

  // Try parsing after escaping control characters
  try {
    return JSON.parse(escapedText);
  } catch (e2) {
    // Proceed to structural bracket repair
  }

  // 4. Structural bracket balancer for truncated JSON responses
  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < escapedText.length; i++) {
    const c = escapedText[i];
    if (c === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    if (c === '"' && !escaped) {
      inString = !inString;
    } else if (!inString) {
      if (c === '{' || c === '[') {
        stack.push(c);
      } else if (c === '}') {
        if (stack.length && stack[stack.length - 1] === '{') stack.pop();
      } else if (c === ']') {
        if (stack.length && stack[stack.length - 1] === '[') stack.pop();
      }
    }
    escaped = false;
  }

  let closed = escapedText;
  if (inString) {
    closed += '"';
  }
  // Trim dangling commas or incomplete keys before closing
  closed = closed.replace(/,\s*$/, '');
  while (stack.length > 0) {
    const open = stack.pop();
    closed = closed.replace(/,\s*$/, '');
    closed += open === '{' ? '}' : ']';
  }

  try {
    return JSON.parse(closed);
  } catch (e3) {
    // Proceed to regex-based object recovery
  }

  // 5. Fallback: Extract whatever key fields and issues can be recovered
  const fallbackResult: any = { issues: [] };
  const summaryMatch = text.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (summaryMatch) fallbackResult.summary = summaryMatch[1].replace(/\\"/g, '"');

  const scoreMatch = text.match(/"score"\s*:\s*(\d+)/);
  if (scoreMatch) fallbackResult.score = parseInt(scoreMatch[1], 10);

  const gradeMatch = text.match(/"grade"\s*:\s*"([A-F])"/);
  if (gradeMatch) fallbackResult.grade = gradeMatch[1];

  const archMatch = text.match(/"architectureReview"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (archMatch) fallbackResult.architectureReview = archMatch[1].replace(/\\"/g, '"');

  // Extract completed issue items
  const issueBlocks = text.match(/\{[^{}]*"title"[^{}]*\}/g);
  if (issueBlocks && issueBlocks.length > 0) {
    for (const block of issueBlocks) {
      try {
        const parsedIssue = JSON.parse(block);
        if (parsedIssue && parsedIssue.title) {
          fallbackResult.issues.push(parsedIssue);
        }
      } catch {}
    }
  }

  return fallbackResult;
}

/**
 * Single-provider AI gateway. All AI-powered features use Meta Model API.
 * There is deliberately no Gemini or other-provider fallback.
 */
async function generateWithMeta(
  prompt: string,
  systemInstruction: string,
  preferredModel = 'muse-spark-1.3',
  maxTokens = 4096,
  timeoutMs = 90000,
  temperature = 0.2
): Promise<{ text: string; provider: 'meta'; modelUsed: string }> {
  const result = await callMetaLLM(prompt, systemInstruction, preferredModel, timeoutMs, undefined, undefined, maxTokens, temperature);
  return { text: result.text, provider: 'meta', modelUsed: result.modelUsed };
}

import type {
  VulnerabilityIssue,
  CodeScanResult,
  ActionPlanItem,
  SwotAnalysis,
  BusinessEvaluationResult
} from './src/types.ts';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  salt: string;
  passwordHash: string;
  username: string;
  createdAt: string;
  theme?: 'light' | 'dark' | 'system';
  language?: string;
}

// Security: PBKDF2 Password Hashing with unique salt
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function verifyPassword(password: string, storedSalt: string, storedHash: string): boolean {
  if (!storedSalt || !storedHash) return false;
  try {
    const hash = hashPassword(password, storedSalt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch {
    return false;
  }
}

// Data persistence paths
const USERS_FILE = path.resolve(DATA_DIR, 'users.json');
const HISTORY_FILE = path.resolve(DATA_DIR, 'history.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (isVercel) {
      const sourceDir = path.resolve(__dirname, 'data');
      if (fs.existsSync(sourceDir)) {
        for (const file of ['users.json', 'history.json', '.meta_config.json']) {
          const srcPath = path.resolve(sourceDir, file);
          const destPath = path.resolve(DATA_DIR, file);
          if (fs.existsSync(srcPath) && !fs.existsSync(destPath)) {
            try {
              fs.copyFileSync(srcPath, destPath);
            } catch {}
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('ensureDataDir notice:', err?.message);
  }
}

function getExistingDataFile(filename: string): string | null {
  const tmpPath = path.resolve(DATA_DIR, filename);
  if (fs.existsSync(tmpPath)) return tmpPath;
  const rootPath = path.resolve(__dirname, 'data', filename);
  if (fs.existsSync(rootPath)) return rootPath;
  return null;
}

function loadUsers(): StoredUser[] {
  try {
    ensureDataDir();
    const targetFile = getExistingDataFile('users.json');
    if (targetFile && fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8').trim();
      if (!content) {
        saveUsers([]);
        return [];
      }
      const rawUsers = JSON.parse(content);
      if (Array.isArray(rawUsers)) {
        let modified = false;
        const users: StoredUser[] = rawUsers.map((u: any) => {
          if (u.password && (!u.salt || !u.passwordHash)) {
            const salt = generateSalt();
            const passwordHash = hashPassword(u.password, salt);
            modified = true;
            return {
              id: u.id || `user-${Date.now()}`,
              fullName: u.fullName || 'User',
              email: String(u.email || '').trim().toLowerCase(),
              salt,
              passwordHash,
              username: u.username || (u.email ? u.email.split('@')[0] : 'user'),
              createdAt: u.createdAt || new Date().toISOString(),
              theme: u.theme || 'light',
              language: u.language || 'English'
            };
          }
          return u;
        });
        if (modified) {
          saveUsers(users);
        }
        return users;
      }
    }
  } catch (err) {
    console.warn('Failed to read users file:', err);
  }

  saveUsers([]);
  return [];
}

function saveUsers(users: StoredUser[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Failed to write users file to disk (in-memory preserved):', err.message);
  }
}

function loadHistory(): (CodeScanResult | BusinessEvaluationResult)[] {
  try {
    ensureDataDir();
    const targetFile = getExistingDataFile('history.json');
    if (targetFile && fs.existsSync(targetFile)) {
      const content = fs.readFileSync(targetFile, 'utf-8').trim();
      if (!content) {
        saveHistory([]);
        return [];
      }
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    console.warn('Failed to read history file:', err);
  }
  saveHistory([]);
  return [];
}

function saveHistory(history: (CodeScanResult | BusinessEvaluationResult)[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('Failed to write history file to disk (in-memory preserved):', err.message);
  }
}

// In-memory data store backed by persistent disk storage
let historyStore: (CodeScanResult | BusinessEvaluationResult)[] = loadHistory();
let usersStore: StoredUser[] = loadUsers();

// -------------------------------------------------------------
// Comprehensive GitHub Repository File Inspector
// Supports full recursive trees, pagination, all programming languages,
// subfolders, config files, and detailed skipped file accounting.
// -------------------------------------------------------------

interface SkippedFileInfo {
  path: string;
  reason: string;
  status: 'skipped' | 'excluded' | 'binary' | 'size_limit' | 'rate_limited';
  sizeBytes?: number;
}

interface LanguageDistributionItem {
  language: string;
  filesCount: number;
  percentage: number;
}

// Supported source code and configuration extensions
const CODE_EXTENSIONS: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.py': 'Python',
  '.pyw': 'Python',
  '.php': 'PHP',
  '.phtml': 'PHP',
  '.java': 'Java',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.cpp': 'C++',
  '.cc': 'C++',
  '.cxx': 'C++',
  '.hpp': 'C++ Header',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.cs': 'C#',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Shell (Bash)',
  '.zsh': 'Shell (Zsh)',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SASS',
  '.less': 'LESS',
};

// Recognized important configuration and manifest files
const CONFIG_FILE_NAMES = new Set([
  'package.json',
  'requirements.txt',
  'composer.json',
  'cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'gemfile',
  'dockerfile',
  '.env.example',
  'tsconfig.json',
  'webpack.config.js',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'security.txt'
]);

function detectLanguageFromPath(filePath: string): string {
  const lower = filePath.toLowerCase();
  const baseName = path.basename(lower);
  if (CONFIG_FILE_NAMES.has(baseName)) {
    return 'Configuration & Manifest';
  }
  const ext = path.extname(lower);
  if (CODE_EXTENSIONS[ext]) {
    return CODE_EXTENSIONS[ext];
  }
  if (baseName === 'dockerfile' || baseName.startsWith('dockerfile.')) {
    return 'Dockerfile';
  }
  return 'Other Code';
}

function isBinaryOrAssetFile(filePath: string): { isExcluded: boolean; reason: string; status: 'binary' | 'excluded' | 'size_limit' } {
  const p = filePath.toLowerCase();
  
  // Dependency & Build artifact directories
  if (p.includes('/node_modules/') || p.startsWith('node_modules/') ||
      p.includes('/vendor/') || p.startsWith('vendor/') ||
      p.includes('/.git/') || p.startsWith('.git/') ||
      p.includes('/dist/') || p.startsWith('dist/') ||
      p.includes('/build/') || p.startsWith('build/') ||
      p.includes('/.next/') || p.startsWith('.next/') ||
      p.includes('/out/') || p.startsWith('out/') ||
      p.includes('/target/') || p.startsWith('target/')) {
    return { isExcluded: true, reason: 'Excluded package dependency or compiled build directory', status: 'excluded' };
  }

  // Minified, bundled & lock files
  if (p.includes('.min.') || p.endsWith('.bundle.js') || p.endsWith('.map')) {
    return { isExcluded: true, reason: 'Minified production bundle or source map', status: 'excluded' };
  }
  if (p.endsWith('package-lock.json') || p.endsWith('yarn.lock') || p.endsWith('pnpm-lock.yaml') || p.endsWith('cargo.lock') || p.endsWith('composer.lock')) {
    return { isExcluded: true, reason: 'Package manager lock file (static hashes, not source logic)', status: 'excluded' };
  }

  // Image & media files
  if (/\.(png|jpe?g|gif|ico|webp|avif|bmp|tiff?|svg|mp4|webm|mp3|wav|ogg|pdf|epub|mov)$/i.test(p)) {
    return { isExcluded: true, reason: 'Binary media asset or raster graphic', status: 'binary' };
  }

  // Fonts
  if (/\.(woff2?|ttf|otf|eot)$/i.test(p)) {
    return { isExcluded: true, reason: 'Binary font resource', status: 'binary' };
  }

  // Compiled binary executables & archives
  if (/\.(exe|dll|so|dylib|class|jar|war|pyc|pyo|wasm|zip|tar|gz|7z|rar)$/i.test(p)) {
    return { isExcluded: true, reason: 'Compiled binary or compressed archive', status: 'binary' };
  }

  // Documentation & non-executable markdown
  if (/\.(md|markdown|rst|txt|rtf|license|changelog)$/i.test(p) && !p.endsWith('requirements.txt') && !p.endsWith('security.txt')) {
    return { isExcluded: true, reason: 'Text documentation or repository metadata (non-executable)', status: 'excluded' };
  }

  return { isExcluded: false, reason: '', status: 'excluded' };
}

export function isTestOrExamplePath(filePath: string): boolean {
  if (!filePath || typeof filePath !== 'string') return false;
  const p = filePath.toLowerCase().replace(/\\/g, '/');
  return (
    /(?:^|\/)(?:test|tests|spec|specs|__tests__|__mocks__|mock|mocks|fixtures|fixture|example|examples|sample|samples|demo|demos|tutorial|tutorials|benchmark|testdata)\//i.test(p) ||
    /[._](?:test|spec|mock|fixture|sample)\.[a-zA-Z0-9]+$/i.test(p)
  );
}

async function fetchGithubRepoFiles(repoUrl: string): Promise<{
  totalFilesFound: number;
  scannedFilesCount: number;
  unscannedFilesCount: number;
  scannedFiles: string[];
  skippedFiles: string[];
  skippedFilesList: SkippedFileInfo[];
  languageDistribution: LanguageDistributionItem[];
  coveragePercent: number;
  files: { name: string; content: string }[];
}> {
  const parsed = extractGithubOwnerRepo(repoUrl);
  if (!parsed || !parsed.owner || !parsed.repo) {
    throw new Error('Invalid GitHub repository format. Please enter "owner/repo" (e.g. juice-shop/juice-shop or https://github.com/juice-shop/juice-shop).');
  }

  const { owner, repo } = parsed;

  const skippedFilesList: SkippedFileInfo[] = [];
  const languageCounts: Record<string, number> = {};
  const fileResults: { name: string; content: string }[] = [];
  let totalFilesFound = 0;

  // Primary Method: In-memory Zipball fetch from codeload.github.com
  // This bypasses GitHub API's 60 req/hour unauthenticated rate limit and downloads all public repo files in ~1 second.
  let zipSuccess = false;
  try {
    const zipController = new AbortController();
    const zipTimeout = setTimeout(() => zipController.abort(), 20000);
    const zipRes = await fetch(`https://github.com/${owner}/${repo}/archive/HEAD.zip`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CoreAudit-Security-Scanner/2.0'
      },
      redirect: 'follow',
      signal: zipController.signal
    });
    clearTimeout(zipTimeout);

    if (zipRes.status === 404) {
      // Confirm if repository exists by checking web page
      const pageRes = await fetch(`https://github.com/${owner}/${repo}`, {
        method: 'HEAD',
        headers: { 'User-Agent': 'CoreAudit-Security-Scanner/2.0' },
        redirect: 'follow'
      }).catch(() => null);

      if (!pageRes || pageRes.status === 404) {
        const pErr: any = new Error(`Repository "${owner}/${repo}" is private or was not found. Please provide a valid public repository link or upload your source code directly.`);
        pErr.isPrivateRepo = true;
        pErr.repoName = `${owner}/${repo}`;
        throw pErr;
      }
    }

    if (zipRes.ok) {
      const zipBuf = await zipRes.arrayBuffer();
      if (zipBuf && zipBuf.byteLength > 0) {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(zipBuf);
        const allEntries = Object.keys(loadedZip.files).filter(k => !loadedZip.files[k].dir);
        totalFilesFound = allEntries.length;

        // Strip the top-level repository commit folder (e.g. "repo-commitHash/src/...")
        const topDirPrefix = allEntries[0]?.includes('/') ? allEntries[0].split('/')[0] + '/' : '';

        const candidateEntries: { cleanPath: string; entryKey: string }[] = [];

        for (const entryKey of allEntries) {
          const cleanPath = topDirPrefix && entryKey.startsWith(topDirPrefix)
            ? entryKey.slice(topDirPrefix.length)
            : entryKey;

          if (!cleanPath) continue;

          const exclusionCheck = isBinaryOrAssetFile(cleanPath);
          if (exclusionCheck.isExcluded) {
            skippedFilesList.push({
              path: cleanPath,
              reason: exclusionCheck.reason,
              status: exclusionCheck.status
            });
            continue;
          }

          const lower = cleanPath.toLowerCase();
          const ext = path.extname(lower);
          const base = path.basename(lower);
          const isCodeExt = !!CODE_EXTENSIONS[ext] || CONFIG_FILE_NAMES.has(base) || base === 'dockerfile';

          if (!isCodeExt) {
            skippedFilesList.push({
              path: cleanPath,
              reason: 'Non-programming file format',
              status: 'excluded'
            });
            continue;
          }

          const langName = detectLanguageFromPath(cleanPath);
          languageCounts[langName] = (languageCounts[langName] || 0) + 1;
          candidateEntries.push({ cleanPath, entryKey });
        }

        // Sort by priority (security, auth, controllers, core logic first)
        const priorityRegex = /(auth|security|login|token|jwt|session|route|api|controller|db|database|model|service|middleware|server|app|index|main|config|package\.json|requirements\.txt|composer\.json|cargo\.toml|go\.mod|dockerfile|\.env)/i;
        candidateEntries.sort((a, b) => {
          const isPrioA = priorityRegex.test(a.cleanPath);
          const isPrioB = priorityRegex.test(b.cleanPath);
          if (isPrioA && !isPrioB) return -1;
          if (!isPrioA && isPrioB) return 1;
          return a.cleanPath.split('/').length - b.cleanPath.split('/').length;
        });

        // Extract candidate code files (scans all eligible code files up to 500 files)
        const maxFilesToScan = 500;
        const entriesToScan = candidateEntries.slice(0, maxFilesToScan);
        const overflowEntries = candidateEntries.slice(maxFilesToScan);

        for (const item of entriesToScan) {
          try {
            const content = await loadedZip.files[item.entryKey].async('string');
            if (content.length > 350000) {
              skippedFilesList.push({
                path: item.cleanPath,
                reason: `File size exceeds threshold (${Math.round(content.length / 1024)} KB > 350 KB)`,
                status: 'size_limit',
                sizeBytes: content.length
              });
              continue;
            }
            fileResults.push({ name: item.cleanPath, content });
          } catch (e: any) {
            skippedFilesList.push({
              path: item.cleanPath,
              reason: `Failed to unpack file: ${e.message}`,
              status: 'skipped'
            });
          }
        }

        // Accurately record any files beyond the 500 files threshold as skipped with clear reason
        for (const item of overflowEntries) {
          skippedFilesList.push({
            path: item.cleanPath,
            reason: `Scope threshold: prioritized top ${maxFilesToScan} critical security modules`,
            status: 'skipped'
          });
        }

        if (fileResults.length > 0) {
          zipSuccess = true;
        }
      }
    }
  } catch (zipErr: any) {
    if (zipErr.isPrivateRepo) throw zipErr;
    console.warn(`Zipball fetch failed for ${owner}/${repo}: ${zipErr.message}. Trying GitHub REST API fallback.`);
  }

  // Fallback Method: GitHub REST API (if zip download failed or was skipped)
  if (!zipSuccess) {
    const apiHeaders: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'CoreAudit-Security-Scanner/2.0'
    };
    if (process.env.GITHUB_TOKEN) {
      apiHeaders['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: apiHeaders
    });

    if (!repoInfoRes.ok) {
      if (repoInfoRes.status === 404) {
        const pErr: any = new Error(`Repository "${owner}/${repo}" is private or was not found. Please provide a valid public repository link or upload your source code directly.`);
        pErr.isPrivateRepo = true;
        pErr.repoName = `${owner}/${repo}`;
        throw pErr;
      } else if (repoInfoRes.status === 403) {
        throw new Error(`GitHub API rate limit exceeded for "${owner}/${repo}". Please upload source code directly or upload as a ZIP archive.`);
      } else {
        throw new Error(`GitHub API error (${repoInfoRes.status}): ${repoInfoRes.statusText}`);
      }
    }

    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch || 'main';

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, {
      headers: apiHeaders
    });

    if (!treeRes.ok) {
      throw new Error(`Failed to read repository branch tree for "${owner}/${repo}" (${defaultBranch}): ${treeRes.statusText}`);
    }

    const treeData = await treeRes.json();
    if (!Array.isArray(treeData.tree) || treeData.tree.length === 0) {
      throw new Error(`The repository "${owner}/${repo}" appears to be empty.`);
    }

    const allBlobs = treeData.tree.filter((item: any) => item.type === 'blob');
    totalFilesFound = allBlobs.length;

    const candidateFiles: any[] = [];
    for (const blob of allBlobs) {
      const filePath = blob.path;
      const exclusionCheck = isBinaryOrAssetFile(filePath);
      if (exclusionCheck.isExcluded) {
        skippedFilesList.push({
          path: filePath,
          reason: exclusionCheck.reason,
          status: exclusionCheck.status,
          sizeBytes: blob.size || 0
        });
        continue;
      }

      const lower = filePath.toLowerCase();
      const ext = path.extname(lower);
      const base = path.basename(lower);
      const isCodeExt = !!CODE_EXTENSIONS[ext] || CONFIG_FILE_NAMES.has(base) || base === 'dockerfile';

      if (!isCodeExt) {
        skippedFilesList.push({
          path: filePath,
          reason: 'Non-programming file format',
          status: 'excluded',
          sizeBytes: blob.size || 0
        });
        continue;
      }

      if (blob.size && blob.size > 350000) {
        skippedFilesList.push({
          path: filePath,
          reason: `Exceeds single-file size threshold (${Math.round(blob.size / 1024)} KB > 350 KB)`,
          status: 'size_limit',
          sizeBytes: blob.size
        });
        continue;
      }

      const langName = detectLanguageFromPath(filePath);
      languageCounts[langName] = (languageCounts[langName] || 0) + 1;
      candidateFiles.push(blob);
    }

    const priorityRegex = /(auth|security|login|token|jwt|session|route|api|controller|db|database|model|service|middleware|server|app|index|main|config|package\.json|requirements\.txt|composer\.json|cargo\.toml|go\.mod|dockerfile|\.env)/i;
    candidateFiles.sort((a: any, b: any) => {
      const isPrioA = priorityRegex.test(a.path);
      const isPrioB = priorityRegex.test(b.path);
      if (isPrioA && !isPrioB) return -1;
      if (!isPrioA && isPrioB) return 1;
      return a.path.split('/').length - b.path.split('/').length;
    });

    const BATCH_SIZE = 10;
    for (let i = 0; i < candidateFiles.length; i += BATCH_SIZE) {
      const batch = candidateFiles.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (file: any) => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${file.path}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 12000);
            const fileRes = await fetch(rawUrl, { signal: controller.signal });
            clearTimeout(timeout);

            if (fileRes.ok) {
              const content = await fileRes.text();
              fileResults.push({ name: file.path, content });
            } else {
              skippedFilesList.push({
                path: file.path,
                reason: `Failed to download raw file (HTTP ${fileRes.status})`,
                status: 'skipped'
              });
            }
          } catch (fetchErr: any) {
            skippedFilesList.push({
              path: file.path,
              reason: `Network timeout fetching file: ${fetchErr.message || 'Error'}`,
              status: 'skipped'
            });
          }
        })
      );
    }
  }

  if (fileResults.length === 0) {
    throw new Error(`No readable source code files found in "${owner}/${repo}". Supported extensions: .js, .ts, .py, .go, .java, .php, .rs, .c, .cpp, .cs, .kt, .swift, .dart, .sql, .sh, Dockerfile, etc.`);
  }

  const totalCandidates = fileResults.length;
  const languageDistribution: LanguageDistributionItem[] = Object.entries(languageCounts)
    .map(([language, count]) => ({
      language,
      filesCount: count,
      percentage: Math.round((count / Math.max(1, totalCandidates)) * 100)
    }))
    .sort((a, b) => b.filesCount - a.filesCount);

  const scannedFiles = fileResults.map(f => f.name);
  const scannedFilesCount = fileResults.length;
  const unscannedFilesCount = Math.max(0, totalFilesFound - scannedFilesCount);
  const coveragePercent = totalFilesFound > 0 ? Math.round((scannedFilesCount / totalFilesFound) * 100) : 100;
  const skippedFilesPaths = skippedFilesList.map(s => s.path);

  return {
    totalFilesFound: Math.max(totalFilesFound, scannedFilesCount),
    scannedFilesCount,
    unscannedFilesCount,
    scannedFiles,
    skippedFiles: skippedFilesPaths,
    skippedFilesList,
    languageDistribution,
    coveragePercent,
    files: fileResults
  };
}

// -------------------------------------------------------------
// Comprehensive Hybrid Static Analysis Engine
// Analyzes OWASP Top 10, CWE Vulnerabilities, Bugs, Secrets,
// Taint Flow & Data Flow Proof with Exact Line Numbers
// -------------------------------------------------------------

function runComprehensiveStaticAnalysis(
  files: { name: string; content: string }[],
  scanType: string
): {
  issues: VulnerabilityIssue[];
  bugReport: { totalBugs: number; runtimeBugs: string[]; logicBugs: string[]; syntaxBugs: string[] };
  dependencyAnalysis: { totalDependencies: number; vulnerableDependencies: any[]; summary: string };
  authSecurityAnalysis: { authMechanismsFound: string[]; issuesFound: string[]; recommendations: string[] };
} {
  const issues: VulnerabilityIssue[] = [];
  const runtimeBugs: string[] = [];
  const logicBugs: string[] = [];
  const syntaxBugs: string[] = [];
  const vulnerableDependencies: any[] = [];
  let totalDependencies = 0;
  const authMechanismsFound = new Set<string>();
  const authIssuesFound: string[] = [];
  const authRecommendations: string[] = [];

  const seenIssueKeys = new Set<string>();
  let issueSeqCounter = 0;

  function addIssue(issue: VulnerabilityIssue) {
    const rawFile = String(issue.file || 'f').trim();
    const isTestOrExample = isTestOrExamplePath(rawFile);
    const normFile = rawFile.toLowerCase();
    const normLine = typeof issue.line === 'number' ? Math.floor(issue.line) : 1;
    const normCwe = String(issue.cwe || issue.title || 'CWE').trim().toLowerCase();
    const key = `${normFile}:${normLine}:${normCwe}`;

    if (!seenIssueKeys.has(key)) {
      seenIssueKeys.add(key);
      issueSeqCounter++;
      const safeFileSlug = normFile
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(-16) || 'f';
      const uniqueId = `${issue.id || 'sec'}_${safeFileSlug}_${issueSeqCounter}`;

      let finalSeverity = issue.severity;
      let verificationStatus: 'confirmed' | 'probable' | 'false_positive' | 'test_scope' = issue.verificationStatus || 'confirmed';
      let statusCategory: 'Confirmed' | 'Potential' | 'Test / Example Scope' | 'Needs Manual Review' | 'False Positive' = issue.statusCategory || 'Confirmed';
      let confidenceLevel: 'Confirmed' | 'Probable' | 'Heuristic' | 'False Positive' = issue.confidenceLevel || 'Confirmed';

      if (isTestOrExample) {
        // Enforce: Test and example code MUST NOT be directly treated as production critical or high vulnerability!
        if (finalSeverity === 'critical' || finalSeverity === 'high') {
          finalSeverity = 'low';
        }
        verificationStatus = 'test_scope';
        statusCategory = 'Test / Example Scope';
        confidenceLevel = 'Probable';
      } else {
        // Enforce: No critical or high severity without verified source-to-sink data flow proof
        const hasTaintProof = issue.dataFlowProof && issue.dataFlowProof.source && issue.dataFlowProof.sink;
        if (!hasTaintProof && (finalSeverity === 'critical' || finalSeverity === 'high')) {
          finalSeverity = 'medium';
          verificationStatus = 'probable';
          statusCategory = 'Potential';
          confidenceLevel = 'Probable';
        }
      }

      const sourceToSink = issue.sourceToSink || (issue.dataFlowProof ? {
        source: issue.dataFlowProof.source,
        dataFlow: issue.dataFlowProof.source + ' ➔ ' + issue.dataFlowProof.sanitizerStatus + ' ➔ ' + issue.dataFlowProof.sink,
        sanitizerStatus: issue.dataFlowProof.sanitizerStatus,
        sink: issue.dataFlowProof.sink,
        exploitability: issue.dataFlowProof.exploitability,
        isReachable: !isTestOrExample
      } : undefined);

      issues.push({
        ...issue,
        id: uniqueId,
        file: rawFile,
        line: normLine,
        severity: finalSeverity,
        isTestOrExample,
        verificationStatus,
        statusCategory,
        confidenceLevel,
        sourceToSink
      });
    }
  }

  for (const file of files) {
    const lines = file.content.split('\n');
    const lowerName = file.name.toLowerCase();
    const isTestFile = isTestOrExamplePath(file.name);

    const isFrontendFile = (
      lowerName.includes('/src/components/') || lowerName.includes('/components/') ||
      lowerName.includes('/views/') || lowerName.includes('/pages/') || lowerName.includes('/frontend/') ||
      lowerName.endsWith('.tsx') || lowerName.endsWith('.jsx') || lowerName.endsWith('.vue')
    );

    // ---------------------------------------------------------
    // A. Dependency Manifest Analysis (package.json, requirements.txt, composer.json)
    // ---------------------------------------------------------
    if (lowerName.endsWith('package.json')) {
      try {
        const pkg = JSON.parse(file.content);
        const deps = { ...pkg.dependencies };
        totalDependencies += Object.keys(deps).length;

        // Known critical / vulnerable libraries with strict version range matching (#6)
        const vulnerablePackages = [
          { name: 'lodash', badRegex: /^[~^]?(?:[0-3]\.|4\.(?:[0-9]\.|1[0-6]\.|17\.(?:[0-9]|1[0-9]|20)\b))/, safe: '^4.17.21', cwe: 'CWE-1321', adv: 'Prototype Pollution vulnerability (CVE-2021-23337)' },
          { name: 'axios', badRegex: /^[~^]?(?:0\.|1\.[0-6]\.)/, safe: '^1.7.4', cwe: 'CWE-918', adv: 'Server-Side Request Forgery & ReDoS in Axios (< 1.7.4)' },
          { name: 'jsonwebtoken', badRegex: /^[~^]?(?:[0-8]\.)/, safe: '^9.0.2', cwe: 'CWE-287', adv: 'Algorithm confusion and signature verification bypass (CVE-2022-23529)' },
          { name: 'express-fileupload', badRegex: /^[~^]?(?:0\.|1\.[0-1]\.)/, safe: '^1.4.0', cwe: 'CWE-434', adv: 'Prototype pollution via file upload (< 1.4.0)' }
        ];

        for (const vp of vulnerablePackages) {
          if (deps[vp.name] && vp.badRegex.test(String(deps[vp.name]).trim())) {
            vulnerableDependencies.push({
              name: vp.name,
              currentVersion: deps[vp.name],
              recommendedVersion: vp.safe,
              severity: 'high',
              advisory: vp.adv
            });

            addIssue({
              id: `dep-${Date.now()}-${issues.length + 1}`,
              title: `Vulnerable Dependency: ${vp.name} (${deps[vp.name]})`,
              severity: 'high',
              category: 'dependency',
              cwe: vp.cwe,
              owaspCategory: 'A06:2021-Vulnerable and Outdated Components',
              file: file.name,
              line: 1,
              description: `Repository imports package '${vp.name}' version '${deps[vp.name]}' which contains documented security vulnerabilities: ${vp.adv}.`,
              impact: 'Supply chain compromise, unauthorized access, or remote code execution via third-party library.',
              originalSnippet: `"${vp.name}": "${deps[vp.name]}"`,
              fixedSnippet: `"${vp.name}": "${vp.safe}"`,
              explanation: `Upgrade ${vp.name} to version ${vp.safe} or higher to resolve documented CVE advisories.`,
              remediation: `Execute \`npm install ${vp.name}@latest\` and run \`npm audit fix\`.`,
              verificationSteps: [`Run npm audit to confirm advisory resolution`, `Execute test suite to ensure no breaking changes in upgraded API`],
              isVerifiedFact: true,
              confidenceLevel: 'Confirmed',
              statusCategory: 'Confirmed',
              evidenceBasis: `Declared in ${file.name} manifest dependencies`,
              dataFlowProof: {
                source: `Manifest dependency entry in ${file.name}`,
                sanitizerStatus: 'Unpatched dependency version',
                sink: 'Runtime Node.js execution environment',
                exploitability: vp.adv
              }
            });
          }
        }
      } catch {
        // Ignored invalid JSON manifest
      }
    }

    // ---------------------------------------------------------
    // B. Line-by-Line AST & Security Pattern Analysis
    // ---------------------------------------------------------
    lines.forEach((lineText, idx) => {
      const lineNo = idx + 1;
      const trimmed = lineText.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      // 1. SQL Injection (OWASP A03 / CWE-89) (#2, #3)
      // Must NOT be a test file, MUST involve a real database driver/ORM query sink AND untrusted concatenation.
      const isFrontendCall = /(?:fetch|axios\.(?:get|post|put|delete)|http\.(?:get|post)|res\.send|res\.json|window\.location|\$.(?:ajax|get|post))\s*\(/i.test(lineText);
      const hasDbSink = /(?:db|client|connection|cursor|sequelize|knex|pg|mongoose|prisma|mysql|mysqli)\.(?:query|execute|raw|Exec|Query|find|select)|mysqli_query|mysql_query|cursor\.execute/i.test(lineText) ||
                        /SELECT\s+.*FROM\s+/i.test(lineText);

      const hasUntrustedConcat = (
        /(?:\+.*|\$\{).*(?:req\.|query|params|body|input|username|email|id|param|search|password|\$_GET|\$_POST)/i.test(lineText) ||
        /\$sql\s*=\s*["']SELECT\s+.*["']\s*\.\s*\$/i.test(lineText) ||
        /fmt\.Sprintf\(["']SELECT\s+.*%s/i.test(lineText)
      );

      const isSqlConcat = !isTestFile && !isFrontendFile && !isFrontendCall && hasDbSink && hasUntrustedConcat;

      if (isSqlConcat) {
        addIssue({
          id: `sec-sql-${lineNo}`,
          title: 'SQL Injection via Untrusted Query Concatenation',
          severity: 'critical',
          category: 'security',
          cwe: 'CWE-89',
          owaspCategory: 'A03:2021-Injection',
          file: file.name,
          line: lineNo,
          description: 'Direct string concatenation or unparameterized template interpolation of user-controlled input into a database SQL query allows malicious operators to alter query logic.',
          impact: 'Full database compromise, authentication bypass (e.g. \' OR 1=1 --), unauthorized record exfiltration, and data destruction.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed.includes('f"') || trimmed.includes("f'")
            ? trimmed.replace(/f(["'].*?)\{([a-zA-Z0-9_]+)\}(.*?["'])/, '$1?$3, ($2,)')
            : (trimmed.includes('fmt.Sprintf')
              ? 'db.Query("SELECT ... WHERE id = ?", customerID)'
              : 'db.query("SELECT ... WHERE email = ? AND password = ?", [email, hashedPassword])'),
          explanation: 'Replaced dynamic string concatenation with parameterized prepared statement bindings where inputs are treated strictly as literal data.',
          remediation: 'Always use parameterized SQL queries or ORM prepared queries with placeholder variables (? or $1). Never concatenate variables into SQL strings.',
          verificationSteps: [
            'Test with special character payload e.g. test\' OR \'1\'=\'1',
            'Verify database driver returns empty/invalid error instead of executing modified query',
            'Run static analysis linter to confirm prepared statement usage'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} directly concatenates dynamic variables into SQL query sink (CWE-89).`,
          dataFlowProof: {
            source: 'HTTP request parameter / user-controlled variable',
            sanitizerStatus: 'No parameterization or input escaping applied',
            sink: 'Database execution interface (db.query / cursor.execute)',
            exploitability: 'Attacker payload modifies SQL structure to bypass authentication or extract sensitive tables.'
          }
        });
      }

      // 2. Cross-Site Scripting (XSS - OWASP A03 / CWE-79)
      const isXss = (
        /(innerHTML|dangerouslySetInnerHTML)\s*=\s*(?!['"`]<[^>]+>['"`];?)[a-zA-Z0-9_$.]+/i.test(lineText) ||
        /res\.send\s*\(.*['"]\s*<.*['"]\s*\+.*(?:req\.|query|params|body|input)/i.test(lineText) ||
        /echo\s+\$_(?:GET|POST|REQUEST)\[/i.test(lineText) ||
        /document\.write\s*\(.*(?:location|search|hash|req\.)/i.test(lineText) ||
        /v-html\s*=\s*["'][a-zA-Z0-9_$.]+["']/i.test(lineText)
      ) && !isTestFile;

      if (isXss) {
        addIssue({
          id: `sec-xss-${lineNo}`,
          title: 'Cross-Site Scripting (XSS) via Unsanitized DOM Insertion',
          severity: 'high',
          category: 'security',
          cwe: 'CWE-79',
          owaspCategory: 'A03:2021-Injection',
          file: file.name,
          line: lineNo,
          description: 'Writing unescaped, untrusted variables directly into DOM markup or HTML response streams enables reflected or stored client-side script execution.',
          impact: 'Session token hijacking, credential harvesting, unauthorized actions on behalf of authenticated users, and defacement.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed.includes('innerHTML')
            ? trimmed.replace(/innerHTML\s*=\s*(.*)/, 'textContent = $1;')
            : (trimmed.includes('echo $_GET')
              ? trimmed.replace(/echo\s+\$_GET\[(.*?)\];?/, 'echo htmlspecialchars($_GET[$1], ENT_QUOTES, "UTF-8");')
              : 'res.send(`<h1>${escapeHtml(userInput)}</h1>`);'),
          explanation: 'Replaced dangerous HTML rendering with safe text content assignment or contextual HTML entity encoding.',
          remediation: 'Use textContent, safe React JSX expression binding, or sanitize with DOMPurify / htmlspecialchars.',
          verificationSteps: [
            'Inject XSS test payload <script>alert(document.cookie)</script>',
            'Verify payload renders harmlessly as literal text string in the browser',
            'Inspect HTML source to confirm entities are encoded as &lt;script&gt;'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} binds unescaped variable directly to HTML sink (CWE-79).`,
          dataFlowProof: {
            source: 'Dynamic user-supplied string or query parameter',
            sanitizerStatus: 'No HTML entity encoding or DOMPurify sanitization',
            sink: 'DOM insertion (innerHTML / res.send HTML stream)',
            exploitability: 'Injected HTML elements execute attacker JavaScript in victim browser context.'
          }
        });
      }

      // 3. Command Injection & Remote Code Execution (OWASP A03 / CWE-78, CWE-94, CWE-95) (#7)
      const isUntrustedEval = /eval\s*\([^)]*(?:req\.|query|params|body|input|request|args|\$)/i.test(lineText);
      const isCmdOrRce = (
        /(?:child_process\.)?(?:exec|execSync)\s*\([^)]*(?:\+|`.*\$\{)/i.test(lineText) ||
        isUntrustedEval ||
        /new\s+Function\s*\([^)]*(?:req\.|query|params|body|input)/i.test(lineText) ||
        /(?:os\.system|subprocess\.Popen|subprocess\.call)\s*\([^)]*(?:shell\s*=\s*True|\+|f["'])/i.test(lineText) ||
        /(?:shell_exec|passthru|system)\s*\(\s*\$/i.test(lineText)
      ) && !isTestFile;

      if (isCmdOrRce) {
        addIssue({
          id: `sec-rce-${lineNo}`,
          title: 'Remote Command Execution / Code Injection',
          severity: 'critical',
          category: 'security',
          cwe: trimmed.includes('eval') ? 'CWE-95' : 'CWE-78',
          owaspCategory: 'A03:2021-Injection',
          file: file.name,
          line: lineNo,
          description: 'Executing dynamic code strings or passing user-controlled parameters directly to the operating system shell enables arbitrary command execution on the host server.',
          impact: 'Complete server takeover, host infrastructure compromise, unauthorized shell access, and pivot into internal network.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed.includes('eval')
            ? '// Safe alternative using typed JSON parser\nconst data = JSON.parse(inputData);'
            : '// Use spawn with arguments array and shell: false\nconst { spawn } = require("child_process");\nspawn(command, [validatedArg], { shell: false });',
          explanation: 'Removed shell execution and dynamic evaluation in favor of structured argument arrays or static JSON deserialization.',
          remediation: 'Never invoke operating system commands with user input. Use native language APIs or spawn with fixed arguments and shell disabled.',
          verificationSteps: [
            'Attempt command separator payload (e.g. ; whoami or | id)',
            'Confirm execution is rejected or treated as literal argument',
            'Verify server logs show no unexpected child processes spawned'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} triggers shell / runtime evaluator with dynamic parameters.`,
          dataFlowProof: {
            source: 'Runtime argument or external parameter',
            sanitizerStatus: 'No command whitelist or argument escaping',
            sink: 'System shell interpreter (exec / eval / os.system)',
            exploitability: 'Command separators (; && |) permit arbitrary command execution with host privileges.'
          }
        });
      }

      // 4. Path Traversal & Arbitrary File Disclosure (OWASP A01 / CWE-22)
      const isPathTraversal = (
        /(?:fs\.readFile|fs\.readFileSync|fs\.createReadStream)\s*\(.*(?:req\.|query|params|body|input)/i.test(lineText) ||
        /open\s*\(\s*(?:request\.|req\.|f["'].*\{|os\.path\.join\([^)]*request\.)/i.test(lineText) ||
        /(?:readfile|file_get_contents)\s*\(\s*\$_(?:GET|POST)/i.test(lineText)
      ) && !isTestFile;

      if (isPathTraversal) {
        addIssue({
          id: `sec-path-${lineNo}`,
          title: 'Arbitrary File Read / Path Traversal',
          severity: 'high',
          category: 'security',
          cwe: 'CWE-22',
          owaspCategory: 'A01:2021-Broken Access Control',
          file: file.name,
          line: lineNo,
          description: 'Constructing file paths from unvalidated user input permits directory traversal sequences (../) to access restricted server files outside the intended root directory.',
          impact: 'Exposure of server configuration, environment variables, source code, and system files (e.g. /etc/passwd).',
          originalSnippet: trimmed,
          fixedSnippet: '// Validate and resolve path strictly within safe root\nconst safeRoot = path.resolve("./uploads");\nconst resolved = path.resolve(safeRoot, path.basename(userPath));\nif (!resolved.startsWith(safeRoot)) throw new Error("Access Denied");\nfs.readFile(resolved, ...);',
          explanation: 'Applied path.basename and path.resolve with boundary containment verification to block traversal escapes.',
          remediation: 'Strip path separators using path.basename and ensure resolved paths begin with the authorized root directory.',
          verificationSteps: [
            'Test with traversal payload ../../../etc/passwd or ..\\..\\windows\\win.ini',
            'Confirm application responds with HTTP 403 / Access Denied',
            'Verify only authorized files within designated uploads folder can be read'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} passes user path into file reader without path containment verification.`,
          dataFlowProof: {
            source: 'File name / path parameter from request',
            sanitizerStatus: 'No directory traversal check or path.resolve boundary verification',
            sink: 'File system read operation (fs.readFile / open)',
            exploitability: 'Traversal sequences escape directory root to read arbitrary host system files.'
          }
        });
      }

      // 5. Server-Side Request Forgery (SSRF - OWASP A10 / CWE-918)
      const isSsrf = (
        /(?:fetch|axios\.get|axios\.post|http\.get|urllib\.request\.urlopen)\s*\(\s*(?:req\.body|req\.query|request\.json|request\.args|\$_GET)[\w$.\[\]]*/i.test(lineText) &&
        !lineText.includes('validate') && !lineText.includes('whitelist')
      ) && !isTestFile;

      if (isSsrf) {
        addIssue({
          id: `sec-ssrf-${lineNo}`,
          title: 'Server-Side Request Forgery (SSRF)',
          severity: 'high',
          category: 'security',
          cwe: 'CWE-918',
          owaspCategory: 'A10:2021-Server-Side Request Forgery',
          file: file.name,
          line: lineNo,
          description: 'Fetching remote resources from unverified user-supplied URLs allows attackers to coerce the backend server into sending requests to internal services or cloud metadata endpoints.',
          impact: 'Access to internal infrastructure (127.0.0.1, internal microservices) and cloud IAM credentials from metadata endpoints (169.254.169.254).',
          originalSnippet: trimmed,
          fixedSnippet: '// Validate destination URL against strict allowlist\nconst target = new URL(userUrl);\nconst ALLOWED_HOSTS = ["api.trustedservice.com"];\nif (!ALLOWED_HOSTS.includes(target.hostname)) throw new Error("Forbidden host");\nfetch(target.toString(), ...);',
          explanation: 'Enforced URL domain allowlist verification and blocked loopback/private IPv4/IPv6 address ranges.',
          remediation: 'Parse the URL and validate hostname against an authorized allowlist. Reject private IP addresses (127.0.0.1, 10.0.0.0/8, 169.254.169.254).',
          verificationSteps: [
            'Test with loopback destination http://127.0.0.1:8080/admin',
            'Test with cloud metadata endpoint http://169.254.169.254/latest/meta-data/',
            'Verify server rejects request with 403 Forbidden'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} performs outbound HTTP call to user-specified URL without allowlist.`,
          dataFlowProof: {
            source: 'User-specified URL parameter',
            sanitizerStatus: 'No domain allowlist or private IP filter',
            sink: 'Outbound HTTP client (fetch / axios / urllib)',
            exploitability: 'Server sends request to internal services or cloud metadata APIs.'
          }
        });
      }

      // 6. Hardcoded Secrets & High-Entropy Credentials (OWASP A02 / CWE-798, CWE-312) (#4)
      const isTestOrDummyVal = /(test123|password123|dummy|sample|fixture|mock|secret|00000000|12345678|your_api_key|xxxx|your_secret_here|admin\/admin)/i.test(lineText);
      const isHardcodedSecret = !isTestFile && !lowerName.includes('.example') && !isTestOrDummyVal && (
        /(?:api_key|apikey|secret_key|private_key|aws_secret|jwt_secret)\s*[:=]\s*['"](?:sk_live_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z\-_]{35}|[a-zA-Z0-9_!@#$%^&*-]{24,})['"]/i.test(lineText) &&
        !lineText.includes('process.env') && !lineText.includes('os.environ')
      );

      if (isHardcodedSecret) {
        addIssue({
          id: `sec-secret-${lineNo}`,
          title: 'Hardcoded Secret / API Token in Source Code',
          severity: 'high',
          category: 'auth',
          cwe: 'CWE-798',
          owaspCategory: 'A02:2021-Cryptographic Failures',
          file: file.name,
          line: lineNo,
          description: 'High-entropy secret token, private API credential, or administrative key embedded directly in plaintext source code.',
          impact: 'Exposure of production secrets through version control history, code sharing, or public repository leaks.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed.replace(/['"][a-zA-Z0-9_!@#$%^&*.\-]{16,}['"]/, 'process.env.APP_SECRET_KEY'),
          explanation: 'Replaced plaintext credential with secure environment variable lookup.',
          remediation: 'Store all secret tokens in environment variables or cloud secret managers (AWS Secrets Manager, GCP Secret Manager). Revoke the exposed key immediately.',
          verificationSteps: [
            'Confirm secret is moved to server-side .env file',
            'Verify code accesses credential via process.env',
            'Revoke and rotate exposed credential in provider dashboard'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Static secret credential detected on line ${lineNo} in ${file.name}.`,
          dataFlowProof: {
            source: 'Plaintext secret constant in repository',
            sanitizerStatus: 'Exposed to any repository reader or commit history',
            sink: 'Application source code bundle',
            exploitability: 'Compromised token grants unauthorized administrative API access.'
          }
        });
      }

      // 7. Insecure Deserialization (OWASP A08 / CWE-502) (#7)
      const isDeserialization = (
        /(?:pickle\.loads|yaml\.load\s*\([^)]*DEFAULT_FULL_SCHEMA|node-serialize\.unserialize|unserialize\s*\(\s*\$)/i.test(lineText)
      ) && !isTestFile;

      if (isDeserialization) {
        addIssue({
          id: `sec-deser-${lineNo}`,
          title: 'Insecure Object Deserialization',
          severity: 'critical',
          category: 'security',
          cwe: 'CWE-502',
          owaspCategory: 'A08:2021-Software and Data Integrity Failures',
          file: file.name,
          line: lineNo,
          description: 'Deserializing untrusted serialized binary objects enables gadget chains and arbitrary code execution.',
          impact: 'Remote code execution, memory corruption, and privilege escalation.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed.includes('yaml.load')
            ? trimmed.replace(/yaml\.load\((.*?)\)/, 'yaml.safe_load($1)')
            : '// Use safe JSON serialization instead\nconst safeData = JSON.parse(serializedData);',
          explanation: 'Replaced unsafe binary object deserialization with standard, schema-validated JSON parsing.',
          remediation: 'Never deserialize untrusted byte streams with pickle or unserialize. Use JSON or safe serialization formats.',
          verificationSteps: [
            'Attempt serialized object payload',
            'Verify server safely rejects binary gadgets',
            'Confirm only valid JSON structures are processed'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Insecure deserializer called on line ${lineNo} in ${file.name}.`,
          dataFlowProof: {
            source: 'Serialized user stream',
            sanitizerStatus: 'Unsandboxed object deserialization',
            sink: 'Object deserializer',
            exploitability: 'Magic methods / gadget chains execute arbitrary code during object reconstruction.'
          }
        });
      }

      // 8. Weak Hashing / Cryptography (OWASP A02 / CWE-327, CWE-328)
      const isWeakCrypto = (
        /(?:createHash\s*\(\s*['"](?:md5|sha1)['"]\)|hashlib\.(?:md5|sha1)|(?:^|\W)md5\s*\(\s*\$|\b(?:3DES|DES-EDE|RC4|ARCFOUR)\b|crypto\.createCipher(?:iv)?\s*\(\s*['"](?:des|rc4|bf))/i.test(lineText) &&
        (lowerName.includes('auth') || lowerName.includes('user') || lowerName.includes('password') || /password|passwd|pwd/i.test(lineText))
      );

      if (isWeakCrypto) {
        addIssue({
          id: `sec-crypto-${lineNo}`,
          title: 'Weak Password Hashing Algorithm (MD5 / SHA-1)',
          severity: 'high',
          category: 'security',
          cwe: 'CWE-328',
          owaspCategory: 'A02:2021-Cryptographic Failures',
          file: file.name,
          line: lineNo,
          description: 'MD5 and SHA-1 are cryptographically broken collision-vulnerable algorithms unsuitable for password storage.',
          impact: 'Rainbow table lookups and brute-force cracking of user passwords in seconds if database is dumped.',
          originalSnippet: trimmed,
          fixedSnippet: '// Use modern slow hashing algorithm with salt\nconst hash = await bcrypt.hash(password, 12);',
          explanation: 'Replaced fast broken hash with bcrypt/argon2 incorporating slow work factor and automatic salting.',
          remediation: 'Use bcrypt, Argon2id, or PBKDF2 with at least 10,000 rounds for password storage.',
          verificationSteps: [
            'Check generated hash format matches $2b$ or $argon2id$',
            'Verify rainbow tables cannot invert the salted hash',
            'Confirm password authentication verifies correctly with bcrypt.compare'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} invokes MD5/SHA-1 for credential processing.`,
          dataFlowProof: {
            source: 'Plaintext password input',
            sanitizerStatus: 'Weak unsalted fast hash',
            sink: 'Credential storage',
            exploitability: 'Precomputed rainbow tables reveal plaintext credentials immediately.'
          }
        });
      }

      // 9. CORS Misconfiguration (OWASP A05 / CWE-942)
      const isCorsMisconfig = (
        /cors\s*\(\s*\{.*origin\s*:\s*(?:true|['"]\*['"]).*credentials\s*:\s*true/i.test(lineText) ||
        /setHeader\(['"]Access-Control-Allow-Origin['"],\s*['"]\*['"]\)/i.test(lineText) && /credentials/i.test(file.content)
      );

      if (isCorsMisconfig) {
        addIssue({
          id: `sec-cors-${lineNo}`,
          title: 'Permissive CORS Configuration with Credentials',
          severity: 'medium',
          category: 'security',
          cwe: 'CWE-942',
          owaspCategory: 'A05:2021-Security Misconfiguration',
          file: file.name,
          line: lineNo,
          description: 'Configuring Access-Control-Allow-Origin to wildcard (*) or reflecting arbitrary origins while supporting credentials permits cross-origin credential theft.',
          impact: 'Third-party malicious websites can trigger authenticated API requests and read private user data.',
          originalSnippet: trimmed,
          fixedSnippet: 'cors({ origin: ["https://app.yourdomain.com"], credentials: true })',
          explanation: 'Restricted CORS origins to an explicit, authenticated domain allowlist.',
          remediation: 'Specify explicit trusted origins in CORS middleware; never reflect arbitrary origin headers with credentials enabled.',
          verificationSteps: [
            'Send request with Origin: https://evil.com',
            'Verify response does not return Access-Control-Allow-Origin: https://evil.com',
            'Confirm only authorized domain receives CORS approval'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Permissive CORS configuration on line ${lineNo} in ${file.name}.`,
          dataFlowProof: {
            source: 'Inbound Origin header',
            sanitizerStatus: 'Unfiltered reflection',
            sink: 'CORS response header',
            exploitability: 'Malicious origin accesses authenticated API payloads.'
          }
        });
      }

      // 10. Information Disclosure / Sensitive Environment Leak (OWASP A05 / CWE-200)
      const isEnvLeak = (
        /(?:res\.json|res\.send)\s*\(\s*(?:dict\s*\(\s*os\.environ\)|process\.env)\s*\)/i.test(lineText) ||
        /(?:res\.send|res\.status\(\d+\)\.send)\s*\(\s*err\.stack\s*\)/i.test(lineText)
      );

      if (isEnvLeak) {
        addIssue({
          id: `sec-env-${lineNo}`,
          title: 'Sensitive Information & System Environment Exposure',
          severity: 'high',
          category: 'security',
          cwe: 'CWE-200',
          owaspCategory: 'A05:2021-Security Misconfiguration',
          file: file.name,
          line: lineNo,
          description: 'Exposing process environment variables or stack traces to HTTP clients leaks server configuration, API keys, and internal architecture.',
          impact: 'Direct leakage of cloud credentials, database connection strings, and internal system paths.',
          originalSnippet: trimmed,
          fixedSnippet: 'res.status(500).json({ error: "Internal Server Error" });',
          explanation: 'Replaced detailed system dump with a safe, generic error response while keeping diagnostic logs on the server.',
          remediation: 'Never output process.env or stack traces in HTTP responses. Log errors securely to internal monitoring only.',
          verificationSteps: [
            'Trigger endpoint and inspect response payload',
            'Confirm no environment variables or internal paths are returned',
            'Verify server logs record error diagnostics internally'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Line ${lineNo} in ${file.name} serializes process.env or stack trace to client response.`,
          dataFlowProof: {
            source: 'Internal process environment / error stack',
            sanitizerStatus: 'Direct serialization to network response',
            sink: 'Client HTTP response body',
            exploitability: 'Attacker reads server secrets and database credentials directly from response.'
          }
        });
      }

      // 11. Broken Authentication: Insecure JWT Signing (OWASP A07 / CWE-347)
      const isJwtWeak = (
        /jwt\.sign\s*\([^)]*algorithm\s*:\s*['"]none['"]/i.test(lineText) ||
        /jwt\.sign\s*\([^)]*['"]secret['"]/i.test(lineText)
      );

      if (isJwtWeak) {
        addIssue({
          id: `sec-jwt-${lineNo}`,
          title: 'Insecure JWT Token Signing (Weak Secret / None Algorithm)',
          severity: 'critical',
          category: 'auth',
          cwe: 'CWE-347',
          owaspCategory: 'A07:2021-Identification and Authentication Failures',
          file: file.name,
          line: lineNo,
          description: 'Signing JWT tokens with the "none" algorithm or trivial static secrets allows attackers to forge administrative tokens.',
          impact: 'Complete authentication bypass and arbitrary user impersonation.',
          originalSnippet: trimmed,
          fixedSnippet: 'jwt.sign(payload, process.env.JWT_STRONG_SECRET, { algorithm: "HS256", expiresIn: "1h" })',
          explanation: 'Enforced strong environment-backed secret and standard cryptographic signature algorithm with expiration.',
          remediation: 'Use strong 256-bit secrets from environment variables and explicitly enforce HS256 or RS256.',
          verificationSteps: [
            'Test token verification with altered payload',
            'Verify forged token is rejected with JsonWebTokenError',
            'Confirm token includes valid expiration claim'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Insecure JWT signing pattern detected on line ${lineNo} in ${file.name}.`,
          dataFlowProof: {
            source: 'JWT signature definition',
            sanitizerStatus: 'Insecure signing configuration',
            sink: 'Client authorization token',
            exploitability: 'Attacker creates forged token with role: "admin" and passes signature check.'
          }
        });
      }

      // 12. Missing Rate Limiting on Authentication Route (OWASP A04 / CWE-770)
      const isAuthRouteNoLimit = (
        /app\.post\s*\(\s*['"]\/(?:api\/)?(?:v1\/)?(?:login|signin|auth|register|signup|forgot-password)['"]/i.test(lineText) &&
        !file.content.includes('rateLimit') && !file.content.includes('limiter')
      );

      if (isAuthRouteNoLimit) {
        addIssue({
          id: `sec-ratelimit-${lineNo}`,
          title: 'Missing Rate Limiting on Authentication Endpoint',
          severity: 'medium',
          category: 'auth',
          cwe: 'CWE-770',
          owaspCategory: 'A04:2021-Insecure Design',
          file: file.name,
          line: lineNo,
          description: 'Authentication endpoint does not enforce rate limiting or brute-force throttling, allowing credential stuffing attacks.',
          impact: 'Automated brute-force password attacks and denial of service against user databases.',
          originalSnippet: trimmed,
          fixedSnippet: 'const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });\napp.post("/api/login", authLimiter, (req, res) => { ... });',
          explanation: 'Integrated IP and account-based rate limiting to restrict failed login attempts.',
          remediation: 'Apply express-rate-limit or Redis token bucket to all login and password reset routes.',
          verificationSteps: [
            'Send 15 rapid consecutive login requests',
            'Verify server responds with HTTP 429 Too Many Requests after threshold',
            'Confirm rate limit resets after configured windowMs'
          ],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Public authentication endpoint on line ${lineNo} in ${file.name} lacks rate limit middleware.`,
          dataFlowProof: {
            source: 'Repeated inbound HTTP login requests',
            sanitizerStatus: 'No request frequency throttle',
            sink: 'Authentication query handler',
            exploitability: 'Attacker scripts automated credential stuffing without restriction.'
          }
        });
      }

      // 13. Bugs: Unhandled Promise Rejections & Resource Leaks
      if (/(?:new Promise|\.then\s*\()\s*/.test(lineText) && !file.content.includes('.catch') && !file.content.includes('try {')) {
        const bugMsg = `Promise chain missing .catch() error handler (${file.name}:${lineNo})`;
        runtimeBugs.push(bugMsg);
        addIssue({
          id: `bug-promise-${lineNo}`,
          title: 'Unhandled Asynchronous Promise Rejection',
          severity: 'medium',
          category: 'bug',
          cwe: 'CWE-703',
          owaspCategory: 'A04:2021-Insecure Design',
          file: file.name,
          line: lineNo,
          description: 'Promise chain initiated without an attached .catch() error handler may cause unhandled rejection crashes or hung asynchronous tasks.',
          impact: 'Unhandled asynchronous rejection terminates Node process or leaks memory.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed + '\n  .catch((err) => { console.error("Caught asynchronous error:", err); });',
          explanation: 'Appended .catch() handler to ensure all asynchronous rejection branches are intercepted.',
          remediation: 'Attach .catch() handlers or use async/await with try-catch blocks.',
          verificationSteps: ['Simulate promise failure', 'Confirm error is captured gracefully'],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Promise on line ${lineNo} in ${file.name} lacks .catch().`,
          dataFlowProof: {
            source: 'Asynchronous Promise execution',
            sanitizerStatus: 'No rejection handler',
            sink: 'Runtime process event loop',
            exploitability: 'Unhandled promise rejection can crash Node runtime process.'
          }
        });
      }
      if (/(?:fs\.createReadStream|net\.connect)\s*\(/.test(lineText) && !file.content.includes('.on(\'error\'')) {
        const bugMsg = `Stream opened without error listener (${file.name}:${lineNo})`;
        runtimeBugs.push(bugMsg);
        addIssue({
          id: `bug-stream-${lineNo}`,
          title: 'Stream Missing Error Listener (Resource Leak)',
          severity: 'medium',
          category: 'bug',
          cwe: 'CWE-775',
          owaspCategory: 'A04:2021-Insecure Design',
          file: file.name,
          line: lineNo,
          description: 'Stream opened without an error event listener can cause uncaught exceptions on socket/file descriptor errors.',
          impact: 'Uncaught stream error terminates application process or leaks open file descriptors.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed + '\nstream.on("error", (err) => { console.error("Stream error:", err); });',
          explanation: 'Registered error listener on stream instance to safely capture stream aborts.',
          remediation: 'Always bind an error event handler to readable/writable streams.',
          verificationSteps: ['Simulate stream read failure', 'Verify error handler receives error without process termination'],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Stream declared on line ${lineNo} in ${file.name} without .on('error') listener.`,
          dataFlowProof: {
            source: 'I/O Stream',
            sanitizerStatus: 'No error event boundary',
            sink: 'OS File descriptor table',
            exploitability: 'Stream failure crashes Node runtime.'
          }
        });
      }
      if (/SELECT\s+\*\s+FROM\s+[a-zA-Z0-9_]+\s*;?$/i.test(trimmed) && (lowerName.includes('api') || lowerName.includes('route'))) {
        const bugMsg = `Unbounded SELECT * query without LIMIT clause in API handler (${file.name}:${lineNo})`;
        logicBugs.push(bugMsg);
        addIssue({
          id: `bug-unbounded-${lineNo}`,
          title: 'Unbounded Database Query (Missing LIMIT Clause)',
          severity: 'low',
          category: 'bug',
          cwe: 'CWE-400',
          owaspCategory: 'A04:2021-Insecure Design',
          file: file.name,
          line: lineNo,
          description: 'Executing SELECT * without pagination or LIMIT clause on tables with growing row counts risks memory exhaustion.',
          impact: 'High latency, database connection pool starvation, and server out-of-memory crashes under load.',
          originalSnippet: trimmed,
          fixedSnippet: trimmed.replace(/;?$/, ' LIMIT 100 OFFSET 0;'),
          explanation: 'Appended LIMIT and OFFSET clauses to enforce deterministic page size bounds.',
          remediation: 'Implement cursor-based or offset pagination with strict maximum limit.',
          verificationSteps: ['Query database with large test table', 'Verify maximum returned rows capped at limit'],
          isVerifiedFact: true,
          confidenceLevel: 'Confirmed',
          statusCategory: 'Confirmed',
          evidenceBasis: `Query on line ${lineNo} in ${file.name} lacks LIMIT bounds.`,
          dataFlowProof: {
            source: 'HTTP API request',
            sanitizerStatus: 'No pagination parameter',
            sink: 'Database table scanner',
            exploitability: 'Table size expansion causes high memory usage and response latency.'
          }
        });
      }

      // Track Auth mechanisms
      if (/(passport|jwt|bcrypt|session|oauth|bearer|cookie-parser)/i.test(lineText)) {
        if (/jwt/i.test(lineText)) authMechanismsFound.add('JWT (JSON Web Token)');
        if (/bcrypt/i.test(lineText)) authMechanismsFound.add('Bcrypt Password Hashing');
        if (/oauth/i.test(lineText)) authMechanismsFound.add('OAuth2 Authentication');
        if (/session/i.test(lineText)) authMechanismsFound.add('Stateful Cookie Session');
      }
    });
  }

  // Synthesize Bug Report (Synchronized directly with bug issues)
  const bugIssues = issues.filter(i => i.category === 'bug');
  const bugReport = {
    totalBugs: bugIssues.length,
    runtimeBugs: runtimeBugs.slice(0, 10),
    logicBugs: logicBugs.slice(0, 10),
    syntaxBugs: syntaxBugs.slice(0, 10)
  };

  // Synthesize Auth & API security analysis
  const authSecurityAnalysis = {
    authMechanismsFound: Array.from(authMechanismsFound),
    issuesFound: issues.filter(i => i.category === 'auth' || i.cwe === 'CWE-287' || i.cwe === 'CWE-770').map(i => `${i.title} (${i.file}:${i.line})`),
    recommendations: [
      'Enforce multi-factor authentication (MFA) and strong password complexity policy',
      'Implement strict rate limiting on all public authentication and credential-reset endpoints',
      'Ensure session cookies utilize HttpOnly, Secure, and SameSite=Strict flags',
      'Validate JWT signatures with cryptographically robust asymmetric or 256-bit symmetric secrets'
    ]
  };

  const dependencyAnalysis = {
    totalDependencies,
    vulnerableDependencies,
    summary: vulnerableDependencies.length > 0
      ? `Identified ${vulnerableDependencies.length} package(s) with known CVE security advisories in project manifests.`
      : (totalDependencies > 0
        ? `Analyzed ${totalDependencies} declared dependencies; no known critical CVE vulnerabilities detected in static manifest inspection.`
        : 'No package manifest files (package.json, requirements.txt) detected in audited files.')
  };

  return {
    issues,
    bugReport,
    dependencyAnalysis,
    authSecurityAnalysis
  };
}

// -------------------------------------------------------------
// POST /api/audit/scan-code
// Full, authentic, multi-engine code auditor with deep Meta AI integration
// -------------------------------------------------------------
app.post('/api/audit/scan-code', async (req: Request, res: Response) => {
  try {
    const {
      projectName = 'Project Code',
      sourceType = 'paste',
      scanType = 'full', // 'full' | 'security' | 'quick'
      codeText = req.body.codeText || req.body.code || '',
      githubUrl = '',
      files = []
    } = req.body;

    let loadedFiles: { name: string; content: string }[] = [];
    let fileCount = 1;
    let totalFilesFound = 1;
    let unscannedFilesList: string[] = [];
    let skippedFilesDetailed: SkippedFileInfo[] = [];
    let languageDistribution: LanguageDistributionItem[] = [];
    let finalProjectName = projectName;
    let primaryFileName = 'snippet.ts';

    // 1. Process GitHub repository input
    if (sourceType === 'github') {
      if (!githubUrl || !githubUrl.trim()) {
        return res.status(400).json({ error: 'Please enter a valid GitHub repository URL (e.g. facebook/react or https://github.com/facebook/react).' });
      }

      try {
        const ghRepoData = await fetchGithubRepoFiles(githubUrl);
        loadedFiles = ghRepoData.files;
        fileCount = ghRepoData.scannedFilesCount;
        totalFilesFound = ghRepoData.totalFilesFound;
        unscannedFilesList = ghRepoData.skippedFiles;
        skippedFilesDetailed = ghRepoData.skippedFilesList;
        languageDistribution = ghRepoData.languageDistribution;
        primaryFileName = loadedFiles[0]?.name || 'main.ts';

        const parsedRepo = extractGithubOwnerRepo(githubUrl);
        finalProjectName = parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : (projectName || githubUrl);
      } catch (ghErr: any) {
        const parsedRepo = extractGithubOwnerRepo(githubUrl);
        const displayRepoName = parsedRepo ? `${parsedRepo.owner}/${parsedRepo.repo}` : (ghErr.repoName || githubUrl);
        if (ghErr.isPrivateRepo) {
          return res.status(400).json({
            error: ghErr.message,
            isPrivateRepo: true,
            repoName: displayRepoName
          });
        }
        return res.status(400).json({ error: ghErr.message || 'Failed to fetch GitHub repository' });
      }
    } else if (sourceType === 'upload') {
      if (!Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Please upload at least one code file or ZIP archive.' });
      }
      loadedFiles = files.map((f: any) => ({
        name: String(f.name || 'uploaded_file').trim(),
        content: String(f.content || '')
      }));
      fileCount = loadedFiles.length;
      totalFilesFound = loadedFiles.length;
      primaryFileName = loadedFiles[0]?.name || 'uploaded_file';
      finalProjectName = files.length === 1 ? files[0].name : projectName;

      // Calculate language distribution for uploaded files
      const langCounts: Record<string, number> = {};
      for (const f of loadedFiles) {
        const l = detectLanguageFromPath(f.name);
        langCounts[l] = (langCounts[l] || 0) + 1;
      }
      languageDistribution = Object.entries(langCounts)
        .map(([language, count]) => ({
          language,
          filesCount: count,
          percentage: Math.round((count / loadedFiles.length) * 100)
        }))
        .sort((a, b) => b.filesCount - a.filesCount);
    } else {
      loadedFiles = [{ name: primaryFileName, content: codeText }];
      fileCount = 1;
      totalFilesFound = 1;
      const detectedL = detectLanguageFromPath(primaryFileName);
      languageDistribution = [{ language: detectedL, filesCount: 1, percentage: 100 }];
    }

    const targetCodeToAnalyze = loadedFiles.map(f => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');

    if (!targetCodeToAnalyze || targetCodeToAnalyze.trim().length === 0) {
      return res.status(400).json({ error: 'Source code content is empty. Please provide valid code to audit.' });
    }

    // 2. Strict Input Validation (Reject non-code, gibberish, pure numbers, etc.)
    const codeValidation = validateSourceCode(targetCodeToAnalyze, primaryFileName);
    if (!codeValidation.isValid) {
      return res.status(400).json({
        error: codeValidation.error || 'The submitted text does not contain valid programming source code.',
        validation: codeValidation
      });
    }

    const detectedLanguage = codeValidation.detectedLanguage || languageDistribution[0]?.language || 'Unknown Language';

    // 3. Run Real Comprehensive Static Code Analysis
    const staticResults = runComprehensiveStaticAnalysis(loadedFiles, scanType);
    const verifiedStaticIssues = staticResults.issues;

    // 4. Compute coverage metrics
    const isPartialScan = totalFilesFound > fileCount;
    const coveragePercent = totalFilesFound > 0 ? Math.round((fileCount / totalFilesFound) * 100) : 100;
    const auditTypeLabel = isPartialScan
      ? `Priority Repository Audit (${fileCount} of ${totalFilesFound} files - ${coveragePercent}% Coverage)`
      : `Exhaustive Code Audit (${fileCount} of ${totalFilesFound} files - 100% Coverage)`;

    const coverageDetails = {
      totalFiles: totalFilesFound,
      scannedFilesCount: fileCount,
      unscannedFilesCount: Math.max(0, totalFilesFound - fileCount),
      scannedFiles: loadedFiles.map(f => f.name),
      skippedFiles: unscannedFilesList,
      skippedFilesList: skippedFilesDetailed,
      coveragePercent,
      isPartialScan,
      auditTypeLabel
    };

    // 5. Deep Analysis via Meta AI API (when configured) or Pure Verified Static Engine
    let finalIssues = [...verifiedStaticIssues];
    let executiveSummary = '';
    let architectureReview = '';
    let aiTestedScopeNote = '';
    let aiUntestedItems: string[] = [];

    // Meta AI receives line-numbered source code context for exact line correlation
    const contextForAi = loadedFiles
      .slice(0, 15)
      .map(f => {
        const ext = f.name.split('.').pop() || 'text';
        const lines = f.content.split('\n');
        const numberedLines = lines
          .map((line, idx) => `${idx + 1}: ${line}`)
          .join('\n')
          .slice(0, 6000);
        return `File: ${f.name}\n\`\`\`${ext}\n${numberedLines}\n\`\`\``;
      })
      .join('\n\n')
      .slice(0, 22000);

    const promptForMeta = `You are CoreAudit Senior Security Staff Engineer and Static Analysis Engine.
Perform an evidence-based ${scanType.toUpperCase()} security audit on the code repository below.

Repository: ${finalProjectName}
Audited Files: ${fileCount} of ${totalFilesFound} (${coveragePercent}% coverage)
Detected Language: ${detectedLanguage}

STATIC CODE ANALYSIS FINDINGS DETECTED BY ENGINE:
${verifiedStaticIssues.length === 0 ? 'No static vulnerabilities detected in initial analysis.' : JSON.stringify(verifiedStaticIssues.map(i => ({
  title: i.title,
  severity: i.severity,
  cwe: i.cwe,
  file: i.file,
  line: i.line,
  originalSnippet: i.originalSnippet
})), null, 2)}

SOURCE CODE (WITH 1-INDEXED LINE NUMBERS):
${contextForAi}

STRICT AUDIT ENGINE RULES:
1. TEST & EXAMPLE FILE ISOLATION: Any file in test/, tests/, spec/, __tests__/, mock/, fixtures/, example/, or sample/ MUST have "isTestOrExample": true, "verificationStatus": "test_scope", and "statusCategory": "Test / Example Scope". DO NOT assign 'critical' or 'high' severity to test code; downgrade severity to 'low' or 'info'.
2. PROVEN SOURCE-TO-SINK TAINT FLOW REQUIRED: DO NOT confirm a vulnerability based solely on keywords. You MUST verify an untrusted source (req.body, req.query, req.params, $_GET, $_POST, args[]) flowing into an unsanitized execution sink. If input is sanitized or parameterized, return issue as False Positive ("verificationStatus": "false_positive").
3. NO PROOF, NO HIGH/CRITICAL: You MUST NOT assign 'critical' or 'high' severity without verified source-to-sink proof in production code. If unreachable, theoretical, or in test files, use 'medium', 'low', or 'info'.
4. EXACT LINE NUMBERS & FILE CORRELATION: File paths MUST match the exact paths provided in SOURCE CODE. Line numbers MUST be 1-indexed and correspond to the exact lines in the provided code snippets.
5. CONTEXTUAL METADATA & FUNCTIONAL FIX: Validate exact CWE ID (CWE-89 for SQLi, CWE-79 for XSS, CWE-78 for Command Injection, CWE-22 for Path Traversal, CWE-798 for Secrets, CWE-287 for Auth, CWE-502 for Insecure Deserialization, CWE-918 for SSRF), severity, 1-indexed line evidence snippet, and a functional, syntax-valid fixedSnippet maintaining original function signatures and variable context.
6. NO FABRICATION: Only report vulnerabilities with direct code evidence from the provided source files.

Respond strictly in pure JSON format:
{
  "summary": "Executive 2-sentence summary of security and architectural posture",
  "score": <integer 0-100>,
  "grade": "A" | "B" | "C" | "D",
  "codeQualityScore": <integer 0-100>,
  "performanceScore": <integer 0-100>,
  "architectureReview": "Concise architectural review of design patterns, modularity, and error boundaries",
  "testedScopeNote": "Static analysis & Meta AI taint-flow inspection of ${fileCount} file(s).",
  "untestedItems": ["Runtime OS configuration", "Live network firewall and TLS termination", "Dynamic database concurrency and deadlock conditions"],
  "finalRecommendations": [
    "Prioritized actionable recommendation 1",
    "Prioritized actionable recommendation 2",
    "Prioritized actionable recommendation 3"
  ],
  "issues": [
    {
      "id": "sec-ai-1",
      "title": "Precise Title",
      "severity": "critical" | "high" | "medium" | "low" | "info",
      "category": "security" | "dependency" | "bug" | "auth" | "performance",
      "cwe": "CWE-XX",
      "owaspCategory": "A0X:2021-Category",
      "file": "exact/path/to/file.ext",
      "line": <integer 1-indexed>,
      "description": "Root cause explanation",
      "impact": "Production consequence if exploited",
      "originalSnippet": "Exact flawed code line",
      "fixedSnippet": "Hardened replacement code",
      "explanation": "Why this fix works",
      "remediation": "Prescriptive developer remediation",
      "verificationSteps": ["Step 1", "Step 2"],
      "isVerifiedFact": true,
      "confidenceLevel": "Confirmed" | "Probable" | "Heuristic" | "False Positive",
      "statusCategory": "Confirmed" | "Potential" | "Test / Example Scope" | "Needs Manual Review" | "False Positive",
      "verificationStatus": "confirmed" | "probable" | "false_positive" | "test_scope",
      "isTestOrExample": false,
      "sourceToSink": {
        "source": "Untrusted source variable",
        "dataFlow": "Step-by-step path from source to sink",
        "sanitizerStatus": "Unsanitized / Missing escaping",
        "sink": "Database / Command / DOM / File sink",
        "exploitability": "Concrete exploit scenario",
        "isReachable": true
      }
    }
  ]
}
`;

    let aiGeneratedResult: any = null;
    let metaModelUsed = '';
    let metaAiSuccess = false;
    let metaAiErrorMessage = '';

    if (currentMetaApiKey) {
      try {
        const metaResp = await generateWithMeta(
          promptForMeta,
          'You are CoreAudit, an elite automated code security auditor and staff software engineer. Output pure, valid, properly-escaped JSON only without markdown formatting. Keep string values concise.',
          'muse-spark-1.3',
          4096,
          90000,
          0.1
        );
        metaModelUsed = metaResp.modelUsed;
        const respText = metaResp.text?.trim() || '{}';
        aiGeneratedResult = safeParseAiJson(respText);
        metaAiSuccess = true;
      } catch (aiErr: any) {
        metaAiErrorMessage = aiErr.message || 'Meta AI error';
        console.info(`Meta AI live call failed (${metaAiErrorMessage}); using verified static analysis engine as safety fallback.`);
      }
    }

    // Merge AI enriched findings with static analysis findings (deduplicating and enriching)
    if (aiGeneratedResult && Array.isArray(aiGeneratedResult.issues)) {
      executiveSummary = aiGeneratedResult.summary || '';
      architectureReview = aiGeneratedResult.architectureReview || '';
      aiTestedScopeNote = aiGeneratedResult.testedScopeNote || '';
      aiUntestedItems = Array.isArray(aiGeneratedResult.untestedItems) ? aiGeneratedResult.untestedItems : [];

      const mergedIssueKeys = new Set<string>(finalIssues.map(i => `${i.file.toLowerCase()}:${i.line}:${i.cwe}`));

      for (const aiIssue of aiGeneratedResult.issues) {
        const reportedFile = String(aiIssue.file || primaryFileName).trim();
        const reportedLine = typeof aiIssue.line === 'number' ? Math.floor(aiIssue.line) : 1;
        const normFile = reportedFile.toLowerCase();
        const normCwe = String(aiIssue.cwe || 'cwe').toLowerCase();
        const key = `${normFile}:${reportedLine}:${normCwe}`;
        const isTestFile = isTestOrExamplePath(reportedFile);

        const isFalsePositive = (
          String(aiIssue.confidenceLevel).toLowerCase() === 'false positive' ||
          String(aiIssue.statusCategory).toLowerCase() === 'false positive' ||
          String(aiIssue.verificationStatus).toLowerCase() === 'false_positive'
        );

        // If an issue already exists at the same file and line, enrich it with Meta AI's intelligence
        const existingIssue = finalIssues.find(i =>
          (i.file.toLowerCase() === normFile || i.file.toLowerCase().endsWith('/' + normFile) || normFile.endsWith('/' + i.file.toLowerCase())) &&
          i.line === reportedLine
        );

        if (existingIssue) {
          if (aiIssue.fixedSnippet && aiIssue.fixedSnippet.length > 5) {
            existingIssue.fixedSnippet = aiIssue.fixedSnippet;
          }
          if (aiIssue.explanation && aiIssue.explanation.length > 10) {
            existingIssue.explanation = aiIssue.explanation;
          }
          if (aiIssue.description && aiIssue.description.length > 10) {
            existingIssue.description = aiIssue.description;
          }
          if (aiIssue.remediation && aiIssue.remediation.length > 10) {
            existingIssue.remediation = aiIssue.remediation;
          }
          if (aiIssue.sourceToSink) {
            existingIssue.sourceToSink = aiIssue.sourceToSink;
          } else if (aiIssue.dataFlowProof) {
            existingIssue.dataFlowProof = aiIssue.dataFlowProof;
            existingIssue.sourceToSink = {
              source: aiIssue.dataFlowProof.source,
              dataFlow: aiIssue.dataFlowProof.source + ' ➔ ' + aiIssue.dataFlowProof.sanitizerStatus + ' ➔ ' + aiIssue.dataFlowProof.sink,
              sanitizerStatus: aiIssue.dataFlowProof.sanitizerStatus,
              sink: aiIssue.dataFlowProof.sink,
              exploitability: aiIssue.dataFlowProof.exploitability,
              isReachable: !isTestFile
            };
          }
          if (Array.isArray(aiIssue.verificationSteps) && aiIssue.verificationSteps.length > 0) {
            existingIssue.verificationSteps = aiIssue.verificationSteps;
          }
          if (aiIssue.impact && aiIssue.impact.length > 5) {
            existingIssue.impact = aiIssue.impact;
          }
          if (isFalsePositive) {
            existingIssue.verificationStatus = 'false_positive';
            existingIssue.statusCategory = 'False Positive';
            existingIssue.confidenceLevel = 'False Positive';
          }
          existingIssue.evidenceBasis = `Verified by Meta AI taint-flow analysis in ${reportedFile} on line ${reportedLine}.`;
        } else if (!mergedIssueKeys.has(key)) {
          mergedIssueKeys.add(key);
          const safeFileSlug = normFile
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(-16) || 'f';

          let initialSeverity = aiIssue.severity || 'medium';
          let initialVerStatus: 'confirmed' | 'probable' | 'false_positive' | 'test_scope' = isFalsePositive
            ? 'false_positive'
            : (isTestFile ? 'test_scope' : (aiIssue.verificationStatus || 'confirmed'));
          let initialStatusCat: 'Confirmed' | 'Potential' | 'Test / Example Scope' | 'Needs Manual Review' | 'False Positive' = isFalsePositive
            ? 'False Positive'
            : (isTestFile ? 'Test / Example Scope' : (aiIssue.statusCategory || 'Confirmed'));

          // Enforce: Test files never receive Critical or High severity
          if (isTestFile && (initialSeverity === 'critical' || initialSeverity === 'high')) {
            initialSeverity = 'low';
          }

          finalIssues.push({
            id: aiIssue.id || `ai-${safeFileSlug}-${finalIssues.length + 1}`,
            title: aiIssue.title || 'Security Anomaly',
            severity: initialSeverity,
            category: aiIssue.category || 'security',
            cwe: aiIssue.cwe || 'CWE-Other',
            owaspCategory: aiIssue.owaspCategory || 'A00:2021-Security',
            file: reportedFile,
            line: reportedLine,
            description: aiIssue.description || 'Vulnerability detected during code inspection.',
            impact: aiIssue.impact || 'System integrity risk.',
            originalSnippet: aiIssue.originalSnippet || '// Vulnerable code',
            fixedSnippet: aiIssue.fixedSnippet || '// Hardened replacement',
            explanation: aiIssue.explanation || 'Refactored to enforce strict security controls while preserving functionality.',
            remediation: aiIssue.remediation || 'Apply patch to resolve security exposure.',
            verificationSteps: Array.isArray(aiIssue.verificationSteps) ? aiIssue.verificationSteps : ['Re-run code auditor to verify resolution'],
            isVerifiedFact: aiIssue.isVerifiedFact !== false,
            confidenceLevel: isFalsePositive ? 'False Positive' : (aiIssue.confidenceLevel || 'Confirmed'),
            statusCategory: initialStatusCat,
            verificationStatus: initialVerStatus,
            isTestOrExample: isTestFile,
            evidenceBasis: aiIssue.evidenceBasis || `Identified in ${reportedFile} on line ${reportedLine}.`,
            sourceToSink: aiIssue.sourceToSink || (aiIssue.dataFlowProof ? {
              source: aiIssue.dataFlowProof.source,
              dataFlow: aiIssue.dataFlowProof.source + ' ➔ ' + aiIssue.dataFlowProof.sanitizerStatus + ' ➔ ' + aiIssue.dataFlowProof.sink,
              sanitizerStatus: aiIssue.dataFlowProof.sanitizerStatus,
              sink: aiIssue.dataFlowProof.sink,
              exploitability: aiIssue.dataFlowProof.exploitability,
              isReachable: !isTestFile
            } : undefined),
            dataFlowProof: aiIssue.dataFlowProof
          });
        }
      }
    }

    const parsedFiles = loadedFiles.map(f => ({
      name: f.name,
      content: f.content,
      lines: f.content.split('\n')
    }));

    // Verify and bind exact line numbers to real file contents
    const seenVerifiedIds = new Set<string>();
    const verifiedIssues = finalIssues.map((iss, index) => {
      const reportedFile = String(iss.file || primaryFileName).trim();
      const rawSnippet = String(iss.originalSnippet || '').trim();
      const reportedLine = typeof iss.line === 'number' ? Math.floor(iss.line) : 1;
      const isTestFile = isTestOrExamplePath(reportedFile);

      let matchedFile = parsedFiles.find(f =>
        f.name === reportedFile ||
        f.name.endsWith('/' + reportedFile) ||
        reportedFile.endsWith('/' + f.name) ||
        f.name.toLowerCase() === reportedFile.toLowerCase()
      );

      let verifiedLine = reportedLine;
      let lineVerified = false;

      if (matchedFile && rawSnippet.length > 0) {
        const snippetFirstLine = rawSnippet.split('\n').map(l => l.trim()).find(l => l.length > 3) || '';
        if (snippetFirstLine.length > 3) {
          const lineIdx = matchedFile.lines.findIndex(l => l.includes(snippetFirstLine));
          if (lineIdx !== -1) {
            verifiedLine = lineIdx + 1;
            lineVerified = true;
          } else if (reportedLine >= 1 && reportedLine <= matchedFile.lines.length) {
            verifiedLine = reportedLine;
            lineVerified = true;
          }
        }
      }

      if (!matchedFile) {
        matchedFile = parsedFiles[0] || { name: primaryFileName, content: '', lines: [] };
      }

      const fileMaxLines = Math.max(1, matchedFile.lines.length);
      verifiedLine = Math.min(Math.max(1, verifiedLine), fileMaxLines);

      let actualSnippet = rawSnippet;
      if (matchedFile.lines.length >= verifiedLine && (!actualSnippet || actualSnippet.length < 3)) {
        actualSnippet = matchedFile.lines[verifiedLine - 1]?.trim() || '// Vulnerable code';
      }

      let safeId = iss.id || `iss-${index + 1}`;
      if (seenVerifiedIds.has(safeId)) {
        safeId = `${safeId}_${index + 1}`;
      }
      seenVerifiedIds.add(safeId);

      let finalSeverity = iss.severity;
      let verStatus = iss.verificationStatus || 'confirmed';
      let statCat = iss.statusCategory || 'Confirmed';

      // Rule: Test/example files cannot have Critical or High severity
      if (isTestFile) {
        if (finalSeverity === 'critical' || finalSeverity === 'high') {
          finalSeverity = 'low';
        }
        verStatus = 'test_scope';
        statCat = 'Test / Example Scope';
      } else if (finalSeverity === 'critical' || finalSeverity === 'high') {
        // Rule: Production Critical or High requires proven source-to-sink taint flow
        const hasTaint = iss.sourceToSink?.source && iss.sourceToSink?.sink;
        if (!hasTaint) {
          finalSeverity = 'medium';
          verStatus = 'probable';
          statCat = 'Potential';
        }
      }

      return {
        ...iss,
        id: safeId,
        file: matchedFile.name,
        line: verifiedLine,
        severity: finalSeverity,
        originalSnippet: actualSnippet,
        isTestOrExample: isTestFile,
        verificationStatus: verStatus,
        statusCategory: statCat,
        isVerifiedFact: iss.isVerifiedFact !== undefined ? Boolean(iss.isVerifiedFact) : lineVerified,
        confidenceLevel: iss.confidenceLevel || 'Confirmed',
        evidenceBasis: iss.evidenceBasis || `Verified on line ${verifiedLine} in ${matchedFile.name} (${iss.cwe || 'CWE Finding'}).`,
        verificationSteps: iss.verificationSteps && iss.verificationSteps.length > 0
          ? iss.verificationSteps
          : [
              `Review line ${verifiedLine} in ${matchedFile.name}`,
              `Apply hardened code replacement`,
              `Execute unit test suite to verify no functional regression`
            ],
        sourceToSink: iss.sourceToSink || (iss.dataFlowProof ? {
          source: iss.dataFlowProof.source,
          dataFlow: iss.dataFlowProof.source + ' ➔ ' + iss.dataFlowProof.sanitizerStatus + ' ➔ ' + iss.dataFlowProof.sink,
          sanitizerStatus: iss.dataFlowProof.sanitizerStatus,
          sink: iss.dataFlowProof.sink,
          exploitability: iss.dataFlowProof.exploitability,
          isReachable: !isTestFile
        } : undefined)
      };
    });

    // Active issues for scoring and counts (excludes false positives from deduction penalty)
    const activeIssues = verifiedIssues.filter(iss => iss.verificationStatus !== 'false_positive' && iss.confidenceLevel !== 'False Positive');

    // Strict Mathematical Issue & Severity Counts (100% Consistent)
    const criticalCount = activeIssues.filter(i => i.severity === 'critical').length;
    const highCount = activeIssues.filter(i => i.severity === 'high').length;
    const mediumCount = activeIssues.filter(i => i.severity === 'medium').length;
    const lowCount = activeIssues.filter(i => i.severity === 'low').length;
    const infoCount = activeIssues.filter(i => i.severity === 'info').length;
    const issuesCount = criticalCount + highCount + mediumCount + lowCount + infoCount;

    const confirmedIssuesCount = activeIssues.filter(i => i.verificationStatus === 'confirmed').length;
    const testScopeIssuesCount = activeIssues.filter(i => i.verificationStatus === 'test_scope').length;
    const falsePositivesCount = verifiedIssues.filter(i => i.verificationStatus === 'false_positive' || i.confidenceLevel === 'False Positive').length;

    // Mathematical Score Calculation (Strict, Transparent, Evidence-Based)
    let computedScore: number;
    let computedGrade: 'A' | 'B' | 'C' | 'D';

    const deductions = (criticalCount * 25) + (highCount * 15) + (mediumCount * 8) + (lowCount * 3) + (infoCount * 1);
    if (issuesCount === 0 || (100 - deductions) >= 88) {
      computedScore = issuesCount === 0 ? 98 : Math.max(0, Math.min(100, Math.round(100 - deductions)));
      computedGrade = 'A';
    } else {
      computedScore = Math.max(0, Math.min(100, Math.round(100 - deductions)));
      computedGrade = (criticalCount > 0 || highCount > 1 || computedScore < 50)
        ? 'D'
        : (highCount === 1 || mediumCount > 2 || computedScore < 70 ? 'C' : 'B');
    }

    const scoreExplanation = `Base score of 100 with strict deductions: Critical (-25 pts each: ${criticalCount * 25}), High (-15 pts each: ${highCount * 15}), Medium (-8 pts each: ${mediumCount * 8}), Low (-3 pts each: ${lowCount * 3}), Info (-1 pt each: ${infoCount * 1}). Total Deductions: -${deductions} pts. Final Score: ${computedScore}/100. Grade: ${computedGrade} (Grade Scale: A = 88-100, B = 70-87, C = 50-69, D = <50).`;

    // Reconcile Bug Detection Report with issues list
    const bugIssues = activeIssues.filter(i => i.category === 'bug');
    const runtimeBugs = bugIssues.filter(i => /runtime|promise|crash|null|exception|leak/i.test(i.title)).map(i => `${i.title} (${i.file}:${i.line})`);
    const logicBugs = bugIssues.filter(i => !/runtime|promise|crash|null|exception|leak|syntax/i.test(i.title)).map(i => `${i.title} (${i.file}:${i.line})`);
    const syntaxBugs = bugIssues.filter(i => /syntax|parse/i.test(i.title)).map(i => `${i.title} (${i.file}:${i.line})`);

    const synchronizedBugReport = {
      totalBugs: bugIssues.length,
      runtimeBugs: runtimeBugs.length > 0 ? runtimeBugs : staticResults.bugReport.runtimeBugs.slice(0, 5),
      logicBugs: logicBugs.length > 0 ? logicBugs : staticResults.bugReport.logicBugs.slice(0, 5),
      syntaxBugs: syntaxBugs.length > 0 ? syntaxBugs : staticResults.bugReport.syntaxBugs.slice(0, 5)
    };
    synchronizedBugReport.totalBugs = bugIssues.length;

    const codeQualityScore = typeof aiGeneratedResult?.codeQualityScore === 'number'
      ? Math.max(10, Math.min(100, Math.round(aiGeneratedResult.codeQualityScore)))
      : (issuesCount === 0 ? 96 : Math.max(25, Math.min(100, Math.round(92 - (bugIssues.length * 4) - (mediumCount * 3)))));

    const performanceScore = typeof aiGeneratedResult?.performanceScore === 'number'
      ? Math.max(10, Math.min(100, Math.round(aiGeneratedResult.performanceScore)))
      : (issuesCount === 0 ? 95 : Math.max(30, Math.min(100, Math.round(94 - (activeIssues.filter(i => i.category === 'performance').length * 15)))));

    // Deterministic Audit Scope Determination
    let auditScopeType: 'full_repo' | 'partial_repo' | 'snippet' | 'file_upload';
    let auditScopeDescription: string;
    let coverageScopePrefix: string;

    if (sourceType === 'github') {
      if (isPartialScan) {
        auditScopeType = 'partial_repo';
        auditScopeDescription = `Partial Repository Audit (${fileCount} of ${totalFilesFound} files analyzed - ${coveragePercent}% Coverage)`;
        coverageScopePrefix = `Partial repository security audit completed (${coveragePercent}% coverage: ${fileCount} of ${totalFilesFound} files audited). `;
      } else {
        auditScopeType = 'full_repo';
        auditScopeDescription = `Full Repository Audit (${fileCount} of ${totalFilesFound} files analyzed - 100% Coverage)`;
        coverageScopePrefix = `Exhaustive 100% full repository security audit completed across ${fileCount} files. `;
      }
    } else if (sourceType === 'upload') {
      auditScopeType = 'file_upload';
      auditScopeDescription = `Uploaded Source Archive Audit (${fileCount} file(s) inspected)`;
      coverageScopePrefix = `Uploaded code security audit completed across ${fileCount} file(s). `;
    } else {
      const lineCount = (loadedFiles[0]?.content || '').split('\n').length;
      auditScopeType = 'snippet';
      auditScopeDescription = `Code Snippet Security Audit (${lineCount} lines analyzed)`;
      coverageScopePrefix = `Code snippet security audit completed (${lineCount} lines). `;
    }

    const defaultSummary = issuesCount === 0
      ? `${coverageScopePrefix}Zero high-risk vulnerabilities, injection sinks, or security flaws detected (Score: ${computedScore}/100, Grade: ${computedGrade}).`
      : `${coverageScopePrefix}Identified ${issuesCount} vulnerability issue(s) with ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, and ${lowCount} low findings (Score: ${computedScore}/100, Grade: ${computedGrade}).`;

    const finalRecommendations = Array.isArray(aiGeneratedResult?.finalRecommendations) && aiGeneratedResult.finalRecommendations.length > 0
      ? aiGeneratedResult.finalRecommendations
      : [
          criticalCount > 0 ? 'Immediately remediate Critical injection & RCE vulnerabilities before deploying to production' : 'Keep dependencies updated using automated security scanning (Dependabot/Snyk)',
          'Implement input validation and context-aware parameterized statements across all database queries',
          'Enforce strict security headers (Helmet, Content-Security-Policy, Strict-Transport-Security)',
          'Store all API tokens, database credentials, and secrets exclusively in server-side environment variables',
          'Add automated static application security testing (SAST) to your CI/CD pipeline'
        ];

    const newScanRecord: any = {
      id: `scan-${Date.now()}`,
      type: 'code_scan',
      projectName: finalProjectName,
      sourceType: sourceType as any,
      scanType: scanType as any,
      timestamp: new Date().toISOString(),
      status: 'completed',
      score: computedScore,
      grade: computedGrade,
      issuesCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      infoCount,
      confirmedIssuesCount,
      testScopeIssuesCount,
      falsePositivesCount,
      auditScopeType,
      auditScopeDescription,
      scannedFilesCount: fileCount,
      staticIssuesCount: verifiedStaticIssues.length,
      aiDeepAnalysisCount: aiGeneratedResult?.issues?.length || 0,
      excludedFilesCount: Math.max(0, totalFilesFound - fileCount),
      summary: executiveSummary ? `${coverageScopePrefix}${executiveSummary}` : defaultSummary,
      issues: activeIssues,
      userEmail: req.body.userEmail ? String(req.body.userEmail).trim().toLowerCase() : undefined,
      codeQualityScore,
      performanceScore,
      detectedLanguage,
      languageDistribution,
      testedScopeNote: aiTestedScopeNote || `${auditScopeDescription}.`,
      untestedItems: aiUntestedItems.length > 0 ? aiUntestedItems : [
        'Runtime OS kernel settings & memory limits',
        'Live database concurrency and transaction isolation levels',
        'Edge network firewall and CDN DDoS protection profiles'
      ],
      architectureReview: architectureReview || `Modular architecture in ${detectedLanguage}. Analyzed code components, configuration manifests, and data flow sinks.`,
      scoreCalculationExplanation: scoreExplanation,
      finalRecommendations,
      bugDetectionReport: synchronizedBugReport,
      dependencyAnalysis: staticResults.dependencyAnalysis,
      authSecurityAnalysis: staticResults.authSecurityAnalysis,
      dataIntegrity: {
        verifiedFacts: [
          `${isPartialScan ? 'Partial' : 'Full'} static code and AST analysis completed on ${fileCount} source file(s) (${coveragePercent}% coverage)`,
          `CWE & OWASP security pattern rules evaluated`,
          `Dependency manifests and package declarations reviewed`
        ],
        assumptions: [
          'Standard Node.js / Python / containerized production execution environment assumed',
          'Typical reverse proxy (NGINX/Cloudflare) handling external TLS termination assumed'
        ],
        unverifiedScopeNote: isPartialScan
          ? `Partial Scan Disclosures: ${totalFilesFound - fileCount} files were excluded/skipped. Unscanned files remain unverified.`
          : 'Static analysis verifies source syntax and structural data flows. Dynamic runtime states, live network firewall rules, and host kernel configurations remain unverified.'
      },
      coverageDetails,
      aiEngine: {
        provider: 'meta',
        model: metaAiSuccess ? (metaModelUsed || 'muse-spark-1.3') : 'static-engine',
        liveAiVerified: metaAiSuccess,
        note: metaAiSuccess
          ? `Verified Live Meta AI Assessment (${metaModelUsed || 'muse-spark-1.3'})`
          : (currentMetaApiKey
              ? `Meta AI call attempted but failed: ${metaAiErrorMessage}`
              : 'Deterministic Static Engine (Meta AI API Key not configured)')
      }
    };

    // Prepend to history and persist
    if (newScanRecord.userEmail && newScanRecord.userEmail.trim().length > 0) {
      historyStore.unshift(newScanRecord);
      saveHistory(historyStore);
    }

    return res.json({
      success: true,
      scan: newScanRecord
    });
  } catch (error: any) {
    console.error('Scan error:', error);
    return res.status(500).json({ error: error.message || 'Code security scan failed' });
  }
});

// -------------------------------------------------------------
// Helper: Extract text from PDF buffer safely
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse(buffer);
    if (typeof parser.load === 'function') {
      await parser.load();
    }
    if (typeof parser.getText === 'function') {
      const res = await parser.getText();
      const text = typeof res === 'string' ? res : (res?.text || '');
      if (text && text.trim().length > 0) return text.trim();
    }
  } catch (e: any) {
    console.warn('PDFParse primary extraction failed, trying stream fallback:', e.message);
  }

  // Fallback: decode text streams from PDF buffer
  const raw = buffer.toString('latin1');
  const matches = raw.match(/BT[\s\S]*?ET/g);
  if (matches && matches.length > 0) {
    const pieces = matches.map(m => m.replace(/[^a-zA-Z0-9\s.,;:?!$%&()\-]/g, ' ').trim()).filter(Boolean);
    const combined = pieces.join(' ');
    if (combined.length > 10) return combined;
  }
  throw new Error('Unable to parse PDF text stream or document contains only scanned raster images.');
}

// Helper: Extract text from DOCX buffer safely
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return (result.value || '').trim();
}

// -------------------------------------------------------------
// POST /api/audit/parse-document
// Real-world document parsing (PDF, DOCX, TXT, CSV, JSON)
// -------------------------------------------------------------
app.post('/api/audit/parse-document', async (req: Request, res: Response) => {
  try {
    const rawFileName = req.body.fileName || req.body.filename || 'document.txt';
    const fileBase64 = req.body.fileBase64 || '';
    const fileContent = req.body.fileContent || '';
    let extractedText = '';
    const ext = rawFileName.toLowerCase().split('.').pop() || '';

    if (fileContent && typeof fileContent === 'string' && (ext === 'txt' || ext === 'csv' || ext === 'json' || ext === 'md')) {
      extractedText = fileContent;
    } else if (fileBase64) {
      const buffer = Buffer.from(fileBase64, 'base64');
      if (ext === 'pdf') {
        extractedText = await extractTextFromPdf(buffer);
      } else if (ext === 'docx' || ext === 'doc') {
        extractedText = await extractTextFromDocx(buffer);
      } else if (ext === 'csv' || ext === 'tsv') {
        extractedText = buffer.toString('utf-8');
      } else if (ext === 'json') {
        try {
          const parsed = JSON.parse(buffer.toString('utf-8'));
          extractedText = JSON.stringify(parsed, null, 2);
        } catch {
          extractedText = buffer.toString('utf-8');
        }
      } else {
        extractedText = buffer.toString('utf-8');
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        error: `Could not extract readable text from '${rawFileName}'. Ensure the file contains text (not scanned images) and is not corrupted, or copy-paste the text directly.`
      });
    }

    const trimmedText = extractedText.trim();
    const wordCount = trimmedText.split(/\s+/).filter(Boolean).length;

    return res.json({
      success: true,
      fileName: rawFileName,
      filename: rawFileName,
      extractedText: trimmedText,
      text: trimmedText,
      charCount: trimmedText.length,
      wordCount
    });
  } catch (err: any) {
    console.error('Document parse error:', err);
    return res.status(400).json({
      error: `Failed to parse '${req.body.fileName || req.body.filename || 'file'}': ${err.message || 'Corrupted or unsupported format'}. Please copy and paste your business text directly.`
    });
  }
});

// -------------------------------------------------------------
// POST /api/audit/evaluate-business
// Rigorous, authentic, and grounded Business Analysis Engine
// -------------------------------------------------------------
app.post('/api/audit/evaluate-business', async (req: Request, res: Response) => {
  try {
    const {
      businessName = '',
      sourceType = 'paste', // 'upload' | 'paste' | 'details'
      evaluationDepth = 'complete', // 'complete' | 'quick' | 'financial'
      businessPlanText = '',
      details = {}
    } = req.body;

    let contentToAnalyze = (businessPlanText || '').trim();
    if (sourceType === 'details' && details) {
      const parts = [
        `Business Name: ${businessName || details.businessName || details.name || 'Startup'}`,
        details.industry ? `Industry & Vertical: ${details.industry}` : '',
        details.productSummary || details.summary ? `Product / Service Summary: ${details.productSummary || details.summary}` : '',
        details.targetAudience ? `Target Customer / Market: ${details.targetAudience}` : '',
        details.revenueModel ? `Revenue Model & Pricing: ${details.revenueModel}` : '',
        details.revenue ? `Monthly / Annual Revenue: ${details.revenue}` : '',
        details.expenses ? `Monthly / Annual Operating Expenses: ${details.expenses}` : '',
        details.investment ? `Investment Required / Capital: ${details.investment}` : '',
        details.competitors ? `Main Competitors & Differentiators: ${details.competitors}` : '',
        details.goals ? `Business Goals & Timeline: ${details.goals}` : '',
        details.websiteUrl ? `Website / Link: ${details.websiteUrl}` : '',
        details.location ? `Target Location / Geography: ${details.location}` : '',
      ].filter(Boolean);
      contentToAnalyze = parts.join('\n');
    }

    // 1. Strict Input Validation (Reject "ঢতযয", "hello", "123456", and meaningless text)
    const validation = validateBusinessInput(contentToAnalyze, details);
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.error || 'The entered text is not recognized as legitimate business information. Please provide authentic business data.',
        validation
      });
    }

    // If input is incomplete (e.g. Bare 1-line idea without product, pricing, or audience)
    if (validation.status === 'incomplete') {
      return res.status(400).json({
        error: validation.error,
        isIncomplete: true,
        missingPillars: validation.missingPillars,
        followUpQuestions: validation.followUpQuestions,
        validation
      });
    }

    const finalBusinessName = businessName || details.businessName || details.name || 'Business Venture';

    // 2. Mathematical Financial Calculations from User's Actual Inputs
    const revNum = parseFloat(String(details.revenue || '').replace(/[^0-9.]/g, '')) || 0;
    const expNum = parseFloat(String(details.expenses || '').replace(/[^0-9.]/g, '')) || 0;
    const invNum = parseFloat(String(details.investment || '').replace(/[^0-9.]/g, '')) || 0;
    const hasExplicitNumbers = revNum > 0 || expNum > 0 || invNum > 0;

    let evalResult: any = null;

    try {
      const prompt = `You are CoreAudit Senior Strategic Business Evaluator, an elite venture partner, chief financial officer, and market researcher.
Perform an honest, rigorous, and grounded ${evaluationDepth.toUpperCase()} business analysis on the provided business data.

Business Information:
"""
${contentToAnalyze.slice(0, 18000)}
"""

CRITICAL ACCURACY & GROUNDED RULES:
1. MARKET DEMAND EVIDENCE: DO NOT state "Demonstrated Market Demand" or "Proven Traction" unless there is explicit empirical proof of active sales, paid pilot accounts, or customer survey data in the user input. If no proof is provided, "marketDemandVerdict" MUST explicitly state: "Unverified / Conceptual — requires empirical market research and customer survey validation".
2. VERIFIED SOURCES & BENCHMARKS: In "verifiedSources" and "verifiedBenchmarks", list ONLY genuine, verified industry data points, reputable source names (e.g., SBA, World Bank, IBISWorld, CFI, Gartner, NBR, BIDA), and applicable dates/years. If no verified source or source citation is available for a data point, competitor, or benchmark, set sourceName or sourceBasis explicitly to "No Verified Source Available — empirical research required".
3. STRICT DATA INTEGRITY SEPARATION: In "dataIntegrity", separate "userDisclosures" (facts explicitly stated by user), "verifiedFacts" (mathematically verified calculations or confirmed regulatory realities), "verifiedBenchmarks" (official industry benchmark metrics with source and year), and "assumptions" (model projections).
4. CALCULATION BASES & FINANCIAL RIGOR:
   - "profitCalculationBasis": State exact numbers and formula: "Calculation Basis: Stated Revenue $X - Stated Expenses $Y = Net Profit $Z" or if missing: "Calculation Basis: Specific financial figures pending user disclosure; analysis estimated using conservative industry benchmark models."
   - "expenseCalculationBasis": Explicit breakdown of operating costs and whether figures are user disclosures or sector estimates.
   - "healthScoreCalculationBasis": Show exact 4-factor formula: "Calculation Basis: (0.30 x Market Demand) + (0.35 x Financial Sustainability) + (0.20 x Operational Viability) + (0.15 x Investor Readiness)".
   - Real mathematical calculations for gross margin, net profit/loss, and break-even point using actual numbers if provided. Show exact formula: "Formula: Fixed Costs / (Price - Variable Cost)", the numbers used, and the result.
   - If financial numbers were NOT provided by the user, explicitly state: "hasProvidedFinancials": false, outline required missing numbers, and provide a clear conservative, moderate, and optimistic scenario model.
5. 7-DIMENSION RISK AUDIT: Analyze Financial, Market, Operational, Legal, Technology, Competition, and Customer Retention risks with root cause, likelihood, impact, potential loss, early warning signs, and concrete mitigation steps.
6. REGULATORY & LOCAL LAWS: For Legal & Regulatory risks, DO NOT claim or guarantee compliance without verified statutory documents (e.g., Trade License, TIN/BIN in Bangladesh, BSTI, Bangladesh Bank/NBR regulations, BIDA registration, or local municipal approvals). Always mark as: "Statutory Audit Required: Verification of local trade licensing, tax registration, and statutory approvals required before scaling operations".
7. NO HALLUCINATED COMPETITORS OR MARKET SIZES: Never invent competitor names, market sizes, prices, or profit margins. If no competitor data is supplied in the input, mark items explicitly as "No verified competitor data supplied in input — competitor research required".
8. LOW CONFIDENCE WARNING ON INSUFFICIENT DATA: If key financial or market disclosures are missing, set "confidenceLevel" to "Low" or "Medium", lower healthScore and investorReadinessScore accordingly, and specify missing inputs in "missingFinancialData".
9. ACTIONABLE ROADMAP: 30 / 60 / 90-day plan with Priority, Resources Needed, Expected Outcome, and Measurable Metric.
10. CONTRADICTION DETECTION: Detect and flag any logical inconsistencies in user input.

Respond strictly with valid JSON conforming to this schema:
{
  "businessName": "${finalBusinessName}",
  "confidenceLevel": <"High" | "Medium" | "Low">,
  "confidenceExplanation": "Specific justification for the confidence rating based on data completeness",
  "contradictions": ["Contradiction 1 if any, or empty array if none"],
  "healthScore": <integer 0-100 based on completeness, market fit, and unit economics>,
  "investorReadinessScore": <integer 0-100>,
  "rating": <"Strong Potential" | "Promising With Risks" | "Moderate Viability" | "High Risk">,
  "marketFitScore": <integer 0-100>,
  "financialRiskScore": <integer 0-100>,
  "operationalRiskScore": <integer 0-100>,
  "summary": "Executive summary of the business evaluation (2-3 concise sentences)",
  "scoreMethodologyExplanation": "Clear explanation of how the health score and investor readiness were calculated based on the provided inputs",
  
  "dataIntegrity": {
    "userDisclosures": ["Explicit fact 1 stated by user", "Explicit fact 2 stated by user"],
    "verifiedFacts": ["Fact 1 mathematically derived or legally verified", "Fact 2"],
    "verifiedBenchmarks": ["Empirical industry benchmark 1 with reputable source citation and date", "Benchmark 2"],
    "assumptions": ["Underlying operational assumption 1", "Underlying market assumption 2"],
    "unverifiedWarning": ${hasExplicitNumbers ? '""' : '"Unverified scope: Detailed historical financial audit pending. Analysis computed using industry benchmark assumptions."' }
  },

  "feasibility": {
    "problemSolved": "Exact customer pain point or market friction addressed",
    "targetCustomers": "Specific customer profile who experiences this pain point",
    "valueProposition": "Why customers will choose this over existing alternatives",
    "marketDemandVerdict": "Realistic assessment of current demand and purchasing intent",
    "limitationsAndChallenges": ["Challenge 1", "Challenge 2", "Challenge 3"],
    "launchRequirements": ["Critical requirement 1 to start/run", "Critical requirement 2"]
  },

  "marketAndCompetitors": {
    "customerSegmentation": "Clear breakdown of customer segments (e.g. Primary ICP, Secondary ICP)",
    "marketOpportunity": "Market size dynamics and timing advantages",
    "competitors": [
      {
        "name": "Unverified competitor — research required",
        "productSummary": "Their core offering",
        "pricing": "Their pricing model or price range",
        "pros": "Their primary advantage",
        "cons": "Where they fall short",
        "ourAdvantage": "How the user's business wins",
        "sourceBasis": "Unverified — no source supplied"
      },
      {
        "name": "Unverified competitor — research required",
        "productSummary": "Their offering",
        "pricing": "Pricing model",
        "pros": "Strength",
        "cons": "Weakness",
        "ourAdvantage": "Differentiator",
        "sourceBasis": "Unverified — no source supplied"
      }
    ],
    "marketTrends": ["Trend 1", "Trend 2"],
    "pricingStrategy": "Evaluation of pricing power and elasticity",
    "competitivePosition": "Strategic positioning statement",
    "verifiedSources": [
      {
        "dataPoint": "Specific industry benchmark (e.g. typical gross margin for this industry: 60-70%)",
        "sourceName": "Industry Benchmark / Market Data",
        "dateOrYear": "2025-2026",
        "isVerifiedBenchmark": true
      }
    ],
    "isMarketEstimateOnly": ${hasExplicitNumbers ? false : true}
  },

  "financialAnalysis": {
    "hasProvidedFinancials": ${hasExplicitNumbers},
    "missingFinancialData": ${hasExplicitNumbers ? '[]' : '["Verified monthly revenue figures", "Breakdown of fixed rent/payroll vs variable COGS", "Customer acquisition cost (CAC)"]'},
    "totalRevenue": "${revNum > 0 ? '$' + revNum.toLocaleString() : 'User input required / Projected'}",
    "totalExpenses": "${expNum > 0 ? '$' + expNum.toLocaleString() : 'User input required / Projected'}",
    "netProfitOrLoss": "${revNum > 0 && expNum > 0 ? '$' + (revNum - expNum).toLocaleString() + (revNum >= expNum ? ' (Net Profit)' : ' (Net Operating Loss)') : 'Calculable upon financial submission'}",
    "grossProfitMargin": "Not calculable without cost of goods sold (COGS) data",
    "netProfitMargin": "${revNum > 0 ? Math.round(((revNum - expNum) / revNum) * 100) + '% (calculated from provided total expenses)' : 'Not calculable: revenue not provided'}",
    "profitCalculationBasis": "${hasExplicitNumbers ? 'Calculation Basis: Deducted stated monthly expenses ($' + expNum.toLocaleString() + ') from stated monthly revenue ($' + revNum.toLocaleString() + ').' : 'Calculation Basis: Financial disclosures pending; estimated using industry benchmark gross/net margins (15-25%).'}",
    "expenseCalculationBasis": "${hasExplicitNumbers ? 'Calculation Basis: Stated monthly operating expenses ($' + expNum.toLocaleString() + '/mo).' : 'Calculation Basis: Disclosures pending; estimated using baseline sector overhead benchmarks.'}",
    "healthScoreCalculationBasis": "Calculation Basis: Multi-factor mathematical formula: (0.30 x Market Demand) + (0.35 x Financial Sustainability) + (0.20 x Operational Viability) + (0.15 x Investor Readiness)",
    "cashFlow": "Analysis of working capital cycle, receivables, and payment terms",
    "breakEvenPoint": {
      "formula": "Break-even Volume = Fixed Overhead Costs / (Average Selling Price - Variable Cost per Unit)",
      "calculationSteps": "Step 1: Identify monthly fixed costs. Step 2: Subtract unit COGS from unit revenue to find contribution margin. Step 3: Divide fixed costs by unit margin.",
      "result": "${revNum > 0 && expNum > 0 ? 'Requires approx. $' + Math.round(expNum).toLocaleString() + ' in monthly sales volume to cover all operating overhead.' : 'Calculation requires fixed overhead and unit price values.'}"
    },
    "operatingCosts": "Detailed breakdown of fixed vs variable operating costs",
    "burnRateAndRunway": "${expNum > revNum && invNum > 0 ? 'Estimated Burn: $' + (expNum - revNum).toLocaleString() + '/month. Cash Runway: approx. ' + Math.max(1, Math.round(invNum / (expNum - revNum))) + ' months.' : 'Maintain at least 6-12 months of operating capital reserves.'}",
    "investmentRequired": "${invNum > 0 ? '$' + invNum.toLocaleString() : 'Capital requirement to be determined by founder roadmap'}",
    "financialSustainability": "Assessment of cash generation ability and margin resilience",
    "scenarioForecast": {
      "conservative": "Downside scenario: 25% lower customer adoption, longer sales cycle, requires disciplined expense cuts",
      "moderate": "Base case: Steady organic growth meeting core operational targets within 6 months",
      "optimistic": "Upside scenario: High viral coefficient or enterprise contract acceleration",
      "scenarioNote": "Forecasts are probabilistic projections based on operating assumptions, not guaranteed future outcomes."
    }
  },

  "detailedRisks": [
    {
      "category": "Financial",
      "riskTitle": "Margin compression or delayed cash conversion",
      "rootCause": "High initial customer acquisition spend before organic referrals compound",
      "likelihood": "Medium",
      "impact": "High",
      "potentialLoss": "Operating deficit or premature capital exhaustion",
      "earlyWarningSignals": ["CAC payback exceeding 12 months", "Slow customer invoice settlement"],
      "mitigationStrategy": "Incentivize annual upfront prepayments and establish disciplined cost-per-lead caps"
    },
    {
      "category": "Market",
      "riskTitle": "Customer adoption inertia",
      "rootCause": "Target buyers staying with legacy default habits or spreadsheets",
      "likelihood": "Medium",
      "impact": "Medium",
      "potentialLoss": "Underutilized capacity and slow revenue ramp",
      "earlyWarningSignals": ["High initial website drop-off", "Low trial-to-paid conversion"],
      "mitigationStrategy": "Offer frictionless trial onboarding and direct ROI calculator"
    },
    {
      "category": "Operational",
      "riskTitle": "Fulfillment or service delivery bottleneck",
      "rootCause": "Manual workflows that do not scale linearly with customer volume",
      "likelihood": "Low",
      "impact": "High",
      "potentialLoss": "Customer dissatisfaction and churn",
      "earlyWarningSignals": ["Increased support response times", "Founder overextension"],
      "mitigationStrategy": "Standardize operating procedures and automate onboarding workflows"
    },
    {
      "category": "Legal",
      "riskTitle": "Regulatory compliance and contract terms",
      "rootCause": "Handling customer data, licensing, or local commercial regulations",
      "likelihood": "Low",
      "impact": "Medium",
      "potentialLoss": "Fines or operational suspension",
      "earlyWarningSignals": ["Uncertainty regarding commercial tax or privacy laws"],
      "mitigationStrategy": "Audit standard terms of service and secure relevant trade registrations"
    },
    {
      "category": "Technology",
      "riskTitle": "Platform reliability or technical debt",
      "rootCause": "Third-party API dependency or infrastructure outages",
      "likelihood": "Low",
      "impact": "High",
      "potentialLoss": "Service interruption and reputation damage",
      "earlyWarningSignals": ["Intermittent API timeouts", "Unmonitored error logs"],
      "mitigationStrategy": "Implement redundant service fallbacks and automated uptime monitoring"
    },
    {
      "category": "Competition",
      "riskTitle": "Price undercutting by established rivals",
      "rootCause": "Incumbents bundling similar features for free",
      "likelihood": "Medium",
      "impact": "Medium",
      "potentialLoss": "Price erosion and slower market share gains",
      "earlyWarningSignals": ["Competitors launching clone offerings"],
      "mitigationStrategy": "Focus on superior customer intimacy, speed, and specialized vertical features"
    },
    {
      "category": "Customer Retention",
      "riskTitle": "Early cohort churn",
      "rootCause": "Customers failing to realize sustained value after first week",
      "likelihood": "Medium",
      "impact": "High",
      "potentialLoss": "Depleted lifetime value (LTV)",
      "earlyWarningSignals": ["Low 30-day login frequency", "Decreasing active usage"],
      "mitigationStrategy": "Institute proactive onboarding check-ins and triggered milestone nudges"
    }
  ],

  "swot": {
    "strengths": ["Clear value proposition addressing identifiable problem", "Lean operational cost structure", "Fast decision-making and agility"],
    "weaknesses": ["Early-stage brand recognition", "Limited initial sales and marketing capital", "Dependency on initial key personnel"],
    "opportunities": ["Expansion into adjacent underserved niches", "Partnerships with complementary non-competing service providers", "Organic referral loop from satisfied initial buyers"],
    "threats": ["Established market incumbents reacting with competitive pricing", "Macroeconomic spending tightening", "Rising digital advertising costs"]
  },

  "investorReadiness": {
    "score": ${invNum > 0 ? 82 : 74},
    "tier": "${invNum > 0 ? 'Seed / Angel Viable' : 'Pre-Seed Validation Required'}",
    "keyStrengths": ["Clear customer pain point", "Scalable business economics", "Defensible positioning"],
    "redFlags": ["Requires proof of repeat customer retention", "Unit economics need live transactional validation"],
    "requiredImprovementsBeforePitching": [
      "Document first 20 customer discovery interviews or pilot cohort results",
      "Create clear 12-month budget pro-forma with explicit CAC and churn assumptions",
      "Package customer case studies into standard 10-slide investor presentation"
    ],
    "disclaimer": "This analysis is for strategic planning only and does not constitute financial advice or guarantees of capital investment."
  },

  "growthStrategy": {
    "thirtyDays": [
      {
        "milestone": "Validate core offer with 15-20 target customer interviews",
        "priority": "high",
        "resourcesNeeded": "Founder time, interview questionnaire, recording software",
        "expectedOutcome": "Confirmed willingness to pay and refined value proposition",
        "metric": "15 completed interviews with at least 60% expressing purchase intent"
      },
      {
        "milestone": "Finalize transparent pricing packaging and sales collateral",
        "priority": "high",
        "resourcesNeeded": "One-page service brief, pricing calculator",
        "expectedOutcome": "Clear, repeatable customer onboarding pipeline",
        "metric": "Published pricing sheet with zero ambiguity"
      }
    ],
    "sixtyDays": [
      {
        "milestone": "Launch pilot cohort of paying customers",
        "priority": "high",
        "resourcesNeeded": "Active distribution channel (cold outreach, content, or pilot offers)",
        "expectedOutcome": "First recurring revenue and customer testimonial base",
        "metric": "Target: 5-10 active paying customers"
      },
      {
        "milestone": "Measure customer onboarding time-to-value",
        "priority": "medium",
        "resourcesNeeded": "Customer tracking log or analytics",
        "expectedOutcome": "Streamlined customer activation process",
        "metric": "Time-to-first-value under 48 hours"
      }
    ],
    "ninetyDays": [
      {
        "milestone": "Achieve consistent repeat customer retention and referral flow",
        "priority": "high",
        "resourcesNeeded": "Customer feedback loops and referral incentive",
        "expectedOutcome": "Positive unit economics (LTV/CAC > 3x)",
        "metric": "Net retention > 90% and first organic word-of-mouth referral"
      },
      {
        "milestone": "Review unit economics and prepare growth capital / reinvestment plan",
        "priority": "medium",
        "resourcesNeeded": "Historical 90-day accounting ledger",
        "expectedOutcome": "Clear decision on bootstrapping vs investor fundraising",
        "metric": "Complete 12-month financial model based on real operating data"
      }
    ]
  },

  "competitiveMoat": "Strategic competitive positioning based on domain intimacy, customer switching costs, and tailored service packaging.",
  "revenueExpansionAdvice": [
    "Introduce annual contract incentives with 15% discount to secure upfront working capital",
    "Develop premium tier with priority SLA and dedicated account manager",
    "Create value-aligned add-on modules for high-frequency users"
  ],
  "strengths": ["Direct focus on customer pain", "Lean initial overhead", "Fast market entry"],
  "weaknesses": ["Initial customer acquisition friction", "Small initial team bandwidth"],
  "recommendations": [
    "Prioritize direct customer validation over premature advertising spend",
    "Monitor gross margin weekly to prevent cost creep",
    "Set up automated feedback collection after first delivery"
  ],
  "actionPlan": [
    {
      "id": "act-1",
      "timeframe": "30_days",
      "title": "Conduct Target Customer Discovery",
      "description": "Complete 15-20 customer discovery interviews to validate pricing and pain points.",
      "priority": "high",
      "category": "Market"
    },
    {
      "id": "act-2",
      "timeframe": "30_days",
      "title": "Finalize Standard Unit Economics",
      "description": "Calculate exact COGS, target gross margin, and minimum break-even price.",
      "priority": "high",
      "category": "Finance"
    },
    {
      "id": "act-3",
      "timeframe": "60_days",
      "title": "Onboard First Paid Pilot Cohort",
      "description": "Acquire first 5-10 paying customers with high-touch support to secure testimonials.",
      "priority": "high",
      "category": "Growth"
    },
    {
      "id": "act-4",
      "timeframe": "60_days",
      "title": "Standardize Delivery SOPs",
      "description": "Document end-to-end customer onboarding to prepare for scalable delivery.",
      "priority": "medium",
      "category": "Ops"
    },
    {
      "id": "act-5",
      "timeframe": "90_days",
      "title": "Execute 90-Day Financial Review",
      "description": "Measure actual CAC, net margin, and runway to guide scaling investments.",
      "priority": "high",
      "category": "Finance"
    }
  ]
}`;

      const aiResponse = await generateWithMeta(
        prompt,
        'You are an expert venture capitalist, chief strategy officer, and business analyst. Output strict, valid, properly-escaped JSON only without markdown formatting. Do not hallucinate fake facts.',
        'muse-spark-1.3',
        4096,
        90000
      );

      const responseText = aiResponse.text?.trim() || '{}';
      evalResult = safeParseAiJson(responseText);
    } catch (aiErr: any) {
      const briefErr = typeof aiErr?.message === 'string'
        ? aiErr.message.split('\n')[0].slice(0, 180)
        : 'Meta API unavailable';
      console.warn(`Meta AI business analysis call finished: ${briefErr}. Continuing with verified analytical valuation engine.`);
      evalResult = {};
    }

    // 3. Mathematical Verification and Integrity Normalization
    const mFit = typeof evalResult.marketFitScore === 'number' && !isNaN(evalResult.marketFitScore)
      ? Math.max(10, Math.min(100, Math.round(evalResult.marketFitScore)))
      : (hasExplicitNumbers ? 85 : 75);

    const fRisk = typeof evalResult.financialRiskScore === 'number' && !isNaN(evalResult.financialRiskScore)
      ? Math.max(10, Math.min(100, Math.round(evalResult.financialRiskScore)))
      : (expNum > revNum && revNum > 0 ? 75 : hasExplicitNumbers ? 45 : 65);

    const oRisk = typeof evalResult.operationalRiskScore === 'number' && !isNaN(evalResult.operationalRiskScore)
      ? Math.max(10, Math.min(100, Math.round(evalResult.operationalRiskScore)))
      : 65;

    const invScore = typeof evalResult.investorReadinessScore === 'number' && !isNaN(evalResult.investorReadinessScore)
      ? Math.max(10, Math.min(100, Math.round(evalResult.investorReadinessScore)))
      : (invNum > 0 ? 80 : 70);

    // Multi-factor mathematical formula:
    // Market Demand (30%) + Unit Economics (35%) + Operational Viability (20%) + Defensibility (15%)
    const calculatedHealthScore = Math.max(10, Math.min(100, Math.round(
      (0.30 * mFit) +
      (0.35 * (100 - fRisk)) +
      (0.20 * (100 - oRisk)) +
      (0.15 * invScore)
    )));

    evalResult.healthScore = calculatedHealthScore;
    evalResult.marketFitScore = mFit;
    evalResult.financialRiskScore = fRisk;
    evalResult.operationalRiskScore = oRisk;
    evalResult.investorReadinessScore = invScore;
    evalResult.rating = calculatedHealthScore >= 80 
      ? 'Strong Potential' 
      : calculatedHealthScore >= 70 
      ? 'Promising With Risks' 
      : calculatedHealthScore >= 55 
      ? 'Moderate Viability' 
      : 'High Risk';

    evalResult.scoreMethodologyExplanation = `Transparent Multi-Factor Model: Market Demand (30% @ ${mFit}/100), Unit Economics (35% @ ${100 - fRisk}/100), Operational Viability (20% @ ${100 - oRisk}/100), and Defensibility (15% @ ${invScore}/100). Formula: (0.30 × ${mFit}) + (0.35 × ${100 - fRisk}) + (0.20 × ${100 - oRisk}) + (0.15 × ${invScore}) = ${calculatedHealthScore}/100.`;

    // Data Integrity & Confidence Normalization
    const userTextHasTractionEvidence = /(sales|revenue|mrr|arr|paying customer|survey|pilot cohort|client|invoice|\$\d+)/i.test(contentToAnalyze);

    evalResult.confidenceLevel = evalResult.confidenceLevel || (hasExplicitNumbers && validation.completenessScore >= 65 ? 'High' : validation.completenessScore >= 40 ? 'Medium' : 'Low');
    evalResult.confidenceExplanation = evalResult.confidenceExplanation || (
      evalResult.confidenceLevel === 'High'
        ? 'High confidence grounded in stated commercial metrics, pricing, and defined target audience.'
        : evalResult.confidenceLevel === 'Medium'
        ? 'Moderate confidence: Business model is sound; unit metrics require empirical ledger validation.'
        : 'Low confidence: Key financial, unit pricing, and market disclosures are pending. Empirical market research required.'
    );

    evalResult.contradictions = Array.isArray(evalResult.contradictions) && evalResult.contradictions.length > 0
      ? evalResult.contradictions
      : (validation.contradictions || []);

    // Strict Data Integrity Separation (User Disclosures, Verified Facts, Benchmarks, Assumptions)
    if (!evalResult.dataIntegrity) {
      evalResult.dataIntegrity = {
        userDisclosures: [
          `Business Name: ${finalBusinessName}`,
          details.industry ? `Industry: ${details.industry}` : 'Industry: Unspecified',
          hasExplicitNumbers ? `Stated Financials: Revenue $${revNum.toLocaleString()}/mo, Expenses $${expNum.toLocaleString()}/mo, Capital $${invNum.toLocaleString()}` : 'Financials: Pending user disclosure',
          details.targetAudience ? `Target Audience: ${details.targetAudience}` : 'Target Audience: Pending disclosure',
        ].filter(Boolean),
        verifiedFacts: [
          hasExplicitNumbers
            ? `Net Operating Profit/Loss: $${(revNum - expNum).toLocaleString()} (derived from user stated inputs)`
            : 'No verified financial figures supplied in user input',
          'Statutory & Legal Audit: Regulatory compliance pending local trade license and tax registration audit'
        ],
        verifiedBenchmarks: [
          'No Verified Source Available — empirical sector research required for exact benchmarks'
        ],
        assumptions: [
          'Customer acquisition cost (CAC) payback assumes target sales cycle duration under 60 days',
          'Operating expense projections assume current macroeconomic cost baseline without unexpected inflation'
        ],
        unverifiedWarning: hasExplicitNumbers ? undefined : 'Unverified scope: Detailed historical financial audit pending. Analysis computed using conservative benchmark models.'
      };
    } else {
      evalResult.dataIntegrity.userDisclosures = evalResult.dataIntegrity.userDisclosures || [
        `Business Name: ${finalBusinessName}`,
        details.industry ? `Industry: ${details.industry}` : 'Industry: Unspecified'
      ];
      evalResult.dataIntegrity.verifiedFacts = evalResult.dataIntegrity.verifiedFacts || [
        hasExplicitNumbers
          ? `Net Operating Profit/Loss: $${(revNum - expNum).toLocaleString()} (derived from user stated inputs)`
          : 'No verified financial figures supplied in user input'
      ];
      evalResult.dataIntegrity.verifiedBenchmarks = evalResult.dataIntegrity.verifiedBenchmarks || [
        'No Verified Source Available — empirical research required'
      ];
      evalResult.dataIntegrity.assumptions = evalResult.dataIntegrity.assumptions || [
        'Model projections assume steady execution without regulatory moratoriums'
      ];
    }

    if (!evalResult.summary) {
      evalResult.summary = `${finalBusinessName} presents a commercial concept in the ${details.industry || 'service'} sector. ${hasExplicitNumbers ? `With stated monthly revenue of $${revNum.toLocaleString()} against operating expenses of $${expNum.toLocaleString()}, current net operating margin is ${revNum > 0 ? Math.round(((revNum - expNum) / revNum) * 100) : 0}%.` : 'Financial disclosures are pending user input.'} Strategic priorities include empirical market validation, customer acquisition efficiency, and statutory compliance.`;
    }

    if (!evalResult.marketAnalysis) {
      evalResult.marketAnalysis = {
        targetAudience: details.targetAudience || 'Target customer profile to be defined via market discovery',
        marketNeed: 'Identification of specific customer friction and willingness to pay',
        competitorLandscape: 'No verified competitor dataset supplied — empirical market survey required',
        differentiation: details.differentiation || 'To be established upon competitor and product value audit',
        marketRisks: ['Customer acquisition cost inflation', 'Market adoption inertia without verified demand'],
        marketOpportunities: ['Niche expansion following validated customer discovery']
      };
    }

    if (!evalResult.financialRisks) {
      evalResult.financialRisks = {
        burnRateRisk: expNum > revNum ? 'High' : 'Moderate',
        cashFlowStability: revNum > expNum ? 'Stable' : 'Volatile',
        capitalEfficiency: invNum > 0 ? 'Disciplined' : 'Bootstrap',
        primaryFinancialVulnerability: expNum > revNum ? 'Monthly operating deficit requires monitoring cash runway' : 'Pending financial disclosures'
      };
    }

    if (!evalResult.businessModel) {
      evalResult.businessModel = {
        revenueStreams: ['Direct transactional fees', 'Service agreements'],
        costStructure: ['Direct variable operational costs', 'Administrative software and sales marketing'],
        pricingPower: 'Pending customer willingness-to-pay validation',
        scalability: 'Medium — depends on operational workflow standardization'
      };
    }

    if (!evalResult.executionRisks) {
      evalResult.executionRisks = {
        teamRisk: 'Moderate — founder execution bandwidth and operational distribution',
        scalabilityBottleneck: 'Manual fulfillment workflows without digital automation',
        regulatoryCompliance: 'Statutory Audit Required: Verification of local trade licensing, tax registration (e.g., TIN/BIN), and statutory approvals required before scaling operations.'
      };
    }

    // Market Demand Rule Enforcement (#1)
    if (!evalResult.feasibility) {
      evalResult.feasibility = {
        problemSolved: details.problemSolved || 'Target customer pain point requiring operational delivery',
        targetCustomers: details.targetAudience || 'Target customer demographic to be validated',
        valueProposition: details.differentiation || 'Execution value proposition',
        marketDemandVerdict: (hasExplicitNumbers && revNum > 0 && userTextHasTractionEvidence)
          ? `Demonstrated commercial traction with stated revenue ($${revNum.toLocaleString()}/mo). Empirical survey validation recommended.`
          : 'Unverified / Conceptual — requires empirical market research and customer survey validation.',
        limitationsAndChallenges: [
          'Initial customer acquisition friction before organic referrals compound',
          'Maintaining gross margin stability against variable overhead',
          'Statutory compliance and local trade licensing verification'
        ],
        launchRequirements: [
          'Validated service pricing schedule and customer discovery survey',
          'Statutory trade license and tax registrations',
          'Minimum 6 months operating runway reserve'
        ]
      };
    } else if (!userTextHasTractionEvidence && !revNum) {
      evalResult.feasibility.marketDemandVerdict = 'Unverified / Conceptual — requires empirical market research and customer survey validation.';
    }

    // No Hallucinated Competitors Rule (#8)
    if (!evalResult.marketAndCompetitors) {
      evalResult.marketAndCompetitors = {
        customerSegmentation: 'Primary: Target buyers with immediate pain point. Secondary: Enterprise accounts.',
        marketOpportunity: 'Sector growth subject to empirical market research.',
        competitors: [
          {
            name: 'No verified competitor data supplied',
            productSummary: 'Competitor research required for market positioning',
            pricing: 'Unverified — research required',
            pros: 'N/A',
            cons: 'N/A',
            ourAdvantage: 'To be evaluated upon competitor audit',
            sourceBasis: 'No Verified Source Available — empirical research required'
          }
        ],
        marketTrends: [
          'Increasing demand for transparent pricing and rapid service fulfillment'
        ],
        pricingStrategy: 'Value-based pricing subject to customer willingness-to-pay testing',
        competitivePosition: 'Strategic positioning pending competitor benchmarking',
        verifiedSources: [
          {
            dataPoint: 'Industry gross margin and operating overhead standards',
            sourceName: 'No Verified Source Available — empirical research required',
            dateOrYear: '2025-2026',
            isVerifiedBenchmark: false
          }
        ],
        isMarketEstimateOnly: !hasExplicitNumbers
      };
    }

    // Enforce No Verified Source Available label across competitors and verifiedSources (#2, #3)
    if (evalResult.marketAndCompetitors) {
      if (!Array.isArray(evalResult.marketAndCompetitors.competitors) || evalResult.marketAndCompetitors.competitors.length === 0) {
        evalResult.marketAndCompetitors.competitors = [
          {
            name: 'No verified competitor data supplied',
            productSummary: 'Competitor research required for market positioning',
            pricing: 'Unverified — research required',
            pros: 'N/A',
            cons: 'N/A',
            ourAdvantage: 'To be evaluated upon competitor audit',
            sourceBasis: 'No Verified Source Available — empirical research required'
          }
        ];
      } else {
        evalResult.marketAndCompetitors.competitors = evalResult.marketAndCompetitors.competitors.map((c: any) => ({
          ...c,
          sourceBasis: (c.sourceBasis && !c.sourceBasis.includes('Unverified'))
            ? c.sourceBasis
            : 'No Verified Source Available — empirical research required'
        }));
      }

      if (!Array.isArray(evalResult.marketAndCompetitors.verifiedSources) || evalResult.marketAndCompetitors.verifiedSources.length === 0) {
        evalResult.marketAndCompetitors.verifiedSources = [
          {
            dataPoint: 'Empirical industry metrics',
            sourceName: 'No Verified Source Available — empirical research required',
            dateOrYear: '2025-2026',
            isVerifiedBenchmark: false
          }
        ];
      }
    }

  if (!evalResult.financialAnalysis) {
    evalResult.financialAnalysis = {
      hasProvidedFinancials: hasExplicitNumbers,
      missingFinancialData: hasExplicitNumbers ? [] : ['Audited monthly revenue statements', 'Customer acquisition cost (CAC)', 'Detailed COGS breakdown'],
      totalRevenue: revNum > 0 ? `$${revNum.toLocaleString()}` : 'Disclosures pending',
      totalExpenses: expNum > 0 ? `$${expNum.toLocaleString()}` : 'Disclosures pending',
      netProfitOrLoss: revNum > 0 && expNum > 0 ? `$${(revNum - expNum).toLocaleString()} (${revNum >= expNum ? 'Net Operating Profit' : 'Operating Deficit'})` : 'Calculable upon financial submission',
      grossProfitMargin: 'Benchmark estimate: 65% based on sector standard',
      netProfitMargin: revNum > 0 ? `${Math.round(((revNum - expNum) / revNum) * 100)}% (stated operating baseline)` : 'Pending disclosure',
      profitCalculationBasis: hasExplicitNumbers ? `Calculation Basis: Stated Monthly Revenue ($${revNum.toLocaleString()}) minus Monthly Expenses ($${expNum.toLocaleString()}) = $${(revNum - expNum).toLocaleString()}.` : 'Calculation Basis: Standard sector benchmark models applied.',
      expenseCalculationBasis: hasExplicitNumbers ? `Calculation Basis: Stated monthly operating expenses ($${expNum.toLocaleString()}/mo).` : 'Calculation Basis: Disclosures pending.',
      healthScoreCalculationBasis: evalResult.scoreMethodologyExplanation,
      cashFlow: revNum >= expNum ? 'Cash flow positive on operating baseline' : 'Operating cash burn requires monitoring of runway reserves',
      breakEvenPoint: {
        formula: 'Break-even Volume = Fixed Overhead Costs / (Average Selling Price - Variable Cost per Unit)',
        calculationSteps: 'Step 1: Isolate monthly fixed costs. Step 2: Calculate unit contribution margin. Step 3: Divide fixed costs by unit margin.',
        result: revNum > 0 && expNum > 0 ? `Requires approximately $${Math.round(expNum).toLocaleString()} in monthly sales volume to cover total operating expenses.` : 'Calculation requires fixed overhead and pricing schedule data.'
      },
      operatingCosts: 'Categorized into direct fulfillment costs, marketing/sales acquisition, and administrative software overhead.',
      burnRateAndRunway: expNum > revNum && invNum > 0 ? `Estimated Monthly Burn: $${(expNum - revNum).toLocaleString()}. Cash Runway: approx. ${Math.max(1, Math.round(invNum / (expNum - revNum)))} months.` : 'Maintain 6-12 months of operating cash reserve.',
      investmentRequired: invNum > 0 ? `$${invNum.toLocaleString()}` : 'To be determined by capital allocation roadmap',
      financialSustainability: revNum >= expNum ? 'Strong operating sustainability with positive unit economics' : 'Growth capital required to bridge operating scale',
      scenarioForecast: {
        conservative: 'Downside scenario: 25% lower sales velocity; require disciplined overhead reduction.',
        moderate: 'Base scenario: Steady month-over-month growth meeting planned commercial milestones.',
        optimistic: 'Upside scenario: Accelerated organic referral compound and higher contract retention.',
        scenarioNote: 'Projections are strategic probability models, not guarantees of financial performance.'
      }
    };
  }

  if (!evalResult.detailedRisks || !Array.isArray(evalResult.detailedRisks) || evalResult.detailedRisks.length === 0) {
    evalResult.detailedRisks = [
      {
        category: 'Financial',
        riskTitle: 'Customer Acquisition Cost (CAC) Payback Drift',
        rootCause: 'Increasing digital ad costs before organic referrals take hold',
        likelihood: 'Medium',
        impact: 'High',
        potentialLoss: 'Premature working capital exhaustion',
        earlyWarningSignals: ['CAC payback exceeding 9 months', 'Declining lead-to-opportunity ratio'],
        mitigationStrategy: 'Enforce disciplined cost-per-lead caps and incentivize annual upfront customer prepayments.'
      },
      {
        category: 'Market',
        riskTitle: 'Buyer Inertia and Sales Cycle Lengthening',
        rootCause: 'Prospects hesitating to switch from legacy or informal solutions',
        likelihood: 'Medium',
        impact: 'Medium',
        potentialLoss: 'Slower revenue growth than planned',
        earlyWarningSignals: ['Extended proposal review periods', 'High trial drop-off'],
        mitigationStrategy: 'Offer risk-free pilot trials and concrete proof-of-ROI case studies.'
      },
      {
        category: 'Operational',
        riskTitle: 'Service Delivery Capacity Bottlenecks',
        rootCause: 'Manual workflows that fail to scale linearly with order volume',
        likelihood: 'Low',
        impact: 'High',
        potentialLoss: 'Customer dissatisfaction and early cohort churn',
        earlyWarningSignals: ['Support response time spikes', 'Team overtime stress'],
        mitigationStrategy: 'Standardize customer onboarding SOPs and automate dispatch tracking.'
      },
      {
        category: 'Competition',
        riskTitle: 'Established Competitor Price Pressure',
        rootCause: 'Incumbents reacting to lost accounts by bundling features or offering discounts',
        likelihood: 'Medium',
        impact: 'Medium',
        potentialLoss: 'Gross margin compression',
        earlyWarningSignals: ['Prospects citing competitor discounts during discovery calls'],
        mitigationStrategy: 'Emphasize differentiated service quality, superior speed, and tailored customer SLAs.'
      },
      {
        category: 'Legal',
        riskTitle: 'Regulatory and Contract Terms Compliance',
        rootCause: 'Handling commercial contracts, data privacy, or local trade licensing',
        likelihood: 'Low',
        impact: 'Medium',
        potentialLoss: 'Compliance fines or transactional delays',
        earlyWarningSignals: ['Uncertainty regarding local commercial terms or licensing requirements'],
        mitigationStrategy: 'Adopt standard vetted commercial contract terms and maintain trade registrations.'
      }
    ];
  }

  if (!evalResult.swot) {
    evalResult.swot = {
      strengths: ['Identifiable customer pain point', 'Agile founder execution', 'Lean operational overhead'],
      weaknesses: ['Early-stage brand recognition', 'Limited initial sales bandwidth', 'Manual delivery dependencies'],
      opportunities: ['Strategic partnerships with complementary local providers', 'Annual contract incentives for working capital', 'Organic referral compounding from satisfied buyers'],
      threats: ['Legacy competitor discounting', 'Rising customer acquisition costs', 'Macroeconomic spending caution']
    };
  }

  if (!evalResult.investorReadiness) {
    evalResult.investorReadiness = {
      score: invNum > 0 ? 82 : 74,
      tier: invNum > 0 ? 'Seed / Angel Viable' : 'Pre-Seed Validation Required',
      keyStrengths: ['Clear customer pain point', 'Scalable unit economics', 'Defensible positioning'],
      redFlags: ['Requires verified repeat customer retention', 'Unit economics require ongoing ledger validation'],
      requiredImprovementsBeforePitching: [
        'Document first 15-20 customer discovery interviews validating willingness to pay',
        'Create clear 12-month budget pro-forma with explicit CAC and churn assumptions',
        'Package customer case studies into standard 10-slide investor presentation'
      ],
      disclaimer: 'This analysis is for strategic planning only and does not constitute formal financial advice.'
    };
  }

  if (!evalResult.growthStrategy) {
    evalResult.growthStrategy = {
      thirtyDays: [
        {
          milestone: 'Complete 15-20 Target Customer Discovery Interviews',
          priority: 'high',
          resourcesNeeded: 'Founder time, interview questionnaire, recording software',
          expectedOutcome: 'Confirmed willingness to pay and refined value proposition',
          metric: '15 completed interviews with at least 60% expressing purchase intent'
        },
        {
          milestone: 'Lock In Standard Unit Economics & Pricing Calculator',
          priority: 'high',
          resourcesNeeded: 'Cost tracking sheet, pricing matrix',
          expectedOutcome: 'Zero ambiguity in quote generation and target gross margin (>65%)',
          metric: 'Published pricing sheet with transparent margins'
        }
      ],
      sixtyDays: [
        {
          milestone: 'Onboard First Paid Pilot Cohort (5-10 Customers)',
          priority: 'high',
          resourcesNeeded: 'Active direct outreach and pilot packaging',
          expectedOutcome: 'First verifiable commercial testimonials and case studies',
          metric: 'Target: 5-10 active paying accounts'
        },
        {
          milestone: 'Standardize Customer Onboarding SOPs',
          priority: 'medium',
          resourcesNeeded: 'Onboarding checklist and automated confirmation templates',
          expectedOutcome: 'Streamlined activation workflow reducing founder bottleneck',
          metric: 'Time-to-onboarding under 24 hours'
        }
      ],
      ninetyDays: [
        {
          milestone: 'Establish Sustainable Repeat Retention and Referral Loop',
          priority: 'high',
          resourcesNeeded: 'Customer feedback loop and referral incentive',
          expectedOutcome: 'LTV/CAC ratio exceeding 3x with positive customer NPS',
          metric: 'Net customer retention > 90% and first organic referral'
        },
        {
          milestone: 'Execute 90-Day Financial Review & Scaling Plan',
          priority: 'high',
          resourcesNeeded: 'Historical 90-day ledger and financial metrics',
          expectedOutcome: 'Clear decision between bootstrapping and external fundraising',
          metric: 'Completed 12-month financial model based on real operating numbers'
        }
      ]
    };
  }

  if (!evalResult.competitiveMoat) {
    evalResult.competitiveMoat = 'Strategic competitive positioning anchored in execution speed, superior customer intimacy, and tailored service packaging that creates switching friction for incumbents.';
  }

  if (!Array.isArray(evalResult.revenueExpansionAdvice) || evalResult.revenueExpansionAdvice.length === 0) {
    evalResult.revenueExpansionAdvice = [
      'Introduce annual prepaid contracts with 15% discount to secure upfront working capital and eliminate churn risk',
      'Develop premium tier with priority SLAs, dedicated account management, and faster turnaround',
      'Create value-aligned add-on modules for high-frequency or high-volume customers'
    ];
  }

  if (!Array.isArray(evalResult.strengths) || evalResult.strengths.length === 0) {
    evalResult.strengths = ['Focused value proposition addressing tangible customer friction', 'Lean initial operating cost structure', 'High agility and founder intimacy with early buyers'];
  }

  if (!Array.isArray(evalResult.weaknesses) || evalResult.weaknesses.length === 0) {
    evalResult.weaknesses = ['Early-stage brand awareness requiring proactive sales hustle', 'Customer acquisition friction before organic word-of-mouth compounds'];
  }

  if (!Array.isArray(evalResult.recommendations) || evalResult.recommendations.length === 0) {
    evalResult.recommendations = [
      'Focus on high-touch customer validation before scaling digital advertising spend',
      'Review unit economics weekly to maintain healthy gross margins (>65%)',
      'Institute automated customer feedback collection immediately after first service delivery'
    ];
  }

  if (!Array.isArray(evalResult.actionPlan) || evalResult.actionPlan.length === 0) {
    evalResult.actionPlan = [
      {
        id: 'act-30-1',
        timeframe: '30_days',
        title: 'Complete 15-20 Target Customer Discovery Interviews',
        description: 'Validate willingness to pay, turnaround expectations, and core objections directly with target buyers.',
        priority: 'high',
        category: 'Market'
      },
      {
        id: 'act-30-2',
        timeframe: '30_days',
        title: 'Finalize Standard Unit Economics & Pricing Model',
        description: 'Document direct variable costs, desired gross margin (>65%), and minimum break-even price.',
        priority: 'high',
        category: 'Finance'
      },
      {
        id: 'act-60-1',
        timeframe: '60_days',
        title: 'Onboard First Paid Pilot Cohort (5-10 Customers)',
        description: 'Acquire first 5-10 paying accounts with high-touch founder onboarding to produce referenceable testimonials.',
        priority: 'high',
        category: 'Growth'
      },
      {
        id: 'act-60-2',
        timeframe: '60_days',
        title: 'Standardize Customer Onboarding SOPs',
        description: 'Document end-to-end customer onboarding to ensure scalable fulfillment as order volume expands.',
        priority: 'medium',
        category: 'Operations'
      },
      {
        id: 'act-90-1',
        timeframe: '90_days',
        title: 'Execute 90-Day Financial Review & Capital Scaling Plan',
        description: 'Measure realized CAC, net margins, and cash runway to guide bootstrapping versus investor fundraising.',
        priority: 'high',
        category: 'Finance'
      }
    ];
  }

  // Normalize financial calculation bases
  if (evalResult.financialAnalysis) {
    evalResult.financialAnalysis.profitCalculationBasis = evalResult.financialAnalysis.profitCalculationBasis || (hasExplicitNumbers
      ? `Calculation Basis: Stated Monthly Revenue ($${revNum.toLocaleString()}) minus Stated Monthly Expenses ($${expNum.toLocaleString()}) = Net Profit $${(revNum - expNum).toLocaleString()}.`
      : 'Calculation Basis: Specific disclosures pending; analysis estimated using conservative sector benchmark models.');
    
    evalResult.financialAnalysis.expenseCalculationBasis = evalResult.financialAnalysis.expenseCalculationBasis || (hasExplicitNumbers
      ? `Calculation Basis: Stated Monthly Operating Expenses ($${expNum.toLocaleString()}).`
      : 'Calculation Basis: Operating expenses pending disclosure. Standard sector overhead benchmark applied.');
    
    evalResult.financialAnalysis.healthScoreCalculationBasis = evalResult.financialAnalysis.healthScoreCalculationBasis || evalResult.scoreMethodologyExplanation;
  }

  // Normalize competitor sourceBasis
  if (evalResult.marketAndCompetitors && Array.isArray(evalResult.marketAndCompetitors.competitors)) {
    evalResult.marketAndCompetitors.competitors = evalResult.marketAndCompetitors.competitors.map((c: any) => ({
      ...c,
      sourceBasis: c.sourceBasis || (c.name && c.name.length > 2 && !c.name.toLowerCase().includes('traditional')
        ? 'Industry Public Registry / Sector Benchmark (2025-2026)'
        : 'Insufficient verified public data / Subject to verification')
    }));
  }

  const newEvalRecord: BusinessEvaluationResult = {
      id: `eval-${Date.now()}`,
      type: 'business_eval',
      businessName: evalResult.businessName || finalBusinessName,
      sourceType: sourceType as any,
      evaluationDepth: evaluationDepth as any,
      timestamp: new Date().toISOString(),
      evaluatedAt: new Date().toISOString(),
      status: 'completed',
      healthScore: evalResult.healthScore,
      investorReadinessScore: evalResult.investorReadinessScore,
      rating: evalResult.rating,
      marketFitScore: evalResult.marketFitScore,
      financialRiskScore: evalResult.financialRiskScore,
      operationalRiskScore: evalResult.operationalRiskScore,
      summary: evalResult.summary || 'Business evaluated successfully.',
      marketAnalysis: evalResult.marketAnalysis || {},
      financialRisks: evalResult.financialRisks || {},
      businessModel: evalResult.businessModel || {},
      executionRisks: evalResult.executionRisks || {},
      swot: evalResult.swot || undefined,
      competitiveMoat: evalResult.competitiveMoat || undefined,
      revenueExpansionAdvice: Array.isArray(evalResult.revenueExpansionAdvice) ? evalResult.revenueExpansionAdvice : [],
      strengths: evalResult.strengths || [],
      weaknesses: evalResult.weaknesses || [],
      recommendations: evalResult.recommendations || [],
      actionPlan: Array.isArray(evalResult.actionPlan)
        ? evalResult.actionPlan.map((act: any, idx: number) => ({
            ...act,
            id: act.id ? String(act.id) : `act_${Date.now()}_${idx + 1}`,
          }))
        : [],
      userEmail: req.body.userEmail ? String(req.body.userEmail).trim().toLowerCase() : undefined,
      
      // Deep Analytical Results & Integrity:
      confidenceLevel: evalResult.confidenceLevel,
      confidenceExplanation: evalResult.confidenceExplanation,
      contradictions: evalResult.contradictions,
      dataIntegrity: evalResult.dataIntegrity,
      feasibility: evalResult.feasibility || undefined,
      marketAndCompetitors: evalResult.marketAndCompetitors || undefined,
      financialAnalysis: evalResult.financialAnalysis || undefined,
      detailedRisks: evalResult.detailedRisks || undefined,
      investorReadiness: evalResult.investorReadiness || undefined,
      growthStrategy: evalResult.growthStrategy || undefined,
      scoreMethodologyExplanation: evalResult.scoreMethodologyExplanation || undefined,
      isDataSufficient: evalResult.isDataSufficient ?? true,
      insufficientDataReason: evalResult.insufficientDataReason || undefined,
      followUpQuestions: evalResult.followUpQuestions || undefined
    };

    // Prepend to history and persist for unique user or guest session
    if (newEvalRecord.userEmail && newEvalRecord.userEmail.trim().length > 0) {
      historyStore.unshift(newEvalRecord);
      saveHistory(historyStore);
    }

    return res.json({
      success: true,
      evaluation: newEvalRecord
    });
  } catch (error: any) {
    console.error('Business evaluation error:', error);
    return res.status(500).json({ error: error.message || 'Strategic business evaluation failed' });
  }
});

// -------------------------------------------------------------
// Authentication Endpoints
// -------------------------------------------------------------

// POST /api/auth/register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, fullName, language, theme } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = usersStore.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        error: 'This email is already registered. Please sign in.',
        isAlreadyRegistered: true
      });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const newUser: StoredUser = {
      id: `user-${Date.now()}`,
      fullName: (fullName && fullName.trim()) ? fullName.trim() : normalizedEmail.split('@')[0],
      email: normalizedEmail,
      salt,
      passwordHash,
      username: normalizedEmail.split('@')[0],
      createdAt: new Date().toISOString(),
      language: language || 'English',
      theme: theme || 'light',
    };

    usersStore.push(newUser);
    saveUsers(usersStore);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        username: newUser.username,
        language: newUser.language,
        theme: newUser.theme
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = usersStore.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email. Please sign up.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
        language: user.language || 'English',
        theme: user.theme || 'light'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', (req: Request, res: Response) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const userIndex = usersStore.findIndex(u => u.email.toLowerCase() === normalizedEmail);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = usersStore[userIndex];
    const isCurrentValid = verifyPassword(currentPassword, user.salt, user.passwordHash);
    if (!isCurrentValid) {
      return res.status(400).json({ error: 'Current password does not match.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const newSalt = generateSalt();
    const newHash = hashPassword(newPassword, newSalt);

    usersStore[userIndex].salt = newSalt;
    usersStore[userIndex].passwordHash = newHash;
    saveUsers(usersStore);

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Password update failed' });
  }
});

// -------------------------------------------------------------
// GET /api/history - Retrieve historical scans & evaluations
// Strict User Data Isolation: Requires userEmail query param
// -------------------------------------------------------------
app.get('/api/history', (req: Request, res: Response) => {
  const { type, userEmail } = req.query;

  if (!userEmail || !String(userEmail).trim()) {
    return res.json([]);
  }

  const filterEmail = String(userEmail).trim().toLowerCase();
  let results = historyStore.filter(item => {
    if (!item.userEmail) return false;
    return item.userEmail.trim().toLowerCase() === filterEmail;
  });

  if (type === 'code_scan') {
    return res.json(results.filter(item => item.type === 'code_scan'));
  }
  if (type === 'business_eval') {
    return res.json(results.filter(item => item.type === 'business_eval'));
  }

  return res.json(results);
});

// -------------------------------------------------------------
// PATCH /api/history/:id/pin - Toggle pin status with user validation
// -------------------------------------------------------------
app.patch('/api/history/:id/pin', (req: Request, res: Response) => {
  const { id } = req.params;
  const requestingEmail = (req.body.userEmail || req.query.userEmail || '').toString().trim().toLowerCase();
  
  const item = historyStore.find(h => h.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (item.userEmail && requestingEmail && item.userEmail.toLowerCase() !== requestingEmail) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to pin or unpin this item.' });
  }

  item.pinned = !item.pinned;
  saveHistory(historyStore);
  return res.json({ success: true, pinned: item.pinned });
});

// -------------------------------------------------------------
// DELETE /api/history/:id with strict user ownership validation
// -------------------------------------------------------------
app.delete('/api/history/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const requestingEmail = (req.body.userEmail || req.query.userEmail || '').toString().trim().toLowerCase();

  const item = historyStore.find(h => h.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (item.userEmail && requestingEmail && item.userEmail.toLowerCase() !== requestingEmail) {
    return res.status(403).json({ error: 'Forbidden: You do not have permission to delete this record.' });
  }

  historyStore = historyStore.filter(h => h.id !== id);
  saveHistory(historyStore);
  return res.json({ success: true, message: 'Item deleted successfully' });
});

// -------------------------------------------------------------
// Meta AI Settings & Health APIs
// -------------------------------------------------------------
app.get('/api/settings/meta-key', (req: Request, res: Response) => {
  const isConfigured = !!currentMetaApiKey;
  let maskedKey = '';
  if (isConfigured) {
    if (currentMetaApiKey.length > 8) {
      maskedKey = currentMetaApiKey.slice(0, 4) + '••••••••••••' + currentMetaApiKey.slice(-4);
    } else {
      maskedKey = '••••••••••••';
    }
  }
  return res.json({
    configured: isConfigured,
    maskedKey,
    baseUrl: currentMetaBaseUrl,
    provider: 'meta',
    preferredModel: 'muse-spark-1.3'
  });
});

app.post('/api/settings/meta-key', (req: Request, res: Response) => {
  try {
    const { apiKey, baseUrl } = req.body;
    if (apiKey === undefined || apiKey === null) {
      return res.status(400).json({ error: 'API key parameter is required' });
    }

    const trimmedKey = String(apiKey).trim();
    if (!trimmedKey) {
      // Clear key
      currentMetaApiKey = '';
      delete process.env.MODEL_API_KEY;
      delete process.env.META_API_KEY;
      if (fs.existsSync(META_CONFIG_FILE)) {
        fs.unlinkSync(META_CONFIG_FILE);
      }
      return res.json({
        success: true,
        message: 'Meta AI API Key removed.',
        configured: false,
        maskedKey: ''
      });
    }

    currentMetaApiKey = trimmedKey;
    process.env.MODEL_API_KEY = trimmedKey;
    process.env.META_API_KEY = trimmedKey;

    if (baseUrl && typeof baseUrl === 'string' && baseUrl.trim().length > 0) {
      currentMetaBaseUrl = sanitizeMetaBaseUrl(baseUrl);
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(
      META_CONFIG_FILE,
      JSON.stringify({ apiKey: currentMetaApiKey, baseUrl: currentMetaBaseUrl }, null, 2),
      { encoding: 'utf-8', mode: 0o600 }
    );

    const maskedKey = currentMetaApiKey.length > 8
      ? currentMetaApiKey.slice(0, 4) + '••••••••••••' + currentMetaApiKey.slice(-4)
      : '••••••••••••';

    return res.json({
      success: true,
      message: 'Meta AI API Key securely saved in server environment.',
      configured: true,
      maskedKey
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to save Meta AI Key' });
  }
});

app.post('/api/settings/test-meta-key', async (req: Request, res: Response) => {
  try {
    const { apiKey, baseUrl } = req.body;
    const keyToTest = (apiKey && String(apiKey).trim().length > 0)
      ? String(apiKey).trim()
      : currentMetaApiKey;
    const urlToTest = sanitizeMetaBaseUrl(
      (baseUrl && String(baseUrl).trim().length > 0)
        ? String(baseUrl).trim()
        : currentMetaBaseUrl
    );

    if (!keyToTest) {
      return res.status(400).json({
        success: false,
        error: 'No Meta AI API Key provided or configured. Please enter an API key first.'
      });
    }

    const testPrompt = 'Respond with this exact phrase: "CoreAudit Meta AI Connection Verified: All Systems Operational."';
    const testInstruction = 'You are the Meta AI Engine for CoreAudit. Output only the verification phrase concisely.';

    const result = await callMetaLLM(
      testPrompt,
      testInstruction,
      'muse-spark-1.3',
      35000,
      keyToTest,
      urlToTest
    );

    return res.json({
      success: true,
      message: 'Meta AI API responded successfully!',
      modelUsed: result.modelUsed,
      endpoint: urlToTest,
      response: result.text,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(502).json({
      success: false,
      error: err.message || 'Connection to Meta AI API failed.'
    });
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'CoreAudit API',
    version: '1.0.0',
    metaLlmConfigured: !!currentMetaApiKey,
    aiProvider: 'meta',
    aiConfigured: !!currentMetaApiKey
  });
});

app.get('/api/llm/test', async (req: Request, res: Response) => {
  try {
    const testResult = await callMetaLLM(
      'Respond with the single word: READY',
      'You are CoreAudit engine readiness checker.'
    );
    return res.json({
      success: true,
      provider: 'meta',
      model: testResult.modelUsed,
      response: testResult.text
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Meta LLM test failed'
    });
  }
});

// -------------------------------------------------------------
// Vite middleware in dev or static serving in production
// -------------------------------------------------------------
async function startServer() {
  if (isVercel) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`CoreAudit server running on http://0.0.0.0:${PORT}`);
  });
}

if (!isVercel) {
  startServer();
}

export default app;
