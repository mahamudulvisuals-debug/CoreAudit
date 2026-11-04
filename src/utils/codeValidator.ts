/**
 * Code Auditor Validation Utility
 * Enforces strict, real-world source code validation before scanning.
 * Rejects empty input, gibberish, numeric strings, and plain natural language.
 */

export interface CodeValidationResult {
  isValid: boolean;
  detectedLanguage?: string;
  error?: string;
  confidence: 'high' | 'medium' | 'low';
  tokensFound: string[];
}

// Strong programming keyword indicators by language
const LANGUAGE_SIGNATURES: Record<string, { keywords: RegExp[]; patterns: RegExp[] }> = {
  javascript: {
    keywords: [
      /\b(const|let|var|function|return|import|export|from|require|async|await|class|extends|new|typeof|instanceof|console\.log|process\.env)\b/,
      /\b(module\.exports|exports\.|document\.|window\.|addEventListener|setTimeout|setInterval|Promise|throw\s+new\s+Error)\b/,
    ],
    patterns: [
      /=>\s*\{?/, // arrow function
      /\(\s*[a-zA-Z0-9_$,\s]*\)\s*=>/,
      /\bfunction\s+[a-zA-Z0-9_$]+\s*\(/,
      /console\.(log|error|warn|info)\s*\(/,
    ],
  },
  typescript: {
    keywords: [
      /\b(interface|type|enum|implements|namespace|abstract|declare|readonly|as\s+[A-Z]|keyof)\b/,
      /:\s*(string|number|boolean|any|void|unknown|never|Record|Array|Promise)<.*>/,
    ],
    patterns: [
      /:\s*(string|number|boolean|any|void|unknown)\[?\]?/,
      /interface\s+[A-Z][a-zA-Z0-9_]*\s*\{/,
      /type\s+[A-Z][a-zA-Z0-9_]*\s*=/,
    ],
  },
  python: {
    keywords: [
      /\b(def|elif|import|from|class|lambda|pass|yield|raise|with|as|self|print|None|True|False|if\s+__name__\s*==\s*['"]__main__['"])\b/,
      /\b(async\s+def|await|@staticmethod|@classmethod|@property|__init__)\b/,
    ],
    patterns: [
      /def\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*:/,
      /class\s+[a-zA-Z0-9_]+(\([^)]*\))?\s*:/,
      /import\s+[a-zA-Z0-9_]+/,
      /from\s+[a-zA-Z0-9_.]+\s+import/,
    ],
  },
  java: {
    keywords: [
      /\b(public|private|protected|class|static|void|package|import\s+java|extends|implements|System\.out\.println)\b/,
      /\b(String|int|boolean|double|float|char|byte|short|long|new\s+[A-Z][a-zA-Z0-9]*\(|@Override|@Autowired)\b/,
    ],
    patterns: [
      /public\s+static\s+void\s+main\s*\(/,
      /(public|private|protected)\s+[a-zA-Z0-9_<>[\]]+\s+[a-zA-Z0-9_]+\s*\(/,
    ],
  },
  c_cpp: {
    keywords: [
      /#include\s+[<"][a-zA-Z0-9_.]+[>"]/,
      /\b(int|void|char|double|float|long|unsigned|struct|typedef|using\s+namespace|std::|nullptr|cout|cin|printf|scanf)\b/,
      /\b(malloc|free|sizeof|extern|volatile)\b/,
    ],
    patterns: [
      /#include\s*<[a-z.]+>/,
      /int\s+main\s*\([^)]*\)\s*\{?/,
      /std::[a-zA-Z0-9_]+/,
    ],
  },
  go: {
    keywords: [
      /\b(package\s+[a-zA-Z0-9_]+|import\s+\(|func\s+|var\s+[a-zA-Z0-9_]+\s+[a-zA-Z0-9_]+|type\s+[a-zA-Z0-9_]+\s+struct)\b/,
      /\b(goroutine|chan|defer|make\(|fmt\.Print|fmt\.Sprintf|err\s*!=\s*nil)\b/,
    ],
    patterns: [
      /func\s+(\([a-zA-Z0-9_*\s]+\)\s*)?[a-zA-Z0-9_]+\s*\(/,
      /package\s+[a-zA-Z0-9_]+/,
    ],
  },
  php: {
    keywords: [
      /<\?php/,
      /\b(function|echo|require_once|include_once|\$[a-zA-Z0-9_]+|namespace|use|public\s+function)\b/,
    ],
    patterns: [
      /<\?php/,
      /\$[a-zA-Z_][a-zA-Z0-9_]*\s*=/,
    ],
  },
  ruby: {
    keywords: [
      /\b(def|end|class|module|require|attr_accessor|puts|yield|rescue|ensure)\b/,
    ],
    patterns: [
      /def\s+[a-zA-Z0-9_!?]+/,
      /class\s+[A-Z][a-zA-Z0-9_]*/,
    ],
  },
  rust: {
    keywords: [
      /\b(fn|let\s+mut|pub\s+fn|impl|struct|enum|match|use\s+std|println!|Result<|Option<|unwrap\(\)|panic!)\b/,
    ],
    patterns: [
      /fn\s+[a-zA-Z0-9_]+\s*\(/,
      /pub\s+fn\s+[a-zA-Z0-9_]+/,
      /let\s+(mut\s+)?[a-zA-Z0-9_]+(\s*:\s*[a-zA-Z0-9_<>]+)?\s*=/,
    ],
  },
  csharp: {
    keywords: [
      /\b(using\s+System|namespace\s+[a-zA-Z0-9_.]+|public\s+class\s+[a-zA-Z0-9_]+|Console\.WriteLine|async\s+Task|string\s+[a-zA-Z0-9_]+|get;\s*set;|IActionResult|\[HttpGet\]|\[HttpPost\])\b/,
    ],
    patterns: [
      /namespace\s+[a-zA-Z0-9_.]+/,
      /public\s+class\s+[a-zA-Z0-9_]+/,
      /Console\.WriteLine\s*\(/,
      /using\s+System(\.[a-zA-Z0-9_]+)*;/,
    ],
  },
  kotlin: {
    keywords: [
      /\b(fun\s+[a-zA-Z0-9_]+\s*\(|val\s+[a-zA-Z0-9_]+|var\s+[a-zA-Z0-9_]+|package\s+[a-zA-Z0-9_.]+|data\s+class|companion\s+object|override\s+fun|suspend\s+fun)\b/,
      /\b(println\s*\(|lateinit\s+var|CoroutineScope)\b/,
    ],
    patterns: [
      /fun\s+[a-zA-Z0-9_]+\s*\(/,
      /data\s+class\s+[A-Z][a-zA-Z0-9_]*\s*\(/,
      /val\s+[a-zA-Z0-9_]+\s*(:\s*[a-zA-Z0-9_<>?]+)?\s*=/,
    ],
  },
  swift: {
    keywords: [
      /\b(import\s+Foundation|import\s+UIKit|import\s+SwiftUI|func\s+[a-zA-Z0-9_]+\s*\(|guard\s+let|if\s+let|@State|@Binding|@ObservedObject)\b/,
      /\b(struct\s+[A-Z][a-zA-Z0-9_]*\s*:\s*View|override\s+func|print\s*\(|mutating\s+func)\b/,
    ],
    patterns: [
      /func\s+[a-zA-Z0-9_]+\s*\([^)]*\)\s*(->\s*[a-zA-Z0-9_<>?]+)?\s*\{/,
      /guard\s+let\s+[a-zA-Z0-9_]+\s*=/,
      /struct\s+[A-Z][a-zA-Z0-9_]*\s*:\s*View/,
    ],
  },
  dart: {
    keywords: [
      /\b(import\s+['"]package:flutter|void\s+main\s*\(\)|Widget\s+build|StatelessWidget|StatefulWidget|setState\s*\(|final\s+[a-zA-Z0-9_<>]+)\b/,
      /\b(BuildContext\s+context|MaterialApp|Scaffold|print\s*\()\b/,
    ],
    patterns: [
      /Widget\s+build\s*\(\s*BuildContext\s+context\s*\)/,
      /class\s+[A-Z][a-zA-Z0-9_]*\s+extends\s+(Stateless|Stateful)Widget/,
      /import\s+['"]package:[a-zA-Z0-9_/.]+\.dart['"];/,
    ],
  },
  css: {
    keywords: [
      /@media\s*\([^)]+\)/,
      /@import\s+['"][^'"]+['"];/,
      /@keyframes\s+[a-zA-Z0-9_-]+/,
    ],
    patterns: [
      /[.#]?[a-zA-Z0-9_-]+\s*\{[^}]*(margin|padding|color|background|display|font|border|flex|grid|position)\s*:[^}]*\}/,
      /:(hover|focus|active|before|after)\s*\{/,
    ],
  },
  sql: {
    keywords: [
      /\b(SELECT|FROM|WHERE|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE)\b/i,
      /\b(JOIN|INNER\s+JOIN|LEFT\s+JOIN|GROUP\s+BY|ORDER\s+BY|HAVING|UNION|INDEX|PRIMARY\s+KEY|FOREIGN\s+KEY)\b/i,
    ],
    patterns: [
      /SELECT\s+.+\s+FROM\s+/i,
      /CREATE\s+TABLE\s+[a-zA-Z0-9_]+/i,
    ],
  },
  html_markup: {
    keywords: [
      /<!DOCTYPE\s+html>/i,
      /<(html|head|body|div|span|p|a|script|style|link|meta|table|tr|td|form|input|button)\b/i,
    ],
    patterns: [
      /<\/?[a-zA-Z0-9]+(\s+[^>]*)?>/,
    ],
  },
  shell: {
    keywords: [
      /^#!\/bin\/(bash|sh|zsh)/m,
      /\b(echo|export|grep|awk|sed|chmod|chown|systemctl|sudo|mkdir|rm\s+-rf|if\s+\[|fi|then|elif)\b/,
    ],
    patterns: [
      /^#!\/bin\//,
      /\$[a-zA-Z_][a-zA-Z0-9_]*/,
    ],
  },
  dockerfile: {
    keywords: [
      /^(FROM|RUN|CMD|ENTRYPOINT|WORKDIR|COPY|ADD|ENV|EXPOSE|VOLUME|USER|ARG)\s+/m,
    ],
    patterns: [
      /^FROM\s+[a-zA-Z0-9_/:.-]+/m,
    ],
  },
  json_yaml: {
    keywords: [
      /^\s*\{\s*"[a-zA-Z0-9_]+":/m,
      /^\s*"[a-zA-Z0-9_]+":\s*["{\[\d]/m,
      /^[a-zA-Z0-9_]+:\s+[a-zA-Z0-9_]/m,
    ],
    patterns: [
      /^\s*\{\s*"[^"]+"\s*:/,
      /^[a-zA-Z0-9_-]+:\s*$/m,
    ],
  },
};

// Structural code symbols that must be present in programming code
const CODE_SYNTAX_SYMBOLS = /[{}();=><+\-*/[\]]/;

/**
 * Validates whether the given string represents legitimate source code.
 */
export function validateSourceCode(codeText: string, fileName?: string): CodeValidationResult {
  const trimmed = (codeText || '').trim();

  // 1. Check empty
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Code input is empty. Please paste or upload valid source code.',
      confidence: 'high',
      tokensFound: [],
    };
  }

  // 2. Minimum length check: valid code files or snippets are at least 12 characters
  if (trimmed.length < 12) {
    return {
      isValid: false,
      error: `Input is too short (${trimmed.length} characters) to be valid code. Please provide an authentic source code snippet or file.`,
      confidence: 'high',
      tokensFound: [],
    };
  }

  // 3. Reject pure numeric sequences (e.g., "123456", "9876543210")
  if (/^[\d\s,.-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Pure numeric digits detected. Please provide programming source code with functions, variables, or statements.',
      confidence: 'high',
      tokensFound: [],
    };
  }

  // 4. Reject single non-code words or short phrases without code syntax (e.g. "hello", "তথ্থণ", "test")
  const wordTokens = trimmed.split(/\s+/).filter(Boolean);
  if (wordTokens.length <= 3 && !CODE_SYNTAX_SYMBOLS.test(trimmed)) {
    return {
      isValid: false,
      error: 'Arbitrary text detected without code syntax. Please submit source code with programming constructs.',
      confidence: 'high',
      tokensFound: [],
    };
  }

  // 5. Reject pure natural language paragraphs without any programming constructs or symbols
  // Check if there are no brackets, braces, semicolons, function invocations, assignments, or tags
  const hasSyntaxSymbols = CODE_SYNTAX_SYMBOLS.test(trimmed);
  if (!hasSyntaxSymbols && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
    return {
      isValid: false,
      error: 'Plain text without programming syntax detected. Source code must contain statements, assignments, function definitions, or markup.',
      confidence: 'high',
      tokensFound: [],
    };
  }

  // 6. Test language signatures
  const matchedLanguages: { lang: string; score: number; tokens: string[] }[] = [];

  for (const [lang, sig] of Object.entries(LANGUAGE_SIGNATURES)) {
    let score = 0;
    const tokens: string[] = [];

    for (const kw of sig.keywords) {
      const match = trimmed.match(kw);
      if (match) {
        score += 2;
        tokens.push(match[0]);
      }
    }

    for (const pat of sig.patterns) {
      if (pat.test(trimmed)) {
        score += 3;
      }
    }

    if (score > 0) {
      matchedLanguages.push({ lang, score, tokens });
    }
  }

  // If filename extension was given, boost matching language
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    if (ext === 'js' || ext === 'mjs' || ext === 'cjs') boost(matchedLanguages, 'javascript', 4);
    if (ext === 'ts' || ext === 'tsx') boost(matchedLanguages, 'typescript', 4);
    if (ext === 'py') boost(matchedLanguages, 'python', 4);
    if (ext === 'java') boost(matchedLanguages, 'java', 4);
    if (ext === 'go') boost(matchedLanguages, 'go', 4);
    if (ext === 'cpp' || ext === 'c' || ext === 'h' || ext === 'hpp' || ext === 'cc') boost(matchedLanguages, 'c_cpp', 4);
    if (ext === 'cs') boost(matchedLanguages, 'csharp', 4);
    if (ext === 'kt' || ext === 'kts') boost(matchedLanguages, 'kotlin', 4);
    if (ext === 'swift') boost(matchedLanguages, 'swift', 4);
    if (ext === 'dart') boost(matchedLanguages, 'dart', 4);
    if (ext === 'php') boost(matchedLanguages, 'php', 4);
    if (ext === 'rb') boost(matchedLanguages, 'ruby', 4);
    if (ext === 'rs') boost(matchedLanguages, 'rust', 4);
    if (ext === 'sql') boost(matchedLanguages, 'sql', 4);
    if (ext === 'html' || ext === 'htm') boost(matchedLanguages, 'html_markup', 4);
    if (ext === 'css') boost(matchedLanguages, 'css', 4);
    if (ext === 'sh' || ext === 'bash') boost(matchedLanguages, 'shell', 4);
  }

  matchedLanguages.sort((a, b) => b.score - a.score);

  // If no language matched at all, check if there's any generic code structure (e.g. { ... }, assignments, semicolons)
  if (matchedLanguages.length === 0) {
    const genericCodeIndicators = [
      /[a-zA-Z0-9_]+\s*=\s*[^=]/, // assignment
      /\{[\s\S]*\}/,             // block
      /[a-zA-Z0-9_]+\([^)]*\)/,  // function call
      /;\s*$/,                   // semicolon at line end
      /^\s*(\/\/|#|\/\*)/m,      // code comments
    ];

    const genericMatches = genericCodeIndicators.filter(pat => pat.test(trimmed)).length;

    if (genericMatches >= 2) {
      return {
        isValid: true,
        detectedLanguage: 'Generic Source Code',
        confidence: 'medium',
        tokensFound: ['code_structure'],
      };
    }

    return {
      isValid: false,
      error: 'Unrecognized input. Please provide source code in a supported programming language (JavaScript, TypeScript, Python, Java, C, C++, C#, PHP, Go, Rust, Ruby, HTML, CSS, SQL, Kotlin, Swift, Dart, Shell, Dockerfile).',
      confidence: 'high',
      tokensFound: [],
    };
  }

  const bestMatch = matchedLanguages[0];
  const formattedLang = formatLanguageName(bestMatch.lang);

  return {
    isValid: true,
    detectedLanguage: formattedLang,
    confidence: bestMatch.score >= 4 ? 'high' : 'medium',
    tokensFound: bestMatch.tokens,
  };
}

function boost(list: { lang: string; score: number; tokens: string[] }[], target: string, pts: number) {
  const existing = list.find(l => l.lang === target);
  if (existing) {
    existing.score += pts;
  } else {
    list.push({ lang: target, score: pts, tokens: ['file_extension'] });
  }
}

function formatLanguageName(langKey: string): string {
  const map: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    c_cpp: 'C / C++',
    csharp: 'C# (.NET)',
    kotlin: 'Kotlin',
    swift: 'Swift',
    dart: 'Dart (Flutter)',
    css: 'CSS Stylesheet',
    go: 'Go (Golang)',
    php: 'PHP',
    ruby: 'Ruby',
    rust: 'Rust',
    sql: 'SQL (Structured Query Language)',
    html_markup: 'HTML / Web Markup',
    shell: 'Shell Script / Bash',
    dockerfile: 'Dockerfile / Container',
    json_yaml: 'JSON / YAML Config',
  };
  return map[langKey] || langKey;
}
