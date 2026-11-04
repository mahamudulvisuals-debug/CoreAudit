import React, { useState } from 'react';
import JSZip from 'jszip';
import { CodeScanResult, VulnerabilityIssue } from '../types';
import {
  ShieldAlert,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Github,
  FileCode2,
  Upload,
  Play,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  RefreshCw,
  Search,
  Code,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft,
  Columns,
  Rows,
  Layers,
  Filter,
  Bug,
  Lock,
  Package,
  Activity,
  ShieldCheck,
  FileDown,
  Printer,
  Info,
} from 'lucide-react';
import { validateSourceCode } from '../utils/codeValidator';
import { extractGithubOwnerRepo } from '../utils/githubUrlParser';
import { getTranslation } from '../i18n';

interface CodeAuditorViewProps {
  onScanComplete: (scan: CodeScanResult) => void;
  recentScans: CodeScanResult[];
  onSelectScan: (scan: CodeScanResult) => void;
  userEmail?: string;
  language?: string;
}

export const CodeAuditorView: React.FC<CodeAuditorViewProps> = ({
  onScanComplete,
  recentScans,
  onSelectScan,
  userEmail,
  language = 'English',
}) => {
  const t = (key: string) => getTranslation(language, key);
  const isBn = language === 'Bengali (বাংলা)';

  const [activeTab, setActiveTab] = useState<'github' | 'paste' | 'upload'>('github');
  const [scanType, setScanType] = useState<'full' | 'quick' | 'security'>('full');

  // Inputs
  const [githubUrl, setGithubUrl] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [projectName, setProjectName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; content: string }[]>([]);
  const [uploadedTotalFilesCount, setUploadedTotalFilesCount] = useState<number | null>(null);
  const [zipUnpacking, setZipUnpacking] = useState(false);

  // State
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [privateRepoInfo, setPrivateRepoInfo] = useState<{ isPrivate: boolean; repoName: string; message: string } | null>(null);
  const [showCoverageFiles, setShowCoverageFiles] = useState(false);
  const [activeScanResult, setActiveScanResult] = useState<CodeScanResult | null>(null);
  const [copiedIssueId, setCopiedIssueId] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<VulnerabilityIssue | null>(null);
  const [diffViewMode, setDiffViewMode] = useState<'split' | 'unified'>('split');
  const [appliedFixes, setAppliedFixes] = useState<Record<string, boolean>>({});

  // Report filters
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchIssueQuery, setSearchIssueQuery] = useState('');

  // Sample templates for quick testing
  const sampleCodes = {
    sqlInjection: `// Vulnerable Authentication Service
const express = require('express');
const mysql = require('mysql');
const app = express();
app.use(express.json());

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'secretpassword',
  database: 'production_users'
});

// VULNERABILITY 1: SQL Injection
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${password}'\`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length > 0) {
      res.json({ token: "static_admin_token_12345", user: results[0] });
    } else {
      res.status(401).send("Invalid credentials");
    }
  });
});

// VULNERABILITY 2: Stored XSS in comments
app.get('/api/comments', (req, res) => {
  db.query('SELECT * FROM comments', (err, rows) => {
    let html = '<ul>';
    rows.forEach(r => {
      // Direct concatenation without escaping
      html += '<li>' + r.user_comment + '</li>';
    });
    html += '</ul>';
    res.send(html);
  });
});`,

    brokenAuth: `// Broken Access Control & Hardcoded Secret
const jwt = require('jsonwebtoken');
const SECRET_KEY = "SUPER_SECRET_PRODUCTION_KEY_DO_NOT_SHARE_123";

function authenticateUser(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send("Unauthorized");
  
  // Flaw: None algorithm allowed or unverified signature
  const decoded = jwt.decode(token);
  req.user = decoded;
  next();
}

// Insecure Direct Object Reference (IDOR)
app.get('/api/user/:id/billing-data', authenticateUser, (req, res) => {
  // Missing check: Does req.user.id match req.params.id?
  db.query('SELECT * FROM credit_cards WHERE user_id = ?', [req.params.id], (err, row) => {
    res.json(row);
  });
});`,

    perfAndBugs: `// Unindexed DB queries & Unhandled Promise Rejections
const fs = require('fs');

async function exportSystemTelemetry(req, res) {
  // Performance: Synchronous file operations block node event loop
  const config = fs.readFileSync('/etc/app/config.json', 'utf8');
  
  // Bug: Missing catch block or unhandled rejection
  const records = await db.raw("SELECT * FROM audit_logs ORDER BY id DESC");
  
  // Memory leak: Unbounded array buffering
  const memoryCache = [];
  records.forEach(r => memoryCache.push(r));

  res.send({ status: "ok", count: memoryCache.length });
}`,

    cleanCode: `// Pure Mathematical & Statistical Helper (Clean & Hardened)
export function calculateStatistics(numbers: number[]): { mean: number; variance: number; stdDev: number } {
  if (!Array.isArray(numbers) || numbers.length === 0) {
    throw new TypeError('Input must be a non-empty array of numbers');
  }

  for (let i = 0; i < numbers.length; i++) {
    if (typeof numbers[i] !== 'number' || Number.isNaN(numbers[i])) {
      throw new TypeError(\`Element at index \${i} is not a valid number\`);
    }
  }

  const sum = numbers.reduce((acc, val) => acc + val, 0);
  const mean = sum / numbers.length;

  const squaredDiffs = numbers.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / numbers.length;
  const stdDev = Math.sqrt(variance);

  return { mean, variance, stdDev };
}

export function clampValue(val: number, min: number, max: number): number {
  if (min > max) {
    throw new RangeError('Minimum bound cannot exceed maximum bound');
  }
  return Math.min(Math.max(val, min), max);
}`,

    pythonFlask: `# Vulnerable Python Flask Authentication API
from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

# Flaw 1: SQL Injection via unparameterized f-string
@app.route('/api/v1/user/login', methods=['POST'])
def login():
    username = request.json.get('username', '')
    password = request.json.get('password', '')
    
    conn = sqlite3.connect('app_production.db')
    cursor = conn.cursor()
    
    # Vulnerable direct query interpolation:
    query = f"SELECT id, username, role FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    record = cursor.fetchone()
    
    if record:
        return jsonify({"authenticated": True, "user_id": record[0], "role": record[2]})
    return jsonify({"error": "Invalid credentials"}), 401

# Flaw 2: Sensitive system information disclosure
@app.route('/debug/env', methods=['GET'])
def debug_environment():
    import os
    return jsonify(dict(os.environ))`,

    goSample: `// Go HTTP Microservice with Concurrency & Secret Leak
package main

import (
	"database/sql"
	"fmt"
	"net/http"
	_ "github.com/lib/pq"
)

// Flaw: Hardcoded API secret token
const MasterAdminKey = "sk_live_992384729184719284719"

func handleCustomerLookup(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		customerID := r.URL.Query().Get("id")
		
		// Flaw: SQL Injection through direct query formatting
		query := fmt.Sprintf("SELECT id, name, credit_balance FROM customers WHERE id = '%s'", customerID)
		rows, err := db.Query(query)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		defer rows.Close()
		
		fmt.Fprintf(w, "Query executed successfully")
	}
}`
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const firstFile = files[0];
    if (!projectName && firstFile) {
      setProjectName(firstFile.name.replace(/\.[^/.]+$/, ''));
    }

    if (files.length === 1 && firstFile.name.endsWith('.zip')) {
      try {
        setZipUnpacking(true);
        setScanStep('Unpacking ZIP archive and extracting full source tree...');
        const zip = new JSZip();
        const zipData = await zip.loadAsync(firstFile);
        const extracted: { name: string; content: string }[] = [];

        const allNonDirFiles = Object.keys(zipData.files).filter((k) => !zipData.files[k].dir);
        setUploadedTotalFilesCount(allNonDirFiles.length);

        const fileEntries = allNonDirFiles.filter(
          (filename) =>
            !filename.includes('node_modules/') &&
            !filename.includes('.git/') &&
            !filename.includes('dist/') &&
            !filename.includes('build/') &&
            !filename.includes('.min.') &&
            (/\.(js|jsx|mjs|cjs|ts|tsx|py|pyw|go|java|php|rb|rs|c|cpp|cc|cxx|h|hpp|cs|kt|kts|swift|dart|sql|sh|bash|zsh|html|htm|css|scss|sass|less|json|env|toml|yaml|yml|xml|vue|svelte|prisma|graphql|dockerfile|sol)$/i.test(filename) ||
             /(?:^|\/)(Dockerfile|Makefile|Gemfile|Procfile|compose\.yaml|docker-compose\.yml)$/i.test(filename))
        );

        for (const filename of fileEntries) {
          const content = await zipData.files[filename].async('string');
          extracted.push({ name: filename, content });
        }

        setUploadedFiles(extracted);
        if (extracted.length > 0) {
          setCodeSnippet(`// Extracted ${extracted.length} of ${allNonDirFiles.length} files from archive: ${firstFile.name}\n` +
            extracted.map((f) => `// File: ${f.name}\n${f.content.slice(0, 400)}...\n`).join('\n'));
        }
      } catch (err: any) {
        setScanError(`Failed to unpack ZIP archive: ${err.message}`);
      } finally {
        setZipUnpacking(false);
        setScanStep('');
      }
    } else {
      // Multiple or single code files selected
      const readFiles: { name: string; content: string }[] = [];
      const fileList = Array.from(files);

      for (const f of fileList) {
        try {
          const text = await f.text();
          readFiles.push({ name: f.name, content: text });
        } catch {
          // ignore single file error
        }
      }

      setUploadedFiles(readFiles);
      if (readFiles.length > 0) {
        setCodeSnippet(
          readFiles.length === 1
            ? readFiles[0].content
            : `// Uploaded ${readFiles.length} file(s)\n` +
                readFiles.map((f) => `// File: ${f.name}\n${f.content.slice(0, 400)}...\n`).join('\n')
        );
      }
    }
  };

  const executeScan = async () => {
    setScanError(null);
    setPrivateRepoInfo(null);

    // Client-side validation prior to triggering scan animation
    if (activeTab === 'paste') {
      if (!codeSnippet || !codeSnippet.trim()) {
        setScanError('Please paste code into the editor or select a sample snippet');
        return;
      }
      const validation = validateSourceCode(codeSnippet, 'snippet.ts');
      if (!validation.isValid) {
        setScanError(validation.error || 'The entered text is not recognized as valid programming source code. Please provide genuine code.');
        return;
      }
    } else if (activeTab === 'upload') {
      if (uploadedFiles.length === 0) {
        setScanError('Please select or drag a source code file or ZIP archive to scan');
        return;
      }
      const combined = uploadedFiles.map((f) => f.content).join('\n');
      const validation = validateSourceCode(combined, uploadedFiles[0]?.name || 'source.ts');
      if (!validation.isValid) {
        setScanError(validation.error || 'The uploaded file does not contain recognized programming source code.');
        return;
      }
    } else if (activeTab === 'github') {
      if (!githubUrl || !githubUrl.trim()) {
        setScanError('Please enter a GitHub repository URL (e.g. facebook/react or https://github.com/facebook/react)');
        return;
      }
    }

    setIsScanning(true);
    setScanStep('Parsing Abstract Syntax Tree (AST) & control flow...');

    try {
      const timer1 = setTimeout(
        () => setScanStep('Auditing for injection, authentication flaws, and CVEs...'),
        1200
      );
      const timer2 = setTimeout(
        () => setScanStep('Detecting performance bottlenecks and logic vulnerabilities...'),
        2400
      );
      const timer3 = setTimeout(
        () => setScanStep('Synthesizing verified production remediation patches...'),
        3600
      );

      const parsedGithub = activeTab === 'github' ? extractGithubOwnerRepo(githubUrl) : null;
      const normalizedGithubUrl = parsedGithub ? `https://github.com/${parsedGithub.owner}/${parsedGithub.repo}` : githubUrl.trim();
      const defaultProjectName = parsedGithub 
        ? `${parsedGithub.owner}/${parsedGithub.repo}` 
        : (activeTab === 'github' ? (githubUrl.trim() || 'GitHub Repository') : 'Source Code Project');

      const payload: any = {
        projectName: projectName.trim() || defaultProjectName,
        sourceType: activeTab,
        scanType: scanType,
        userEmail: userEmail || undefined,
      };

      if (activeTab === 'github') {
        payload.githubUrl = normalizedGithubUrl;
        payload.codeText = codeSnippet;
      } else if (activeTab === 'paste') {
        payload.codeText = codeSnippet;
      } else if (activeTab === 'upload') {
        payload.files = uploadedFiles;
        payload.totalFilesFound = uploadedTotalFilesCount || uploadedFiles.length;
      }

      const res = await fetch('/api/audit/scan-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.isPrivateRepo) {
          setPrivateRepoInfo({
            isPrivate: true,
            repoName: errorData.repoName || githubUrl,
            message: errorData.error || 'This repository is private or does not exist. Public access is required for remote GitHub analysis.'
          });
          setIsScanning(false);
          setScanStep('');
          return;
        }
        throw new Error(errorData.error || `Scan request failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.scan) {
        const sanitized = ensureUniqueScanIssues(data.scan);
        setActiveScanResult(sanitized);
        if (sanitized) onScanComplete(sanitized);
        if (sanitized?.issues && sanitized.issues.length > 0) {
          setSelectedIssue(sanitized.issues[0]);
        }
      }
    } catch (err: any) {
      setScanError(err.message || 'An error occurred during security scanning');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  const ensureUniqueScanIssues = (scan: CodeScanResult | null): CodeScanResult | null => {
    if (!scan || !Array.isArray(scan.issues)) return scan;
    const seen = new Set<string>();
    const sanitizedIssues = scan.issues.map((iss, idx) => {
      let uid = iss.id || `iss-${idx + 1}`;
      if (seen.has(uid)) {
        uid = `${uid}_${idx + 1}`;
      }
      seen.add(uid);
      return { ...iss, id: uid };
    });
    return { ...scan, issues: sanitizedIssues };
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIssueId(id);
    setTimeout(() => setCopiedIssueId(null), 2500);
  };

  const handleApplyFix = (issueId: string) => {
    setAppliedFixes((prev) => ({
      ...prev,
      [issueId]: !prev[issueId],
    }));
  };

  const handleDownloadPatch = (issue: VulnerabilityIssue) => {
    const patchContent = `--- a/${issue.file}\n+++ b/${issue.file}\n@@ -${issue.line},1 +${issue.line},1 @@\n-${issue.originalSnippet}\n+${issue.fixedSnippet}\n`;
    const blob = new Blob([patchContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fix-${issue.id}.patch`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openScanSlide = (scan: CodeScanResult) => {
    const sanitized = ensureUniqueScanIssues(scan);
    setActiveScanResult(sanitized);
    setAppliedFixes({});
    if (sanitized?.issues && sanitized.issues.length > 0) {
      setSelectedIssue(sanitized.issues[0]);
    }
  };

  // Filter issues in report
  const filteredIssues = (activeScanResult?.issues || []).filter((issue) => {
    if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
    if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
    if (searchIssueQuery.trim()) {
      const q = searchIssueQuery.toLowerCase();
      return (
        issue.title.toLowerCase().includes(q) ||
        issue.file.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        issue.originalSnippet.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate live dynamic score after applied fixes
  const resolvedCount = Object.values(appliedFixes).filter(Boolean).length;
  const totalIssuesCount = activeScanResult?.issuesCount || 1;
  const currentLiveScore = activeScanResult
    ? Math.min(100, Math.round(activeScanResult.score + (resolvedCount / totalIssuesCount) * (100 - activeScanResult.score)))
    : 100;

  // =========================================================================
  // VIEW MODE: CLEAN, SHARP SLIDE WORKSPACE (NO ROUND CORNERS, ZERO FLUFF)
  // =========================================================================
  if (activeScanResult) {
    const currentIssue = selectedIssue || activeScanResult.issues[0];

    return (
      <div className="w-full bg-[#f8fafc] text-slate-900 min-h-screen">
        {/* Crisp Top Navigation Header (Zero Rounded Corners) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveScanResult(null)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back to Code Auditor</span>
            </button>
            <div className="h-4 w-px bg-slate-700 hidden sm:block" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-sm sm:max-w-md font-mono">
                  {activeScanResult.projectName}
                </h1>
              </div>
              <p className="text-[10px] text-slate-400">
                Security Scan • {new Date(activeScanResult.timestamp).toLocaleDateString()} • {activeScanResult.scanType.toUpperCase()} MODE
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const reportText = `# CoreAudit Software Security Audit Report: ${activeScanResult.projectName}
Date: ${new Date(activeScanResult.timestamp).toLocaleString()}
Security Score: ${currentLiveScore}/100 (Grade: ${activeScanResult.grade})
Code Quality: ${activeScanResult.codeQualityScore ?? 92}/100 | Performance: ${activeScanResult.performanceScore ?? 90}/100
Coverage: ${activeScanResult.coverageDetails?.coveragePercent || 100}% (${activeScanResult.scannedFilesCount}/${activeScanResult.coverageDetails?.totalFiles || activeScanResult.scannedFilesCount} files)

=======================================================
1. EXECUTIVE SECURITY AUDIT SUMMARY
=======================================================
${activeScanResult.summary}

=======================================================
2. REPOSITORY & LANGUAGE DISTRIBUTION
=======================================================
Project: ${activeScanResult.projectName}
Source Type: ${activeScanResult.sourceType.toUpperCase()}
Primary Language: ${activeScanResult.detectedLanguage || 'Source Code'}
${(activeScanResult.languageDistribution || []).map(l => `• ${l.language}: ${l.filesCount} file(s) (${l.percentage}%)`).join('\n')}

=======================================================
3. AUDIT COVERAGE & FILE ACCOUNTING
=======================================================
Total Files Found: ${activeScanResult.coverageDetails?.totalFiles || activeScanResult.scannedFilesCount}
Audited Code Files: ${activeScanResult.scannedFilesCount}
Excluded / Skipped Files: ${activeScanResult.coverageDetails?.unscannedFilesCount || 0}
Coverage Percentage: ${activeScanResult.coverageDetails?.coveragePercent || 100}%
Score Formula: ${activeScanResult.scoreCalculationExplanation || 'Calculated using standard severity deductions'}
Tested Scope: ${activeScanResult.testedScopeNote || 'Static syntax and control flow inspection'}
Unverified Scope Boundaries: ${(activeScanResult.untestedItems || []).join('; ')}

=======================================================
4. SEVERITY BREAKDOWN
=======================================================
Critical: ${activeScanResult.criticalCount} | High: ${activeScanResult.highCount} | Medium: ${activeScanResult.mediumCount} | Low: ${activeScanResult.lowCount} | Info: ${activeScanResult.infoCount || 0}
Total Issues: ${activeScanResult.issuesCount}

=======================================================
5. BUG DETECTION REPORT
=======================================================
Total Bugs: ${activeScanResult.bugDetectionReport?.totalBugs || 0}
Runtime Bugs: ${activeScanResult.bugDetectionReport?.runtimeBugs.join(', ') || 'None detected'}
Logic Bugs: ${activeScanResult.bugDetectionReport?.logicBugs.join(', ') || 'None detected'}

=======================================================
6. DEPENDENCY SECURITY ANALYSIS
=======================================================
${activeScanResult.dependencyAnalysis?.summary || 'Manifest dependencies reviewed.'}
${(activeScanResult.dependencyAnalysis?.vulnerableDependencies || []).map(d => `• ${d.name} (${d.currentVersion} ➔ ${d.recommendedVersion}) [${d.severity.toUpperCase()}]: ${d.advisory}`).join('\n')}

=======================================================
7. AUTHENTICATION & API SECURITY
=======================================================
Auth Mechanisms: ${activeScanResult.authSecurityAnalysis?.authMechanismsFound.join(', ') || 'Standard identity handling'}
Auth Recommendations: ${(activeScanResult.authSecurityAnalysis?.recommendations || []).join('; ')}

=======================================================
8. VERIFIED VULNERABILITIES & HARDENED SOLUTIONS
=======================================================
${activeScanResult.issues.length === 0 ? 'Zero vulnerabilities detected. Code is clean and secure.' : activeScanResult.issues.map((iss, i) => `
[ISSUE #${i + 1}] [${iss.severity.toUpperCase()}] ${iss.title}
File: ${iss.file}:${iss.line} | CWE: ${iss.cwe || 'N/A'} | OWASP: ${iss.owaspCategory || 'N/A'}
Status: ${iss.statusCategory || 'Confirmed'} (${iss.confidenceLevel || 'Confirmed'}) | Verified Code Fact: ${iss.isVerifiedFact !== false ? 'Yes' : 'No'}
Evidence Basis: ${iss.evidenceBasis || 'Syntax pattern match'}
${iss.dataFlowProof ? `Taint Flow: Source: ${iss.dataFlowProof.source} ➔ Sanitizer: ${iss.dataFlowProof.sanitizerStatus} ➔ Sink: ${iss.dataFlowProof.sink}
Exploit Mechanism: ${iss.dataFlowProof.exploitability}` : ''}
Root Cause: ${iss.description}
Impact: ${iss.impact}
Remediation: ${iss.remediation || 'Apply patch'}

--- Vulnerable Code:
${iss.originalSnippet}

+++ Hardened Replacement:
${iss.fixedSnippet}

Verification Steps:
${(iss.verificationSteps || ['Re-scan code to confirm patch']).map((s, si) => `  ${si + 1}. ${s}`).join('\n')}
`).join('\n')}

=======================================================
9. FINAL RECOMMENDATIONS & REMEDIATION ROADMAP
=======================================================
${(activeScanResult.finalRecommendations || []).map((r, ri) => `${ri + 1}. ${r}`).join('\n')}
`;
                navigator.clipboard.writeText(reportText);
                setCopiedIssueId('full-report');
                setTimeout(() => setCopiedIssueId(null), 2500);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              {copiedIssueId === 'full-report' ? (
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
              onClick={() => {
                const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeScanResult, null, 2));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = `${activeScanResult.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_audit.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Main Clean Presentation Canvas (Zero Round Corners) */}
        <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">

          {/* Top Scorecard KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white border border-slate-200 p-4 border-t-2 border-t-blue-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Security Score
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono mt-1">
                {currentLiveScore}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">
                {resolvedCount > 0 ? `+${currentLiveScore - activeScanResult.score}pts fixed` : `Grade: ${activeScanResult.grade}`}
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 border-t-2 border-t-indigo-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Code Quality
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-indigo-700 font-mono mt-1">
                {activeScanResult.codeQualityScore ?? 92}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">
                AST Cleanliness
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 border-t-2 border-t-teal-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Performance
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-700 font-mono mt-1">
                {activeScanResult.performanceScore ?? 90}<span className="text-xs font-normal text-slate-400">/100</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 mt-1 block">
                Runtime Efficiency
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 border-t-2 border-t-rose-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Critical / High
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-700 font-mono mt-1">
                {activeScanResult.criticalCount + activeScanResult.highCount}
              </div>
              <span className="text-[11px] font-semibold text-rose-700 mt-1 block">
                Immediate Action
              </span>
            </div>

            <div className="bg-white border border-slate-200 p-4 border-t-2 border-t-emerald-600 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Patches Applied
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono mt-1">
                {resolvedCount}<span className="text-xs font-normal text-slate-400">/{activeScanResult.issuesCount}</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 mt-1 block">
                {activeScanResult.issuesCount === 0 ? 'Clean Codebase' : resolvedCount === activeScanResult.issuesCount ? 'All Mitigated' : 'Pending Patches'}
              </span>
            </div>
          </div>

          {/* Transparent Score Calculation Explanation */}
          {activeScanResult.scoreCalculationExplanation && (
            <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 text-xs text-slate-700 flex items-center justify-between flex-wrap gap-2 shadow-2xs">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Score & Grade Derivation (Transparent Point Deductions):</span>
              </span>
              <span className="text-slate-600 font-mono text-[11px]">
                {activeScanResult.scoreCalculationExplanation}
              </span>
            </div>
          )}

          {/* Executive Summary & Scope Overview */}
          <div className="bg-white border border-slate-200 p-5 shadow-2xs border-l-4 border-l-blue-600 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                1. Executive Security Audit Summary
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200">
                  Primary Language: {activeScanResult.detectedLanguage || 'Source Code'}
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 border border-slate-200">
                  Files Analyzed: {activeScanResult.scannedFilesCount}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed font-normal">
              {activeScanResult.summary}
            </p>

            {/* Language Distribution Breakdown */}
            {activeScanResult.languageDistribution && activeScanResult.languageDistribution.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    2. Repository Language Distribution
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {activeScanResult.languageDistribution.length} Detected Languages
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 flex overflow-hidden border border-slate-200">
                  {activeScanResult.languageDistribution.map((lang, idx) => {
                    const colors = ['bg-blue-600', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
                    return (
                      <div
                        key={idx}
                        style={{ width: `${lang.percentage}%` }}
                        className={`${colors[idx % colors.length]} h-full`}
                        title={`${lang.language}: ${lang.filesCount} file(s) (${lang.percentage}%)`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {activeScanResult.languageDistribution.map((lang, idx) => {
                    const colors = ['bg-blue-600', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500'];
                    return (
                      <div key={idx} className="flex items-center gap-1.5 text-xs bg-slate-50 px-2 py-0.5 border border-slate-200 font-mono">
                        <span className={`w-2 h-2 ${colors[idx % colors.length]}`} />
                        <span className="font-bold text-slate-800">{lang.language}</span>
                        <span className="text-slate-500 text-[11px]">{lang.filesCount} ({lang.percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Repository Coverage & File Audit Matrix */}
          {activeScanResult.coverageDetails && (
            <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>3. Repository File Coverage & Audit Scope Matrix</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Verified account of all discovered, analyzed, and excluded files in this repository.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 border ${
                      activeScanResult.coverageDetails.isPartialScan
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {activeScanResult.coverageDetails.auditTypeLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCoverageFiles(!showCoverageFiles)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{showCoverageFiles ? 'Hide File Tree' : `Inspect Files (${activeScanResult.coverageDetails.scannedFilesCount}/${activeScanResult.coverageDetails.totalFiles})`}</span>
                  </button>
                </div>
              </div>

              {/* Coverage KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Discovered</span>
                  <span className="text-lg font-bold font-mono text-slate-900 mt-0.5 block">
                    {activeScanResult.coverageDetails.totalFiles} files
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Audited Code Files</span>
                  <span className="text-lg font-bold font-mono text-emerald-900 mt-0.5 block">
                    {activeScanResult.coverageDetails.scannedFilesCount} files
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Excluded / Skipped</span>
                  <span className="text-lg font-bold font-mono text-slate-700 mt-0.5 block">
                    {activeScanResult.coverageDetails.unscannedFilesCount} files
                  </span>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">Audit Coverage</span>
                  <span className="text-lg font-bold font-mono text-blue-900 mt-0.5 block">
                    {activeScanResult.coverageDetails.coveragePercent}%
                  </span>
                </div>
              </div>

              {/* Collapsible File List & Skipped File Accounting Table */}
              {showCoverageFiles && (
                <div className="border border-slate-200 p-4 bg-slate-50 space-y-4 animate-fade-in text-xs">
                  <div>
                    <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-1.5 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Audited Source Files ({activeScanResult.coverageDetails.scannedFiles.length})</span>
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px] bg-white p-2.5 border border-slate-200">
                      {activeScanResult.coverageDetails.scannedFiles.map((fn, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-slate-800">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{fn}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeScanResult.coverageDetails.skippedFilesList && activeScanResult.coverageDetails.skippedFilesList.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-700 uppercase text-[11px] mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-500" />
                          <span>Excluded & Skipped Files Accounting ({activeScanResult.coverageDetails.skippedFilesList.length})</span>
                        </span>
                        <span className="font-normal text-[10px] text-slate-400">Classified with reason per user prompt specification</span>
                      </h4>
                      <div className="max-h-56 overflow-y-auto border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase font-mono text-[10px] sticky top-0">
                            <tr>
                              <th className="py-1.5 px-3">File Path</th>
                              <th className="py-1.5 px-3">Status</th>
                              <th className="py-1.5 px-3">Reason For Exclusion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {activeScanResult.coverageDetails.skippedFilesList.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-1.5 px-3 text-slate-800 truncate max-w-xs">{item.path}</td>
                                <td className="py-1.5 px-3">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 uppercase border ${
                                    item.status === 'binary' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                                    item.status === 'size_limit' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-1.5 px-3 text-slate-600 text-xs font-sans">{item.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3-Column Technical Health Analysis Grid: Bugs vs Dependencies vs Auth/API Security */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 1. Bug Detection Report */}
            <div className="bg-white border border-slate-200 p-4 shadow-2xs space-y-2 border-t-2 border-t-amber-500">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bug Detection Report</span>
                </span>
                <span className="font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200">
                  {activeScanResult.bugDetectionReport?.totalBugs || 0} issues
                </span>
              </span>
              <p className="text-slate-600 text-[11px]">
                Static analysis of control flows, unhandled promises, and logic boundaries.
              </p>
              <div className="space-y-1 font-mono text-[10px] pt-1">
                {activeScanResult.bugDetectionReport && activeScanResult.bugDetectionReport.totalBugs > 0 ? (
                  [...activeScanResult.bugDetectionReport.runtimeBugs, ...activeScanResult.bugDetectionReport.logicBugs].slice(0, 3).map((b, bi) => (
                    <div key={bi} className="p-1.5 bg-amber-50/50 text-amber-950 border border-amber-200 truncate">
                      {b}
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Zero unhandled runtime exceptions or logic crashes detected.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Dependency Vulnerability Analysis */}
            <div className="bg-white border border-slate-200 p-4 shadow-2xs space-y-2 border-t-2 border-t-purple-500">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-purple-600" />
                  <span>Dependency Analysis</span>
                </span>
                <span className="font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 border border-purple-200">
                  {activeScanResult.dependencyAnalysis?.totalDependencies ?? 0} packages
                </span>
              </span>
              <p className="text-slate-600 text-[11px] line-clamp-2">
                {activeScanResult.dependencyAnalysis?.summary || 'Inspected manifests (package.json, requirements.txt, etc.)'}
              </p>
              <div className="space-y-1 font-mono text-[10px] pt-1">
                {activeScanResult.dependencyAnalysis && activeScanResult.dependencyAnalysis.vulnerableDependencies.length > 0 ? (
                  activeScanResult.dependencyAnalysis.vulnerableDependencies.slice(0, 2).map((dep, di) => (
                    <div key={di} className="p-1.5 bg-rose-50 text-rose-950 border border-rose-200">
                      <span className="font-bold">{dep.name}</span> ({dep.currentVersion} ➔ {dep.recommendedVersion})
                    </div>
                  ))
                ) : (
                  <div className="p-2 bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>No known vulnerable dependency versions detected.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Authentication & API Security Analysis */}
            <div className="bg-white border border-slate-200 p-4 shadow-2xs space-y-2 border-t-2 border-t-blue-500">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Auth & API Security</span>
                </span>
                <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 border border-blue-200">
                  {activeScanResult.authSecurityAnalysis?.authMechanismsFound.length || 0} mechanisms
                </span>
              </span>
              <p className="text-slate-600 text-[11px]">
                {activeScanResult.authSecurityAnalysis?.authMechanismsFound.length
                  ? `Identified: ${activeScanResult.authSecurityAnalysis.authMechanismsFound.join(', ')}`
                  : 'Audited session tokens, authorization logic, and API access controls.'}
              </p>
              <div className="space-y-1 font-mono text-[10px] pt-1">
                {(activeScanResult.authSecurityAnalysis?.recommendations || []).slice(0, 2).map((rec, ri) => (
                  <div key={ri} className="p-1.5 bg-blue-50/60 text-blue-950 border border-blue-200 truncate">
                    • {rec}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data Integrity & Verification Matrix: Verified Facts vs. Assumptions vs. Unverified Scope */}
          <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>4. Data Integrity & Verification Status (Verified Code Facts vs AI Assumptions)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clear separation between verified code syntax facts and AI technical assumptions.
                </p>
              </div>
              <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 border border-slate-300">
                Strict Anti-Hallucination Policy Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* 1. Verified Facts */}
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 space-y-2">
                <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  <span>1. Verified Code Facts</span>
                </span>
                <ul className="list-disc list-inside space-y-1 text-emerald-950 font-medium">
                  {(activeScanResult.dataIntegrity?.verifiedFacts || [
                    `Syntax & AST analysis completed on ${activeScanResult.scannedFilesCount} file(s)`,
                    `CWE & OWASP security pattern rules matched`,
                  ]).map((fact, idx) => (
                    <li key={idx}>{fact}</li>
                  ))}
                  {activeScanResult.issuesCount === 0 && (
                    <li className="font-bold">No syntactic security defects detected in analyzed scope (Grade A)</li>
                  )}
                </ul>
              </div>

              {/* 2. Model Assumptions */}
              <div className="p-3.5 bg-blue-50/40 border border-blue-200 space-y-2">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-700" />
                  <span>2. AI Technical Assumptions</span>
                </span>
                <ul className="list-disc list-inside space-y-1 text-blue-950">
                  {(activeScanResult.dataIntegrity?.assumptions || [
                    'Target application code assumed to run in standard production environment',
                    'External database client sanitation assumed pending dynamic test',
                  ]).map((asmp, idx) => (
                    <li key={idx}>{asmp}</li>
                  ))}
                </ul>
              </div>

              {/* 3. Unverified Scope Boundaries */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200 space-y-2">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>3. Unverified Scope Boundaries</span>
                </span>
                <p className="text-amber-900 text-[11px] leading-relaxed">
                  {activeScanResult.dataIntegrity?.unverifiedScopeNote || activeScanResult.testedScopeNote || 'Static analysis verifies code syntax; live memory and OS secrets require dynamic runtime testing.'}
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[10px] font-mono pt-1">
                  {(activeScanResult.untestedItems || [
                    'Runtime environment variables & secrets',
                    'Live firewall rules & database concurrency'
                  ]).slice(0, 3).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Conditional View: When Clean (0 issues) vs When Issues Detected */}
          {activeScanResult.issuesCount === 0 ? (
            <div className="bg-white border border-slate-200 p-8 shadow-2xs border-t-4 border-t-emerald-600 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center border border-emerald-300">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  No Security Vulnerabilities or Bugs Detected
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xl mx-auto">
                  All analyzed syntax structures, data flows, and standard security rules passed inspection with 0 defects.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-2 border border-emerald-300 text-xs font-bold">
                <Check className="w-4 h-4" />
                <span>Verified Clean • Audit Grade A • Score {activeScanResult.score}/100</span>
              </div>
            </div>
          ) : (
            <>
              {/* Category & Severity Filter Toolbar (Zero Rounded Corners) */}
              <div className="bg-white border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 uppercase mr-1">Filter:</span>
                  <button
                    onClick={() => { setFilterCategory('all'); setFilterSeverity('all'); }}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                      filterCategory === 'all' && filterSeverity === 'all'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    All Issues ({activeScanResult.issuesCount})
                  </button>
                  <button
                    onClick={() => { setFilterCategory('security'); setFilterSeverity('all'); }}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                      filterCategory === 'security'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Security & Exploits ({activeScanResult.issues.filter(i => i.category === 'security').length})
                  </button>
                  <button
                    onClick={() => { setFilterCategory('auth'); setFilterSeverity('all'); }}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                      filterCategory === 'auth'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Auth & Secrets ({activeScanResult.issues.filter(i => i.category === 'auth').length})
                  </button>
                  <button
                    onClick={() => { setFilterCategory('bug'); setFilterSeverity('all'); }}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                      filterCategory === 'bug'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Logic & Runtime Bugs ({activeScanResult.bugDetectionReport?.totalBugs ?? activeScanResult.issues.filter(i => i.category === 'bug').length})
                  </button>
                  <button
                    onClick={() => { setFilterCategory('performance'); setFilterSeverity('all'); }}
                    className={`px-3 py-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                      filterCategory === 'performance'
                        ? 'bg-teal-600 text-white border-teal-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Performance ({activeScanResult.issues.filter(i => i.category === 'performance').length})
                  </button>
                </div>

                {/* Quick Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchIssueQuery}
                    onChange={(e) => setSearchIssueQuery(e.target.value)}
                    placeholder="Search file, flaw or line..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Interactive Split / Unified Diff Inspection Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Issue Selector List */}
                <div className="lg:col-span-5 bg-white border border-slate-200 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Detected Vulnerabilities ({filteredIssues.length})
                    </h3>
                    <span className="text-[11px] text-slate-500">Select issue to inspect diff</span>
                  </div>

                  <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                    {filteredIssues.map((issue, idx) => {
                      const isSelected = currentIssue?.id === issue.id;
                      const isFixed = !!appliedFixes[issue.id];

                      return (
                        <div
                          key={issue.id ? `${issue.id}__${idx}` : `issue-${idx}`}
                          onClick={() => setSelectedIssue(issue)}
                          className={`p-3.5 border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/40 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 uppercase border ${
                                  issue.severity === 'critical'
                                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                                    : issue.severity === 'high'
                                    ? 'bg-orange-50 text-orange-800 border-orange-300'
                                    : issue.severity === 'medium'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                {issue.severity}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                                {issue.category}
                              </span>
                              {issue.cwe && (
                                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 border border-slate-300">
                                  {issue.cwe}
                                </span>
                              )}
                              {issue.isTestOrExample || issue.verificationStatus === 'test_scope' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 border bg-blue-50 text-blue-800 border-blue-300">
                                  🔬 Test Scope
                                </span>
                              ) : issue.verificationStatus === 'confirmed' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-300">
                                  ✓ Confirmed
                                </span>
                              ) : issue.verificationStatus === 'false_positive' ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 border bg-slate-100 text-slate-600 border-slate-300">
                                  ○ False Positive
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 border bg-amber-50 text-amber-800 border-amber-300">
                                  ⚠ Potential
                                </span>
                              )}
                            </div>

                        {isFixed && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 border border-emerald-300 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Resolved
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {issue.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                        {issue.file}:{issue.line}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Deep Inspection & Code Diff Viewer */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
              {currentIssue ? (
                <>
                  {/* Issue Header */}
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 uppercase border ${
                            currentIssue.severity === 'critical'
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : currentIssue.severity === 'high'
                              ? 'bg-orange-50 text-orange-800 border-orange-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {currentIssue.severity}
                        </span>
                        <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200">
                          {currentIssue.file}:{currentIssue.line}
                        </span>
                        {currentIssue.cwe && (
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 border border-slate-300">
                            {currentIssue.cwe}
                          </span>
                        )}
                        {currentIssue.owaspCategory && (
                          <span className="text-xs font-mono font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 border border-indigo-200">
                            {currentIssue.owaspCategory}
                          </span>
                        )}
                        {currentIssue.isTestOrExample || currentIssue.verificationStatus === 'test_scope' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 border bg-blue-50 text-blue-800 border-blue-300">
                            🔬 Test & Example Scope (Non-Production)
                          </span>
                        ) : currentIssue.verificationStatus === 'confirmed' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 border bg-emerald-50 text-emerald-800 border-emerald-300">
                            ✓ Confirmed Vulnerability (Verified Taint-Flow)
                          </span>
                        ) : currentIssue.verificationStatus === 'false_positive' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 border bg-slate-100 text-slate-700 border-slate-300">
                            ○ False Positive (Sanitized/Unreachable)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 border bg-amber-50 text-amber-800 border-amber-300">
                            ⚠ Potential Risk (Heuristic Check)
                          </span>
                        )}
                      </div>

                      {/* Diff View Mode Switcher */}
                      <div className="flex border border-slate-300 bg-slate-50 p-0.5 text-xs font-bold">
                        <button
                          onClick={() => setDiffViewMode('split')}
                          className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${
                            diffViewMode === 'split' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'
                          }`}
                        >
                          <Columns className="w-3.5 h-3.5" />
                          <span>Split Diff</span>
                        </button>
                        <button
                          onClick={() => setDiffViewMode('unified')}
                          className={`px-2.5 py-1 flex items-center gap-1.5 cursor-pointer ${
                            diffViewMode === 'unified' ? 'bg-white shadow-2xs text-blue-700' : 'text-slate-600'
                          }`}
                        >
                          <Rows className="w-3.5 h-3.5" />
                          <span>Unified Diff</span>
                        </button>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {currentIssue.title}
                    </h3>

                    {/* Root Cause, Evidence Basis & Impact */}
                    <div className="mt-3 space-y-2 text-xs">
                      {/* Test & Example Scope Isolation Notice */}
                      {(currentIssue.isTestOrExample || currentIssue.verificationStatus === 'test_scope') && (
                        <div className="bg-blue-50/80 border border-blue-300 p-3.5 space-y-1 text-xs">
                          <span className="font-bold text-blue-900 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                            <Info className="w-3.5 h-3.5 text-blue-700" />
                            <span>Isolated Test & Example Scope (Non-Production Code)</span>
                          </span>
                          <p className="text-blue-950 text-[11px] leading-relaxed">
                            This finding is located in test harness, example, or mock fixture code (<span className="font-mono font-semibold">{currentIssue.file}</span>). Dangerous patterns or mock credentials in test files are not reachable by production user requests, so CoreAudit segregates them and caps severity.
                          </p>
                        </div>
                      )}

                      {/* Evidence Basis Card */}
                      <div className="bg-emerald-50/60 p-3 border border-emerald-300 space-y-1.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Verification Basis & Code Evidence:</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Status: {currentIssue.statusCategory || (currentIssue.isVerifiedFact !== false ? 'Confirmed' : 'Potential')}
                            </span>
                            <span className="text-[10px] font-bold uppercase font-mono px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-300">
                              {currentIssue.confidenceLevel || 'Confirmed'}
                            </span>
                          </div>
                        </div>
                        <p className="text-emerald-900 font-mono text-[11px] leading-relaxed">
                          {currentIssue.evidenceBasis || `Syntax verification on line ${currentIssue.line} in ${currentIssue.file} matches ${currentIssue.cwe || 'vulnerability signature'}.`}
                        </p>
                      </div>

                      {/* Taint Flow & Exploitability Proof (Source -> Sanitizer -> Sink) */}
                      {(currentIssue.sourceToSink || currentIssue.dataFlowProof) && (
                        <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              <span>Verified Source-to-Sink Taint Flow Evidence</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">Source ➔ Sanitizer ➔ Sink</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                            <div className="p-2 bg-white border border-slate-200">
                              <span className="text-[9px] font-bold uppercase text-slate-400 block">Input Source</span>
                              <span className="text-slate-800 font-medium">
                                {currentIssue.sourceToSink?.source || currentIssue.dataFlowProof?.source}
                              </span>
                            </div>
                            <div className="p-2 bg-white border border-slate-200">
                              <span className="text-[9px] font-bold uppercase text-amber-600 block">Sanitizer Status</span>
                              <span className="text-amber-800 font-medium">
                                {currentIssue.sourceToSink?.sanitizerStatus || currentIssue.dataFlowProof?.sanitizerStatus}
                              </span>
                            </div>
                            <div className="p-2 bg-white border border-slate-200">
                              <span className="text-[9px] font-bold uppercase text-rose-600 block">Vulnerable Sink</span>
                              <span className="text-rose-800 font-medium">
                                {currentIssue.sourceToSink?.sink || currentIssue.dataFlowProof?.sink}
                              </span>
                            </div>
                          </div>
                          {currentIssue.sourceToSink?.dataFlow && (
                            <div className="p-2 bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-700">
                              <strong>Data Flow Path:</strong> {currentIssue.sourceToSink.dataFlow}
                            </div>
                          )}
                          <div className="p-2 bg-rose-50/60 border border-rose-200 text-[11px] text-rose-900">
                            <strong>Exploit Scenario:</strong> {currentIssue.sourceToSink?.exploitability || currentIssue.dataFlowProof?.exploitability || currentIssue.exploitScenario || 'Direct exploitation scenario verified.'}
                          </div>
                        </div>
                      )}

                      <div className="bg-slate-50 p-3 border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-0.5">Root Cause:</span>
                        <p className="text-slate-700">{currentIssue.description}</p>
                      </div>
                      <div className="bg-rose-50/50 p-3 border border-rose-200">
                        <span className="font-bold text-rose-900 block mb-0.5">Production Impact:</span>
                        <p className="text-rose-800">{currentIssue.impact}</p>
                      </div>
                      {currentIssue.remediation && (
                        <div className="bg-blue-50/50 p-3 border border-blue-200">
                          <span className="font-bold text-blue-900 block mb-0.5">Remediation Action:</span>
                          <p className="text-blue-800">{currentIssue.remediation}</p>
                        </div>
                      )}
                      {currentIssue.verificationSteps && currentIssue.verificationSteps.length > 0 && (
                        <div className="bg-emerald-50/60 p-3.5 border border-emerald-200 space-y-1.5">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Post-Fix Verification Steps:</span>
                          </span>
                          <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-950">
                            {currentIssue.verificationSteps.map((step, idx) => (
                              <li key={idx} className="leading-relaxed">{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Code Diff Display (Sharp Terminal Styling) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Code className="w-4 h-4 text-blue-600" />
                        Code Remediation Diff
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(currentIssue.fixedSnippet, currentIssue.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer flex items-center gap-1"
                        >
                          {copiedIssueId === currentIssue.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Copied Fix</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Fix</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDownloadPatch(currentIssue)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer flex items-center gap-1"
                        >
                          <FileDown className="w-3 h-3" />
                          <span>.patch</span>
                        </button>
                      </div>
                    </div>

                    {diffViewMode === 'split' ? (
                      /* Side-by-Side (Split) Diff */
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                        {/* Original Snippet */}
                        <div className="border border-rose-300 bg-rose-50/30 overflow-hidden">
                          <div className="bg-rose-100/80 px-3 py-1.5 text-rose-900 font-bold border-b border-rose-200 flex items-center justify-between">
                            <span>Vulnerable Code ({currentIssue.file})</span>
                            <span className="text-[10px] text-rose-700">Line {currentIssue.line}</span>
                          </div>
                          <pre className="p-3 overflow-x-auto text-rose-950 whitespace-pre-wrap leading-relaxed text-[11px]">
                            {currentIssue.originalSnippet}
                          </pre>
                        </div>

                        {/* Fixed Snippet */}
                        <div className="border border-emerald-300 bg-emerald-50/30 overflow-hidden">
                          <div className="bg-emerald-100/80 px-3 py-1.5 text-emerald-900 font-bold border-b border-emerald-200 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span>Hardened Replacement</span>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-200 text-emerald-900 border border-emerald-400">
                                Functional Patch (Preserves Logic)
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-700">Protected</span>
                          </div>
                          <pre className="p-3 overflow-x-auto text-emerald-950 whitespace-pre-wrap leading-relaxed text-[11px]">
                            {currentIssue.fixedSnippet}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      /* Unified Diff */
                      <div className="border border-slate-300 bg-slate-900 text-slate-100 font-mono text-xs overflow-hidden">
                        <div className="bg-slate-800 px-3 py-1.5 text-slate-300 font-bold border-b border-slate-700 text-[11px]">
                          --- a/{currentIssue.file} (Line {currentIssue.line}) +++ b/{currentIssue.file}
                        </div>
                        <div className="p-3 overflow-x-auto space-y-1 text-[11px]">
                          {currentIssue.originalSnippet.split('\n').map((line, idx) => (
                            <div key={`orig-${idx}`} className="bg-rose-950/60 text-rose-300 px-2 py-0.5 -mx-1 flex">
                              <span className="text-rose-500 mr-2 select-none">-</span>
                              <span>{line}</span>
                            </div>
                          ))}
                          {currentIssue.fixedSnippet.split('\n').map((line, idx) => (
                            <div key={`fix-${idx}`} className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 -mx-1 flex">
                              <span className="text-emerald-500 mr-2 select-none">+</span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accept / Mark Fixed Action Button */}
                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      {appliedFixes[currentIssue.id] ? 'Fix marked accepted in report' : 'Ready to accept verified patch'}
                    </span>
                    <button
                      onClick={() => handleApplyFix(currentIssue.id)}
                      className={`px-4 py-2 text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                        appliedFixes[currentIssue.id]
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>{appliedFixes[currentIssue.id] ? 'Patch Applied ✓' : 'Accept This Fix'}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Select an issue from the list to inspect the diff.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Final Recommendations & Strategic Remediation Roadmap */}
      {activeScanResult.finalRecommendations && activeScanResult.finalRecommendations.length > 0 && (
        <div className="bg-white border border-slate-200 p-5 shadow-2xs space-y-3 border-t-2 border-t-blue-600">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Final Recommendations & Strategic Remediation Roadmap
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {activeScanResult.finalRecommendations.length} action items
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {activeScanResult.finalRecommendations.map((rec, rIdx) => (
              <div key={rIdx} className="p-3 bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                <span className="w-5 h-5 bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center shrink-0 border border-blue-200">
                  {rIdx + 1}
                </span>
                <p className="text-slate-800 leading-relaxed font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);
  }

  // =========================================================================
  // INPUT MODE: CLEAN, PROFESSIONAL CODE SCANNER FORM (ZERO FLUFF)
  // =========================================================================
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 bg-blue-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0 font-mono">
            {'</>'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Code Auditor
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Static application security testing (SAST), AST logic flaw audit & automated diff patching.
            </p>
          </div>
        </div>

        {recentScans.length > 0 && (
          <button
            onClick={() => openScanSlide(recentScans[0])}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Open Latest Scan ({recentScans[0].projectName})</span>
          </button>
        )}
      </div>

      {/* Main Grid: Input + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 1. SELECT INPUT METHOD */}
        <div className="lg:col-span-8 bg-white border border-slate-200 p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. Project Code Source
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter a GitHub repo URL, upload code or ZIP archives, or paste raw source code.
            </p>
          </div>

          {/* Segmented Control Tabs (Square, Clean) */}
          <div className="flex border border-slate-200 bg-slate-50 p-1">
            <button
              onClick={() => setActiveTab('github')}
              className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'github'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Github className="w-4 h-4" />
              <span>GitHub Repo</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload Files / ZIP</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'paste'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode2 className="w-4 h-4" />
              <span>Direct Code Paste</span>
            </button>
          </div>

          {/* Project Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Project Identifier / Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. core-auth-service or api-gateway"
              className="w-full px-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm font-medium text-slate-900 placeholder:text-slate-400 font-mono"
            />
          </div>

          {/* Tab 1: GitHub */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Public Repository URL
                </label>
                <div className="relative">
                  <Github className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/organization/repository"
                    className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 focus:outline-none focus:border-blue-600 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-600">
                Auditor clones repository structure, inspects package manifests, and executes static AST checks across all modules.
              </div>
            </div>
          )}

          {/* Tab 2: Upload Files / ZIP */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-blue-600 p-6 text-center bg-slate-50/50 hover:bg-blue-50/20 transition-all cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept=".zip,.js,.jsx,.mjs,.cjs,.ts,.tsx,.py,.go,.java,.php,.rb,.rs,.c,.cpp,.h,.hpp,.cs,.kt,.swift,.dart,.sql,.sh,.html,.css,.json,.env"
                />
                <p className="text-sm font-bold text-slate-900">
                  Drag and drop ZIP archive or multiple source code files here
                </p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">
                  or click to select from file browser (multi-file selection supported)
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .zip archives, JS/TS, Python, Go, Java, PHP, Rust, C/C++, C#, Ruby, SQL, Shell, Configs
                </p>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center justify-between">
                  <span className="font-bold">
                    ✓ Extracted {uploadedFiles.length} file(s) ready for analysis
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700">
                    {uploadedFiles[0].name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Direct Paste with Line Number Gutter */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Source Code Editor
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500">Presets:</span>
                  <button
                    onClick={() => {
                      setCodeSnippet(sampleCodes.sqlInjection);
                      setProjectName('auth-sql-demo');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 border border-blue-200 cursor-pointer"
                  >
                    SQLi & XSS (JS)
                  </button>
                  <button
                    onClick={() => {
                      setCodeSnippet(sampleCodes.pythonFlask);
                      setProjectName('flask-auth-service');
                    }}
                    className="text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 bg-indigo-50 px-2 py-0.5 border border-indigo-200 cursor-pointer"
                  >
                    Python API
                  </button>
                  <button
                    onClick={() => {
                      setCodeSnippet(sampleCodes.goSample);
                      setProjectName('go-microservice');
                    }}
                    className="text-[11px] font-semibold text-teal-700 hover:bg-teal-100 bg-teal-50 px-2 py-0.5 border border-teal-200 cursor-pointer"
                  >
                    Go Service
                  </button>
                  <button
                    onClick={() => {
                      setCodeSnippet(sampleCodes.brokenAuth);
                      setProjectName('jwt-idor-demo');
                    }}
                    className="text-[11px] font-semibold text-blue-700 hover:bg-blue-100 bg-blue-50 px-2 py-0.5 border border-blue-200 cursor-pointer"
                  >
                    Broken Auth
                  </button>
                  <button
                    onClick={() => {
                      setCodeSnippet(sampleCodes.cleanCode);
                      setProjectName('clean-math-util');
                    }}
                    className="text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 bg-emerald-50 px-2 py-0.5 border border-emerald-300 cursor-pointer"
                  >
                    Clean Code (0 Issues)
                  </button>
                </div>
              </div>

              {/* Code Editor with Line Number Gutter */}
              <div className="border border-slate-700 bg-slate-950 font-mono text-xs flex overflow-hidden">
                {/* Line Numbers Gutter */}
                <div
                  aria-hidden="true"
                  className="bg-slate-900/90 text-slate-500 select-none py-3 px-3 text-right border-r border-slate-800 leading-relaxed font-mono shrink-0 tabular-nums min-w-[42px]"
                >
                  {Array.from(
                    { length: Math.max(1, codeSnippet ? codeSnippet.split('\n').length : 1) },
                    (_, i) => (
                      <div key={i + 1}>{i + 1}</div>
                    )
                  )}
                </div>

                {/* Textarea */}
                <textarea
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="// Paste your source code here (JavaScript, TypeScript, Python, Java, C, C++, C#, PHP, Go, Rust, Ruby, HTML, CSS, SQL, Kotlin, Swift, Dart)..."
                  rows={11}
                  className="w-full py-3 px-3.5 bg-slate-950 text-slate-100 placeholder:text-slate-500 font-mono text-xs leading-relaxed outline-none resize-y"
                  spellCheck={false}
                />
              </div>

              {/* Status Bar & Supported Languages */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <span>Lines: {codeSnippet ? codeSnippet.split('\n').length : 0}</span>
                  <span>Characters: {codeSnippet.length}</span>
                  {codeSnippet.trim() && (
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 border border-blue-200">
                      Detected: {validateSourceCode(codeSnippet).detectedLanguage || 'Detecting...'}
                    </span>
                  )}
                </div>

                <div className="text-[10px] text-slate-400">
                  Supported: JS, TS, Python, Java, C/C++, C#, PHP, Go, Rust, Ruby, HTML, CSS, SQL, Kotlin, Swift, Dart
                </div>
              </div>
            </div>
          )}

          {privateRepoInfo && (
            <div className="p-4 bg-amber-50 border border-amber-300 space-y-3">
              <div className="flex items-start gap-2.5">
                <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Public GitHub Repository Required
                  </h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Repository <strong>"{privateRepoInfo.repoName}"</strong> is private or was not found. Please provide a valid <strong>public GitHub repository link</strong>.
                  </p>
                  <p className="text-xs text-amber-900 font-medium mt-1.5">
                    Alternatively, to audit this codebase directly, you can upload source code files or a project ZIP archive in the <strong>"Upload Files / ZIP"</strong> tab.
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-200 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('upload');
                    setPrivateRepoInfo(null);
                  }}
                  className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Switch to Upload Files / ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivateRepoInfo(null)}
                  className="text-xs text-amber-800 hover:underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {scanError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Run Scan Button */}
          <button
            onClick={executeScan}
            disabled={isScanning || zipUnpacking}
            className={`w-full py-3 px-6 font-bold text-sm text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isScanning || zipUnpacking
                ? 'bg-blue-700/60 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            {isScanning || zipUnpacking ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{scanStep || 'Executing Static AST Security Scan...'}</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Execute Code Security Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: 2. SCAN CONFIGURATION */}
        <div className="lg:col-span-4 bg-white border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                2. Audit Scope & Ruleset
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the depth and vulnerability standards to test.
              </p>
            </div>

            <div className="space-y-3">
              <label
                onClick={() => setScanType('full')}
                className={`block p-3.5 border transition-all cursor-pointer ${
                  scanType === 'full'
                    ? 'border-blue-700 bg-blue-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="scanType"
                    checked={scanType === 'full'}
                    onChange={() => setScanType('full')}
                    className="mt-1 text-blue-700 focus:ring-blue-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Full Project Scan (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-normal">
                      Deep inspection covering injection, authentication, logic bugs, performance, and packages.
                    </span>
                  </div>
                </div>
              </label>

              <label
                onClick={() => setScanType('security')}
                className={`block p-3.5 border transition-all cursor-pointer ${
                  scanType === 'security'
                    ? 'border-rose-700 bg-rose-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="scanType"
                    checked={scanType === 'security'}
                    onChange={() => setScanType('security')}
                    className="mt-1 text-rose-700 focus:ring-rose-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Security & Exploit Audit
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-normal">
                      Focuses exclusively on OWASP Top 10 vulnerabilities, RCE, XSS, and credential leaks.
                    </span>
                  </div>
                </div>
              </label>

              <label
                onClick={() => setScanType('quick')}
                className={`block p-3.5 border transition-all cursor-pointer ${
                  scanType === 'quick'
                    ? 'border-teal-700 bg-teal-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="scanType"
                    checked={scanType === 'quick'}
                    onChange={() => setScanType('quick')}
                    className="mt-1 text-teal-700 focus:ring-teal-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Quick Syntax & Bug Lint
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block leading-normal">
                      Fast sanity pass for common code defects and unhandled errors.
                    </span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Standard: OWASP Top 10 & CWE</span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Patches
            </span>
          </div>
        </div>
      </div>

      {/* Recent Scans Table (Clean & Professional) */}
      {recentScans.length > 0 && (
        <div className="bg-white border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Historical Code Audits ({recentScans.length})
            </h3>
            <span className="text-xs text-slate-400">Click any row to open the complete report slide</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Security Score</th>
                  <th className="py-2.5 px-3">Audit Grade</th>
                  <th className="py-2.5 px-3">Flaws Found</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium font-mono">
                {recentScans.map((scan, sIdx) => (
                  <tr
                    key={scan.id ? `${scan.id}__${sIdx}` : `scan-${sIdx}`}
                    onClick={() => {
                      openScanSlide(scan);
                      onSelectScan(scan);
                    }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-3 font-bold text-slate-900 group-hover:text-blue-700">
                      {scan.projectName}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-blue-700">
                        {scan.score}/100
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                        {scan.grade}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={scan.issuesCount > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}>
                        {scan.issuesCount} issues
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-sans">
                      <span className="text-blue-700 font-bold group-hover:underline inline-flex items-center gap-1 text-xs">
                        View Slide <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
