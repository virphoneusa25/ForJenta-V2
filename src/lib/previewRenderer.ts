/**
 * Preview Renderer v10 — Safe Data Isolation + Pre-execution Validation + Transform Diagnostics
 *
 * v10 additions:
 * 17. Safe Data Isolation — module data in <script type="application/json"> blocks, never inline JS
 * 18. Pre-execution Validation — every script block is syntax-checked with new Function() before execution
 * 19. Transform Trace — line-to-source mapping for pinpointing exact failure location
 * 20. Script Block Isolation — each runtime block (shim, factory, boundary) validated independently
 * 21. Final Script Gate — combined execution script validated before running
 * 22. Diagnostic Panel — rich error display when validation fails (line number, source excerpt, phase)
 * 23. Post-Babel Lowercase JSX Fix — converts React.createElement("icon",...) to variable ref for non-HTML tags
 *
 * Previous (v9):
 * 13. Pre-compile Validation — every processed file is syntax-checked before Babel compilation
 * 14. Auto-Repair — broken patterns (var from, orphaned exports, unbalanced braces) are fixed automatically
 * 15. Conditional Export Helpers — __default__ fallback only injected when export default was present
 * 16. Two-pass Validation — validate original source, then validate final transformed output before compile
 *
 * Previous (v8):
 * 1–12: Module Registry, Import Resolution, Dependency Graph, PER-FILE Transpile, Library Shims,
 *        CSS Injection, Regex/Escape Diagnostic, Error Surface, Console Capture, Robust TS Stripping,
 *        Dependency Failure Propagation, Export Validation
 */

import type { ProjectFile } from '@/types';

// ═══════════════════════════════════════════════════════════════════
// CDN URLS
// ═══════════════════════════════════════════════════════════════════

const CDN = {
  react: 'https://unpkg.com/react@18/umd/react.development.js',
  reactDom: 'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  babel: 'https://unpkg.com/@babel/standalone@7/babel.min.js',
  tailwind: 'https://cdn.tailwindcss.com',
  lucide: 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js',
};

// ═══════════════════════════════════════════════════════════════════
// MODULE REGISTRY TYPES
// ═══════════════════════════════════════════════════════════════════

interface ModuleRecord {
  filePath: string;
  rawSource: string;
  processedSource: string;
  transpiledSource: string;
  resolvedDeps: string[];
  unresolvedDeps: string[];
  compileStatus: 'pending' | 'ok' | 'syntax-error' | 'transform-error';
  compileError: string | null;
  compileErrorLine: number | null;
  compileErrorColumn: number | null;
  errorPhase: string | null;
}

// ═══════════════════════════════════════════════════════════════════
// FILE HELPERS
// ═══════════════════════════════════════════════════════════════════

function findFile(files: ProjectFile[], ...patterns: string[]): ProjectFile | undefined {
  for (const pat of patterns) {
    const found = files.find(
      (f) => f.path === pat || f.path.endsWith(`/${pat}`) || f.path.endsWith(pat)
    );
    if (found) return found;
  }
  return undefined;
}

function normalizeModuleId(filePath: string): string {
  return filePath
    .replace(/^src\//, '')
    .replace(/\.(tsx|ts|jsx|js)$/, '')
    .replace(/\/index$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_');
}

function moduleVar(filePath: string): string {
  return `__m_${normalizeModuleId(filePath)}`;
}

// ═══════════════════════════════════════════════════════════════════
// IMPORT RESOLUTION
// ═══════════════════════════════════════════════════════════════════

function resolveFilePath(specifier: string, fromDir: string, fileSet: Set<string>): string | null {
  let basePath: string;
  if (specifier.startsWith('@/')) {
    basePath = `src/${specifier.slice(2)}`;
  } else if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const parts = fromDir.split('/').filter(Boolean);
    const specParts = specifier.split('/');
    for (const sp of specParts) {
      if (sp === '.') continue;
      if (sp === '..') { parts.pop(); continue; }
      parts.push(sp);
    }
    basePath = parts.join('/');
  } else {
    return null;
  }
  const candidates = [basePath, `${basePath}.tsx`, `${basePath}.ts`, `${basePath}.jsx`, `${basePath}.js`, `${basePath}/index.tsx`, `${basePath}/index.ts`, `${basePath}/index.jsx`, `${basePath}/index.js`];
  for (const c of candidates) { if (fileSet.has(c)) return c; }
  return null;
}

function getFileDir(filePath: string): string {
  const idx = filePath.lastIndexOf('/');
  return idx >= 0 ? filePath.substring(0, idx) : '';
}

// ═══════════════════════════════════════════════════════════════════
// TYPESCRIPT STRIPPING
// ═══════════════════════════════════════════════════════════════════

function removeBlockDeclarations(code: string): string {
  const lines = code.split('\n');
  const output: string[] = [];
  let removing = false;
  let braceDepth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!removing) {
      const isInterface = /^\s*(?:export\s+)?interface\s+\w+/.test(line);
      const isEnum = /^\s*(?:export\s+)?(?:const\s+)?enum\s+\w+/.test(line);
      const isTypeBrace = /^\s*(?:export\s+)?type\s+\w+\s*(?:<[^>]*>)?\s*=\s*\{/.test(line);
      if (isInterface || isEnum || isTypeBrace) {
        braceDepth = 0;
        for (const ch of line) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; }
        if (braceDepth <= 0) { output.push(''); } else { removing = true; }
        continue;
      }
    }
    if (removing) {
      for (const ch of line) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; }
      if (braceDepth <= 0) { removing = false; }
      continue;
    }
    output.push(line);
  }
  return output.join('\n');
}

function stripDestructuredTypeAnnotations(code: string): string {
  let result = '';
  let i = 0;
  while (i < code.length) {
    if (code[i] === '}' || code[i] === ']') {
      const closingChar = code[i];
      result += closingChar;
      i++;
      let j = i;
      while (j < code.length && (code[j] === ' ' || code[j] === '\t')) j++;
      if (j < code.length && code[j] === ':') {
        let k = j + 1;
        while (k < code.length && (code[k] === ' ' || code[k] === '\t')) k++;
        if (k < code.length && (code[k] === '{' || code[k] === '[')) {
          const openBrace = code[k]; const closeBrace = openBrace === '{' ? '}' : ']';
          let depth = 1; let m = k + 1;
          while (m < code.length && depth > 0) { if (code[m] === openBrace) depth++; if (code[m] === closeBrace) depth--; m++; }
          let n = m;
          while (n < code.length && (code[n] === ' ' || code[n] === '\t' || code[n] === '\n')) n++;
          if (n < code.length && (code[n] === ')' || code[n] === ',' || code[n] === '{' || (code[n] === '=' && n + 1 < code.length && code[n + 1] === '>'))) { i = m; continue; }
        } else if (k < code.length && /[A-Z]/.test(code[k])) {
          let m = k;
          while (m < code.length && /[\w.]/.test(code[m])) m++;
          if (m < code.length && code[m] === '<') { let gDepth = 1; m++; while (m < code.length && gDepth > 0) { if (code[m] === '<') gDepth++; if (code[m] === '>') gDepth--; m++; } }
          while (m + 1 < code.length && code[m] === '[' && code[m + 1] === ']') m += 2;
          let n = m;
          while (n < code.length && (code[n] === ' ' || code[n] === '\t' || code[n] === '\n')) n++;
          if (n < code.length && (code[n] === ')' || code[n] === ',' || code[n] === '{' || (code[n] === '=' && n + 1 < code.length && code[n + 1] === '>'))) { i = m; continue; }
        }
      }
      continue;
    }
    result += code[i];
    i++;
  }
  return result;
}

function stripTypeScript(code: string): string {
  let r = code;

  // ── Phase 1: Remove type-only imports ──
  r = r.replace(/^\s*import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\s*$/gm, '');
  r = r.replace(/^\s*import\s+type\s+\w+\s+from\s+['"][^'"]*['"];?\s*$/gm, '');
  r = r.replace(/(import\s*\{)([^}]*?)(\}\s*from)/g, (_, open, names, close) => {
    const cleaned = names.split(',').map((n: string) => n.trim()).filter((n: string) => n && !n.startsWith('type ')).join(', ');
    if (!cleaned) return '// removed type-only import';
    return `${open} ${cleaned} ${close}`;
  });

  // ── Phase 2: Remove block declarations (interface, type = {}, enum) ──
  r = removeBlockDeclarations(r);

  // ── Phase 3: Remove single-line type aliases ──
  r = r.replace(/^\s*(?:export\s+)?type\s+\w+\s*(?:<[^>]*>)?\s*=\s*[^;{]+;\s*$/gm, '');
  r = r.replace(/^\s*(?:export\s+)?(?:interface|type)\s+\w+\s*(?:<[^>]*>)?\s*(?:extends\s+\w+(?:<[^>]*>)?\s*)?;?\s*$/gm, '');

  // ── Phase 4: Remove declare statements ──
  r = r.replace(/^\s*declare\s+.+$/gm, '');

  // ── Phase 5: Strip generics from functions and hooks ──
  r = r.replace(/(function\s+\w+)\s*<[^>]*>/g, '$1');
  r = r.replace(/(useState|useRef|useCallback|useMemo|useContext|createContext|useReducer|useMutation|useQuery|useInfiniteQuery|forwardRef|memo|lazy|create|createStore|createWithEqualityFn)\s*<[^>]*>\s*(?=\()/g, '$1');
  r = r.replace(/(=\s*)<[^>]*>\s*\(/g, '$1(');
  // Fix malformed parameter generics: func(ref<HTMLElement>, ...) → func(ref, ...)
  r = r.replace(/([,(]\s*\w+)<[^>]+>(?=\s*[,):])/g, '$1');

  // ── Phase 6: Strip React.FC type annotation ──
  r = r.replace(/:\s*React\.FC(?:<[^>]*>)?/g, '');

  // ── Phase 7: Strip 'as' type casts ──
  r = r.replace(/\bas\s+keyof\s+typeof\s+\w+/g, '');
  r = r.replace(/\bas\s+typeof\s+\w+/g, '');
  r = r.replace(/\bas\s+const\b/g, '');
  r = r.replace(/\bas\s+(?:[a-zA-Z][\w.]*(?:<[^>]*>)?(?:\[\])*)(\s*\|\s*(?:[a-zA-Z][\w.]*(?:<[^>]*>)?(?:\[\])*))*(?![\w$])/g, '');

  // ── Phase 8: Strip 'satisfies' ──
  r = r.replace(/\bsatisfies\s+\w+(?:<[^>]*>)?/g, '');

  // ── Phase 9: Strip non-null assertions (but not !== or !=) ──
  r = r.replace(/(\w+)!(?!=)/g, '$1');

  // ── Phase 10: AGGRESSIVE type annotation stripping ──
  // This is the KEY change: instead of enumerating every possible type,
  // we use a generic approach that strips : <anything-that-looks-like-a-type>
  // from parameters, variables, and return types.

  // 10a: Strip return type annotations:  ) : Type {  →  ) {
  r = r.replace(/(\))\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[\w.]+(?:<[^>]*>)?(?:\[\])?)*\s*(?=[{=])/g, '$1 ');
  r = r.replace(/(\))\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[\w.]+(?:<[^>]*>)?(?:\[\])?)*\s*(?==>)/g, '$1 ');

  // 10b: Strip function type params:  handler: () => void  →  handler
  //   Also handles:  cb: (e: Event) => void  →  cb
  r = r.replace(/([,(]\s*\w+)\s*:\s*\([^)]*\)\s*=>\s*[\w.]+(?:<[^>]*>)?(?:\[\])?\s*(?=[,)])/g, '$1');

  // 10c: Strip variable type annotations: const x: Type = → const x =
  //   Generic approach: match const/let/var <name> : <type-expression> =
  r = r.replace(/((?:export\s+)?(?:const|let|var)\s+\w+)\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[\w.]+(?:<[^>]*>)?(?:\[\])?)*\s*(?==)/g, '$1 ');

  // 10d: Strip rest parameter annotations: ...args: string[] → ...args
  r = r.replace(/(\.\.\.[a-zA-Z_$]\w*)\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])*/g, '$1');

  // 10e: Strip parameter type annotations — SAFE VERSION
  //   Only strip known TypeScript type keywords to avoid corrupting object literals.
  //   { value: 50000, icon: Component } must NOT be touched.
  //   Only { param: string, param: number } etc. are stripped.
  r = r.replace(/([,(]\s*)(\w+)\s*:\s*(?:string|number|boolean|void|never|any|unknown|null|undefined|object|symbol|bigint)(?:\[\])?\s*(?=[,)])/g, '$1$2');
  // Also strip when type starts with uppercase AND is preceded by a function-like opening paren context
  // This catches (param: ReactNode, param: HTMLElement) but not { key: ComponentName }
  r = r.replace(/(\(\s*(?:\w+\s*,\s*)*)(\w+)\s*:\s*[A-Z][\w.]*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[A-Z][\w.]*(?:<[^>]*>)?(?:\[\])?)*\s*(?=[,)])/g, '$1$2');

  // 10f: Strip destructured parameter type annotations: } : { ... } or } : TypeName
  r = stripDestructuredTypeAnnotations(r);

  return r;
}

// ═══════════════════════════════════════════════════════════════════
// VALID HTML ELEMENTS
// ═══════════════════════════════════════════════════════════════════

const HTML_ELEMENTS = new Set([
  'a','abbr','address','area','article','aside','audio','b','base','bdi','bdo','blockquote',
  'body','br','button','canvas','caption','cite','code','col','colgroup','data','datalist',
  'dd','del','details','dfn','dialog','div','dl','dt','em','embed','fieldset','figcaption',
  'figure','footer','form','h1','h2','h3','h4','h5','h6','head','header','hgroup','hr',
  'html','i','iframe','img','input','ins','kbd','label','legend','li','link','main','map',
  'mark','menu','meta','meter','nav','noscript','object','ol','optgroup','option','output',
  'p','param','picture','pre','progress','q','rp','rt','ruby','s','samp','script','search',
  'section','select','slot','small','source','span','strong','style','sub','summary','sup',
  'table','tbody','td','template','textarea','tfoot','th','thead','time','title','tr','track',
  'u','ul','var','video','wbr',
  'svg','path','circle','rect','line','polyline','polygon','ellipse','g','defs','clipPath',
  'mask','pattern','image','text','tspan','textPath','use','symbol','marker','linearGradient',
  'radialGradient','stop','filter','feBlend','feColorMatrix','feComponentTransfer',
  'feComposite','feConvolveMatrix','feDiffuseLighting','feDisplacementMap','feFlood',
  'feGaussianBlur','feImage','feMerge','feMergeNode','feMorphology','feOffset',
  'feSpecularLighting','feTile','feTurbulence','animate','animateMotion','animateTransform','set',
]);

// Serialized for injection into iframe execution script
const HTML_ELEMENTS_JS = 'new Set(' + JSON.stringify(Array.from(HTML_ELEMENTS)) + ')';

function repairJSXComponentAccess(code: string): { code: string; repairs: string[] } {
  const repairs: string[] = [];
  let result = code;

  // ── Phase 1: Repair member-expression JSX tags like <item.icon /> ──
  const memberJSXRegex = /<([a-zA-Z_$][\w$]*)\.([a-zA-Z_$][\w$]*)(?=[\s>\/>])/g;
  const foundMembers = new Map<string, { obj: string; prop: string }>();
  let match;
  while ((match = memberJSXRegex.exec(result)) !== null) {
    const key = `${match[1]}.${match[2]}`;
    if (!foundMembers.has(key)) foundMembers.set(key, { obj: match[1], prop: match[2] });
  }
  for (const [expr, { obj, prop }] of foundMembers) {
    const safeName = '__Dyn' + prop.charAt(0).toUpperCase() + prop.slice(1);
    const escObj = obj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escProp = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const openTagRe = new RegExp(`<${escObj}\\.${escProp}(?=[\\s>\\/>])`, 'g');
    const closeTagRe = new RegExp(`</${escObj}\\.${escProp}>`, 'g');
    if (!openTagRe.test(result)) continue;
    openTagRe.lastIndex = 0;
    const helperLine = `var ${safeName} = function __dynAccessor(__props) { var __C = (typeof ${obj} !== 'undefined' && ${obj}) ? (${obj}['${prop}'] || ${obj}.${prop}) : null; return __C ? React.createElement(__C, __props) : React.createElement('span', __props); };\n`;
    result = helperLine + result;
    result = result.replace(openTagRe, `<${safeName}`);
    result = result.replace(closeTagRe, `</${safeName}>`);
    repairs.push(`Extracted <${expr} /> to ${safeName} (file-level accessor)`);
  }

  // ── Phase 2: Detect non-HTML lowercase JSX tags (diagnostic only) ──
  // Lowercase non-HTML tags like <icon /> are handled by the POST-BABEL-COMPILE
  // fix in buildExecutionScript. Babel compiles <icon /> to React.createElement("icon", ...)
  // and the post-compile pass converts the string "icon" to a safe variable reference.
  // IMPORTANT: We do NOT inject file-level wrappers here because the variable (e.g. `icon`)
  // may only exist in a scoped context (.map() callback, function params) and a file-level
  // wrapper would cause ReferenceError by trying to access scoped variables at file level.
  const lowercaseJSXRegex = /<([a-z][a-zA-Z0-9]*)(?=[\s>\/>])/g;
  let lcMatch;
  while ((lcMatch = lowercaseJSXRegex.exec(result)) !== null) {
    const tagName = lcMatch[1];
    if (!HTML_ELEMENTS.has(tagName) && tagName.length > 1) {
      repairs.push(`Detected non-HTML <${tagName} /> — will be fixed post-Babel-compile`);
    }
  }

  return { code: result, repairs };
}

function extractAllCSS(files: ProjectFile[]): string {
  return files.filter((f) => f.path.endsWith('.css')).map((f) => `/* ${f.path} */\n${f.content}`).join('\n\n');
}

// ═══════════════════════════════════════════════════════════════════
// SAFE STRING ESCAPING
// ═══════════════════════════════════════════════════════════════════

function safeStringContent(s: string): string { const jsonStr = JSON.stringify(s); return jsonStr.slice(1, -1); }
function escapeForHTMLScript(s: string): string { return s.replace(/<\//g, '\\u003C/'); }
function escapeForInlineScript(s: string): string { return s.replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/<\//g, "<\\/"); }

// ═══════════════════════════════════════════════════════════════════
// IMPORT REWRITING
// ═══════════════════════════════════════════════════════════════════

function importAliasToDestructure(name: string): string {
  if (name.includes(' as ')) { const [orig, alias] = name.split(/\s+as\s+/); return `${orig.trim()}: ${alias.trim()}`; }
  return name;
}
function importLocalName(name: string): string {
  if (name.includes(' as ')) return name.split(/\s+as\s+/)[1].trim();
  return name.trim();
}

function rewriteImports(code: string, filePath: string, fileSet: Set<string>): { code: string; resolvedDeps: string[]; unresolvedDeps: string[] } {
  const resolvedDeps: string[] = [];
  const unresolvedDeps: string[] = [];
  const fromDir = getFileDir(filePath);
  let result = code;
  result = result.replace(/;\s*(?=import\s)/g, ';\n');
  result = result.replace(/(from\s+['"][^'"]+['"]\s*;)\s*(?=[a-zA-Z_$({])/g, '$1\n');
  result = result.replace(/(;)\s*(?=(?:const|let|var|function|class)\s)/g, '$1\n');
  result = result.replace(/^\s*import\s+['"][^'"]+\.(?:css|scss|less|png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot)['"];?\s*$/gm, '');
  result = result.replace(/import\s+React\s*,?\s*(?:\{([^}]*)\})?\s+from\s+['"]react['"];?/g, (_, named) => { if (!named) return ''; const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.length > 0 ? `const { ${names.map(importAliasToDestructure).join(', ')} } = React;` : ''; });
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.length > 0 ? `const { ${names.map(importAliasToDestructure).join(', ')} } = React;` : ''; });
  result = result.replace(/import\s+React\s+from\s+['"]react['"];?/g, '');
  result = result.replace(/import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g, '');
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react-dom(?:\/client)?['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return `const { ${names.map(importAliasToDestructure).join(', ')} } = ReactDOM;`; });
  result = result.replace(/import\s+ReactDOM\s+from\s+['"]react-dom(?:\/client)?['"];?/g, '');
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]react-router-dom['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return `const { ${names.map(importAliasToDestructure).join(', ')} } = window.__PreviewRouter;`; });
  result = result.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.map((n) => { const origName = n.includes(' as ') ? n.split(/\s+as\s+/)[0].trim() : n; const localName = importLocalName(n); return `const ${localName} = __lucideIcon('${safeStringContent(origName)}');`; }).join('\n'); });
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]sonner['"];?/g, 'const toast = { success: function(m){console.log("[toast]",m)}, error: function(m){console.error("[toast]",m)}, info: function(m){console.log("[toast]",m)}, warning: function(m){console.warn("[toast]",m)}, loading: function(m){console.log("[toast]",m)}, dismiss: function(){} }; const Toaster = function(){return null;};');
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]zustand['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.map((n) => { const localName = importLocalName(n); return `const ${localName} = window.__zustandCreate || function(fn){var s={};var set=function(p){Object.assign(s,typeof p==='function'?p(s):p);};s=fn(set,function(){return s;},{setState:set,getState:function(){return s;},subscribe:function(){return function(){};}});var h=function(sel){return sel?sel(s):s;};h.getState=function(){return s;};h.setState=set;h.subscribe=function(){return function(){};};return h;};`; }).join('\n'); });
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]framer-motion['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.map((n) => { const origName = n.includes(' as ') ? n.split(/\s+as\s+/)[0].trim() : n; const localName = importLocalName(n); if (origName === 'motion') return `const ${localName} = new Proxy({}, { get: function(_, tag) { return function(props) { var p = Object.assign({}, props); delete p.initial; delete p.animate; delete p.exit; delete p.transition; delete p.whileHover; delete p.whileTap; delete p.whileInView; delete p.variants; return React.createElement(tag, p); }; } });`; if (origName === 'AnimatePresence') return `const ${localName} = function(props) { return props.children || null; };`; return `const ${localName} = function() { return {}; };`; }).join('\n'); });
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"](?:clsx|tailwind-merge|class-variance-authority)['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.map((n) => { const origName = n.includes(' as ') ? n.split(/\s+as\s+/)[0].trim() : n; const localName = importLocalName(n); if (origName === 'cn' || origName === 'clsx' || origName === 'twMerge') return `const ${localName} = function() { return Array.from(arguments).flat(Infinity).filter(Boolean).join(' '); };`; if (origName === 'cva') return `const ${localName} = function(base) { return function() { return base; }; };`; return `const ${localName} = function() { return ''; };`; }).join('\n'); });
  result = result.replace(/import\s+\{([^}]*)\}\s+from\s+['"]@supabase\/supabase-js['"];?/g, (_, named) => { const names = named.split(',').map((n: string) => n.trim()).filter(Boolean); return names.map((n) => { const origName = n.includes(' as ') ? n.split(/\s+as\s+/)[0].trim() : n; const localName = importLocalName(n); if (origName === 'createClient') return `const ${localName} = function() { return { from: function(){ return { select: function(){ return { data: [], error: null, eq: function(){ return { data: [], error: null }; }, order: function(){ return { data: [], error: null }; }, single: function(){ return { data: null, error: null }; } }; }, insert: function(){ return { data: null, error: null }; }, update: function(){ return { data: null, error: null }; }, delete: function(){ return { data: null, error: null }; }, eq: function(){ return { data: [], error: null }; } }; }, auth: { getSession: function(){ return Promise.resolve({ data: { session: null } }); }, onAuthStateChange: function(){ return { data: { subscription: { unsubscribe: function(){} } } }; }, signInWithPassword: function(){ return Promise.resolve({ data: null, error: { message: 'Preview mode' } }); } }, storage: { from: function(){ return { upload: function(){ return { data: null, error: null }; }, getPublicUrl: function(){ return { data: { publicUrl: '' } }; } }; } } }; };`; return `const ${localName} = undefined;`; }).join('\n'); });

  function resolveInternalImport(specifier: string, defaultImport: string | null, namedStr: string | null): string {
    const resolvedPath = resolveFilePath(specifier, fromDir, fileSet);
    if (resolvedPath) {
      resolvedDeps.push(resolvedPath); const mVar = moduleVar(resolvedPath); const parts: string[] = [];
      if (defaultImport) parts.push(`var ${defaultImport} = ${mVar} && (${mVar}['default'] || ${mVar});`);
      if (namedStr) { const names = namedStr.split(',').map((n: string) => n.trim()).filter(Boolean); for (const n of names) { if (n.includes(' as ')) { const [orig, alias] = n.split(/\s+as\s+/); parts.push(`var ${alias.trim()} = (${mVar} || {})['${safeStringContent(orig.trim())}'];`); } else { parts.push(`var ${n} = (${mVar} || {})['${safeStringContent(n)}'];`); } } }
      if (!defaultImport && !namedStr) return `// side-effect: ${specifier}`;
      return parts.join('\n');
    } else {
      unresolvedDeps.push(specifier); const parts: string[] = [`/* UNRESOLVED: ${specifier} */`];
      if (defaultImport) parts.push(`var ${defaultImport} = function(props) { return React.createElement('div', Object.assign({ style: { padding: '8px', border: '1px dashed #666', borderRadius: '6px', fontSize: '11px', color: '#999', fontFamily: 'monospace' } }, props), '[${safeStringContent(defaultImport)}]'); };`);
      if (namedStr) { const names = namedStr.split(',').map((n: string) => n.trim()).filter(Boolean); for (const n of names) { const cleanName = n.includes(' as ') ? n.split(/\s+as\s+/)[1].trim() : n; if (/^[A-Z]/.test(cleanName)) parts.push(`var ${cleanName} = function(props) { return React.createElement('div', Object.assign({ style: { padding: '8px', border: '1px dashed #666', borderRadius: '6px', fontSize: '11px', color: '#999', fontFamily: 'monospace' } }, props), '[${safeStringContent(cleanName)}]'); };`); else if (/^use[A-Z]/.test(cleanName)) parts.push(`var ${cleanName} = function() { return {}; };`); else parts.push(`var ${cleanName} = undefined;`); } }
      return parts.join('\n');
    }
  }

  function resolveExternalImport(specifier: string, defaultImport: string | null, namedStr: string | null): string {
    const resolvedPath = resolveFilePath(specifier, fromDir, fileSet);
    if (resolvedPath) { resolvedDeps.push(resolvedPath); const mVar = moduleVar(resolvedPath); const parts: string[] = []; if (defaultImport) parts.push(`var ${defaultImport} = ${mVar} && (${mVar}['default'] || ${mVar});`); if (namedStr) { const names = namedStr.split(',').map((n: string) => n.trim()).filter(Boolean); for (const n of names) parts.push(`var ${n} = (${mVar} || {})['${safeStringContent(n)}'];`); } return parts.join('\n') || `// resolved side-effect: ${specifier}`; }
    unresolvedDeps.push(specifier); const parts: string[] = [`/* EXTERNAL STUB: ${specifier} */`];
    if (defaultImport) { if (/^[A-Z]/.test(defaultImport)) parts.push(`var ${defaultImport} = function(props) { return React.createElement('span', props, ''); };`); else parts.push(`var ${defaultImport} = {};`); }
    if (namedStr) { const names = namedStr.split(',').map((n: string) => n.trim()).filter(Boolean); for (const n of names) { const cleanName = n.includes(' as ') ? n.split(/\s+as\s+/)[1].trim() : n; if (/^[A-Z]/.test(cleanName)) parts.push(`var ${cleanName} = function(props) { return React.createElement('span', props, ''); };`); else if (/^use[A-Z]/.test(cleanName)) parts.push(`var ${cleanName} = function() { return {}; };`); else if (cleanName === 'cn') parts.push(`var cn = function() { return Array.from(arguments).flat(Infinity).filter(Boolean).join(' '); };`); else parts.push(`var ${cleanName} = undefined;`); } }
    return parts.join('\n');
  }

  const INTERNAL_SPEC = `['"](\.\.\/[^'"]+|\.\/[^'"]+|@\/[^'"]+)['"]`;
  const ANY_SPEC = `['"]([^'"]+)['"]`;
  result = result.replace(new RegExp(`^\\s*import\\s+(\\w+)\\s*,\\s*\\{([^}]+)\\}\\s+from\\s+${INTERNAL_SPEC}\\s*;?\\s*$`, 'gm'), (_, def, named, spec) => resolveInternalImport(spec, def, named));
  result = result.replace(new RegExp(`^\\s*import\\s+\\{([^}]+)\\}\\s+from\\s+${INTERNAL_SPEC}\\s*;?\\s*$`, 'gm'), (_, named, spec) => resolveInternalImport(spec, null, named));
  result = result.replace(new RegExp(`^\\s*import\\s+(\\w+)\\s+from\\s+${INTERNAL_SPEC}\\s*;?\\s*$`, 'gm'), (_, def, spec) => resolveInternalImport(spec, def, null));
  result = result.replace(new RegExp(`^\\s*import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s+${INTERNAL_SPEC}\\s*;?\\s*$`, 'gm'), (_, name, spec) => resolveInternalImport(spec, name, null));
  result = result.replace(new RegExp(`^\\s*import\\s+${INTERNAL_SPEC}\\s*;?\\s*$`, 'gm'), (_, spec) => resolveInternalImport(spec, null, null));
  result = result.replace(new RegExp(`^\\s*import\\s+(\\w+)\\s*,\\s*\\{([^}]+)\\}\\s+from\\s+${ANY_SPEC}\\s*;?\\s*$`, 'gm'), (_, def, named, spec) => resolveExternalImport(spec, def, named));
  result = result.replace(new RegExp(`^\\s*import\\s+\\{([^}]+)\\}\\s+from\\s+${ANY_SPEC}\\s*;?\\s*$`, 'gm'), (_, named, spec) => resolveExternalImport(spec, null, named));
  result = result.replace(new RegExp(`^\\s*import\\s+(\\w+)\\s+from\\s+${ANY_SPEC}\\s*;?\\s*$`, 'gm'), (_, def, spec) => resolveExternalImport(spec, def, null));
  result = result.replace(new RegExp(`^\\s*import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s+${ANY_SPEC}\\s*;?\\s*$`, 'gm'), (_, name, spec) => resolveExternalImport(spec, name, null));
  result = result.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, '');
  result = result.replace(/^\s*import\s+(?:(?:\{[^}]*\}|\w+|\*\s+as\s+\w+)\s*,?\s*)*(?:from\s+)?['"][^'"]*['"]\s*;?\s*$/gm, (match) => { console.warn('[Import Safety] Unrewritten import removed:', match.trim().substring(0, 80)); return '/* [safety] unrewritten import removed */'; });
  return { code: result, resolvedDeps, unresolvedDeps };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT REWRITING
// ═══════════════════════════════════════════════════════════════════

function rewriteExports(code: string, filePath: string): string {
  let r = code;
  const fileName = filePath.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
  const hadExportDefault = /export\s+default\s+/.test(r);
  const hadNamedExports = /export\s+\{/.test(r);
  const hadExportDecl = /export\s+(const|let|var|function|class)\s+/.test(r);
  r = r.replace(/export\s+default\s+function\s+(\w+)/g, 'function $1');
  r = r.replace(/export\s+default\s+class\s+(\w+)/g, 'class $1');
  r = r.replace(/export\s+default\s+/g, 'var __default__ = ');
  r = r.replace(/export\s+\{([^}]*)\};?/g, (_, names) => names.split(',').map((n: string) => { const trimmed = n.trim(); if (!trimmed) return ''; if (trimmed.includes(' as ')) { const [orig, alias] = trimmed.split(/\s+as\s+/); return `exports['${safeStringContent(alias.trim())}'] = typeof ${orig.trim()} !== 'undefined' ? ${orig.trim()} : undefined;`; } return `exports['${safeStringContent(trimmed)}'] = typeof ${trimmed} !== 'undefined' ? ${trimmed} : undefined;`; }).filter(Boolean).join('\n'));
  const exportedDeclNames: string[] = [];
  r = r.replace(/export\s+(const|let|var|function|class)\s+(\w+)/g, (_, keyword, name) => { exportedDeclNames.push(name); return `${keyword} ${name}`; });
  if (hadExportDefault) r += `\nif (typeof __default__ !== 'undefined') exports['default'] = __default__;`;
  for (const eName of exportedDeclNames) r += `\ntry { if (typeof ${eName} !== 'undefined') exports['${safeStringContent(eName)}'] = ${eName}; } catch(__e) {}`;
  if (hadExportDefault || hadNamedExports || hadExportDecl) r += `\ntry { if (!exports['default'] && typeof ${fileName} === 'function') exports['default'] = ${fileName}; } catch(__e) {}`;
  return r;
}

// ═══════════════════════════════════════════════════════════════════
// VALIDATION + AUTO-REPAIR
// ═══════════════════════════════════════════════════════════════════

interface ValidationIssue { line: number; issue: string; severity: 'error' | 'warning'; autoRepaired: boolean; }

function validateProcessedCode(code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = []; const lines = code.split('\n');
  for (let i = 0; i < lines.length; i++) { const line = lines[i]; const lineNum = i + 1;
    if (/^\s*var\s+from\s+['"]/.test(line)) issues.push({ line: lineNum, issue: "Broken import rewrite: var from '...'", severity: 'error', autoRepaired: false });
    if (/^\s*import\s+\w+\s*=\s*\(/.test(line)) issues.push({ line: lineNum, issue: 'Malformed import assignment', severity: 'error', autoRepaired: false });
    if (/^\s*export\s*$/.test(line)) issues.push({ line: lineNum, issue: 'Orphaned export keyword', severity: 'error', autoRepaired: false });
    if (/^\s*import\s+.*from\s+['"](\.\.\/|\.\/)/.test(line)) issues.push({ line: lineNum, issue: 'Unrewritten internal import statement', severity: 'warning', autoRepaired: false });
    if (/<[a-zA-Z_$][\w$]*\.[a-zA-Z_$][\w$]*[\s>]/.test(line) && !line.includes('__Dyn')) issues.push({ line: lineNum, issue: 'Property-access JSX tag', severity: 'warning', autoRepaired: false });
    if (/^\s*export\s+=/.test(line)) issues.push({ line: lineNum, issue: 'Invalid export assignment syntax', severity: 'error', autoRepaired: false });
  }
  let braceDepth = 0, parenDepth = 0, bracketDepth = 0;
  for (const ch of code) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; if (ch === '(') parenDepth++; if (ch === ')') parenDepth--; if (ch === '[') bracketDepth++; if (ch === ']') bracketDepth--; }
  if (braceDepth > 0) issues.push({ line: 0, issue: `Unbalanced braces: ${braceDepth} unclosed`, severity: 'error', autoRepaired: false });
  if (braceDepth < 0) issues.push({ line: 0, issue: `Unbalanced braces: ${Math.abs(braceDepth)} extra closing`, severity: 'error', autoRepaired: false });
  if (parenDepth !== 0) issues.push({ line: 0, issue: `Unbalanced parentheses (depth: ${parenDepth})`, severity: 'warning', autoRepaired: false });
  if (bracketDepth !== 0) issues.push({ line: 0, issue: `Unbalanced brackets (depth: ${bracketDepth})`, severity: 'warning', autoRepaired: false });
  return issues;
}

function repairProcessedCode(code: string): { code: string; repairs: string[] } {
  const repairs: string[] = []; const lines = code.split('\n'); const repairedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) { const line = lines[i];
    if (/^\s*var\s+from\s+['"]/.test(line)) { repairedLines.push(`/* [auto-repair] removed broken import */`); repairs.push(`Line ${i+1}: removed broken 'var from' import`); continue; }
    if (/^\s*import\s+\w+\s*=\s*\(/.test(line)) { repairedLines.push(`/* [auto-repair] removed malformed import */`); repairs.push(`Line ${i+1}: removed malformed import`); continue; }
    if (/^\s*export\s*$/.test(line)) { repairedLines.push('/* [auto-repair] removed orphaned export */'); repairs.push(`Line ${i+1}: removed orphaned export`); continue; }
    if (/^\s*export\s+=/.test(line)) { repairedLines.push(`/* [auto-repair] removed invalid export */`); repairs.push(`Line ${i+1}: removed invalid export`); continue; }
    if (/^\s*import\s*;?\s*$/.test(line)) { repairedLines.push('/* [auto-repair] removed empty import */'); repairs.push(`Line ${i+1}: removed empty import`); continue; }
    repairedLines.push(line);
  }
  let result = repairedLines.join('\n');
  let braceDepth = 0; for (const ch of result) { if (ch === '{') braceDepth++; if (ch === '}') braceDepth--; }
  if (braceDepth > 0) { for (let b = 0; b < braceDepth; b++) result += '\n}'; repairs.push(`Appended ${braceDepth} closing brace(s)`); }
  return { code: result, repairs };
}

// ═══════════════════════════════════════════════════════════════════
// DIAGNOSTIC SCAN
// ═══════════════════════════════════════════════════════════════════

interface DiagnosticIssue { file: string; line: number; issue: string; snippet: string; severity: 'error' | 'warning'; phase: string; }

function runDiagnosticScan(registry: Map<string, ModuleRecord>): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];
  for (const [filePath, mod] of registry) { const lines = mod.processedSource.split('\n');
    for (let i = 0; i < lines.length; i++) { const line = lines[i]; const lineNum = i + 1;
      const backtickCount = (line.match(/(?<!\\)`/g) || []).length;
      if (backtickCount % 2 !== 0) { const nextLine = lines[i+1]; const prevLine = lines[i-1]; if (nextLine === undefined && prevLine === undefined) issues.push({ file: filePath, line: lineNum, issue: 'Possible unterminated template literal', snippet: line.substring(0, 120), severity: 'warning', phase: 'processed' }); }
      const regexpNewMatch = line.match(/new\s+RegExp\(\s*['"]([^'"]*)['"]/); if (regexpNewMatch) { try { new RegExp(regexpNewMatch[1]); } catch (e: unknown) { const msg = e instanceof Error ? e.message : String(e); issues.push({ file: filePath, line: lineNum, issue: `Malformed RegExp: ${msg}`, snippet: line.substring(0, 120), severity: 'error', phase: 'processed' }); } }
      const stripped = line.replace(/\\['"\\/]/g, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '').replace(/`[^`]*`/g, '');
      if ((stripped.match(/'/g) || []).length % 2 !== 0) issues.push({ file: filePath, line: lineNum, issue: 'Possible unterminated string (single quote)', snippet: line.substring(0, 120), severity: 'warning', phase: 'processed' });
      if ((stripped.match(/"/g) || []).length % 2 !== 0) issues.push({ file: filePath, line: lineNum, issue: 'Possible unterminated string (double quote)', snippet: line.substring(0, 120), severity: 'warning', phase: 'processed' });
    }
  }
  return issues;
}

// ═══════════════════════════════════════════════════════════════════
// DEPENDENCY GRAPH + TOPOLOGICAL SORT
// ═══════════════════════════════════════════════════════════════════

function topologicalSort(registry: Map<string, ModuleRecord>): string[] {
  const visited = new Set<string>(); const inStack = new Set<string>(); const result: string[] = [];
  function visit(path: string) { if (visited.has(path)) return; if (inStack.has(path)) { console.warn(`[Topological Sort] Circular dependency: ${path}`); return; } inStack.add(path); const mod = registry.get(path); if (mod) { for (const dep of mod.resolvedDeps) { if (registry.has(dep)) visit(dep); } } inStack.delete(path); visited.add(path); result.push(path); }
  for (const path of Array.from(registry.keys())) visit(path);
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// BUILD MODULE REGISTRY
// ═══════════════════════════════════════════════════════════════════

function buildRegistry(files: ProjectFile[]): Map<string, ModuleRecord> {
  const registry = new Map<string, ModuleRecord>();
  const fileSet = new Set(files.map((f) => f.path));
  const jsFiles = files.filter((f) => /\.(tsx|ts|jsx|js)$/.test(f.path) && !f.path.endsWith('.d.ts') && !f.path.endsWith('main.tsx') && !f.path.endsWith('main.ts') && !f.path.endsWith('main.jsx') && !f.path.endsWith('main.js'));
  for (const file of jsFiles) {
    let processed = stripTypeScript(file.content);
    const { code: rewritten, resolvedDeps, unresolvedDeps } = rewriteImports(processed, file.path, fileSet);
    const { code: jsxRepaired, repairs: jsxRepairs } = repairJSXComponentAccess(rewritten);
    if (jsxRepairs.length > 0) console.log(`[Registry] JSX repairs in ${file.path}: ${jsxRepairs.join('; ')}`);
    processed = rewriteExports(jsxRepaired, file.path);
    const issues = validateProcessedCode(processed);
    const hasErrors = issues.some((i) => i.severity === 'error');
    if (hasErrors) {
      const { code: repaired, repairs } = repairProcessedCode(processed);
      if (repairs.length > 0) { console.log(`[Registry] Auto-repaired ${file.path}: ${repairs.length} fix(es)`); for (const r of repairs) console.log(`  [repair] ${r}`); }
      processed = repaired;
      const postRepairIssues = validateProcessedCode(processed);
      if (postRepairIssues.some((i) => i.severity === 'error')) {
        const errSummary = postRepairIssues.filter((i) => i.severity === 'error').map((i) => `L${i.line}: ${i.issue}`).join('; ');
        console.error(`[Registry] ${file.path} still has errors: ${errSummary}`);
        registry.set(file.path, { filePath: file.path, rawSource: file.content, processedSource: processed, transpiledSource: '', resolvedDeps, unresolvedDeps, compileStatus: 'syntax-error', compileError: `Pre-compile validation failed: ${errSummary}`, compileErrorLine: postRepairIssues[0]?.line || null, compileErrorColumn: null, errorPhase: 'pre-compile-validation' });
        continue;
      }
    }
    registry.set(file.path, { filePath: file.path, rawSource: file.content, processedSource: processed, transpiledSource: '', resolvedDeps, unresolvedDeps, compileStatus: 'pending', compileError: null, compileErrorLine: null, compileErrorColumn: null, errorPhase: null });
  }
  return registry;
}

// ═══════════════════════════════════════════════════════════════════
// SHIMS — ONLY string concatenation, no backticks
// ═══════════════════════════════════════════════════════════════════

const ROUTER_SHIM = ['(function() {','  var _currentPath = "/";','  var _listeners = [];','  function _notify() { for (var i = 0; i < _listeners.length; i++) _listeners[i](); }','  function _navigate(to) {','    if (typeof to === "number") return;','    var path = typeof to === "string" ? to : (to && to.pathname ? to.pathname : "/");','    if (path !== _currentPath) { _currentPath = path; _notify(); }','  }','  function _getLocation() { return { pathname: _currentPath, search: "", hash: "", state: null, key: "preview" }; }','','  var _NavCtx = React.createContext(_navigate);','  var _LocCtx = React.createContext(_getLocation());','  var _ParCtx = React.createContext({});','','  function _RouterShell(props) { var _s = React.useState(0); var forceUpdate = _s[1]; React.useEffect(function() { var fn = function() { forceUpdate(function(c) { return c + 1; }); }; _listeners.push(fn); return function() { _listeners = _listeners.filter(function(f) { return f !== fn; }); }; }, []); return React.createElement(_NavCtx.Provider, { value: _navigate }, React.createElement(_LocCtx.Provider, { value: _getLocation() }, props.children)); }','','  function _Routes(props) { var children = React.Children.toArray(props.children); var loc = React.useContext(_LocCtx); var path = loc.pathname; var match = null; var catchAll = null; for (var i = 0; i < children.length; i++) { var child = children[i]; if (!child || !child.props) continue; var rp = child.props.path; if (rp === "*") { catchAll = child; continue; } if (rp === path || rp === path + "/" || (rp === "/" && path === "/")) { match = child; break; } } if (!match && children.length > 0) match = children[0]; if (!match) match = catchAll; if (!match) return null; var element = match.props.element || null; if (match.props.children) { return React.createElement(React.Fragment, null, element, React.createElement(_Routes, null, match.props.children)); } return element; }','','  function _Route() { return null; }','  function _Link(props) { var to = props.to || "#"; var href = typeof to === "string" ? to : (to.pathname || "#"); return React.createElement("a", { href: href, className: props.className || "", style: props.style, onClick: function(e) { e.preventDefault(); _navigate(to); if (props.onClick) props.onClick(e); } }, props.children); }','  function _NavLink(props) { var to = typeof props.to === "string" ? props.to : (props.to && props.to.pathname || "/"); var loc = React.useContext(_LocCtx); var isActive = loc.pathname === to; var cn = typeof props.className === "function" ? props.className({ isActive: isActive, isPending: false }) : (props.className || "") + (isActive ? " active" : ""); var st = typeof props.style === "function" ? props.style({ isActive: isActive, isPending: false }) : props.style; return React.createElement(_Link, Object.assign({}, props, { className: cn, style: st })); }','  function _Navigate(props) { React.useEffect(function() { _navigate(props.to); }, []); return null; }','  function _Outlet() { return null; }','  function _useNavigate() { return React.useContext(_NavCtx); }','  function _useLocation() { return React.useContext(_LocCtx); }','  function _useParams() { return React.useContext(_ParCtx); }','  function _useSearchParams() { return [new URLSearchParams(""), function() {}]; }','  function _useMatch() { return null; }','','  window.__PreviewRouter = { BrowserRouter: _RouterShell, HashRouter: _RouterShell, MemoryRouter: _RouterShell, Routes: _Routes, Route: _Route, Link: _Link, NavLink: _NavLink, Navigate: _Navigate, Outlet: _Outlet, useNavigate: _useNavigate, useLocation: _useLocation, useParams: _useParams, useSearchParams: _useSearchParams, useMatch: _useMatch, useRoutes: function() { return null; }, createBrowserRouter: function() { return {}; }, createMemoryRouter: function() { return {}; }, RouterProvider: function(p) { return p.children || null; } };','  window.ReactRouterDOM = window.__PreviewRouter;','  console.log("[Preview] React Router DOM shim loaded");','})();'].join('\n');

const LUCIDE_FACTORY = ['window.__lucideIcon = function(name) {','  var kebab = name.replace(/([a-z0-9])([A-Z])/g,"$1-$2").replace(/([a-zA-Z])(\\d)/g,"$1-$2").toLowerCase();','  return function LucideIcon(props) {','    var sz = props && props.size || 24;','    var svgProps = { xmlns:"http://www.w3.org/2000/svg", width:sz, height:sz, viewBox:"0 0 24 24", fill:"none", stroke:"currentColor", strokeWidth:props&&props.strokeWidth||2, strokeLinecap:"round", strokeLinejoin:"round", className:props&&props.className||"", style:props&&props.style, onClick:props&&props.onClick };','    var iconData = window.lucide && window.lucide.icons && window.lucide.icons[kebab];','    if (iconData) {','      var elems = Array.isArray(iconData[0]) ? iconData : (iconData[1] || []);','      if (Array.isArray(elems)) {','        var ch = [];','        for (var i=0;i<elems.length;i++) { if (Array.isArray(elems[i])&&elems[i].length>=2) { var a=Object.assign({key:"i"+i},elems[i][1]); if(a["stroke-width"]){a.strokeWidth=a["stroke-width"];delete a["stroke-width"];} if(a["stroke-linecap"]){a.strokeLinecap=a["stroke-linecap"];delete a["stroke-linecap"];} if(a["stroke-linejoin"]){a.strokeLinejoin=a["stroke-linejoin"];delete a["stroke-linejoin"];} if(a["fill-rule"]){a.fillRule=a["fill-rule"];delete a["fill-rule"];} if(a["clip-rule"]){a.clipRule=a["clip-rule"];delete a["clip-rule"];} ch.push(React.createElement(elems[i][0],a)); } }','        if(ch.length) return React.createElement("svg",svgProps,ch);','      }','    }','    return React.createElement("svg",svgProps, React.createElement("rect",{x:3,y:3,width:18,height:18,rx:2,opacity:0.2}), React.createElement("text",{x:12,y:16,textAnchor:"middle",fontSize:8,fill:"currentColor",opacity:0.5},kebab.charAt(0).toUpperCase()));','  };','};'].join('\n');

const CONSOLE_CAPTURE = ['(function(){','  var oL=console.log,oW=console.warn,oE=console.error,oI=console.info;','  function ser(a){return Array.prototype.map.call(a,function(x){if(x===null)return"null";if(x===undefined)return"undefined";if(typeof x==="object"){try{return JSON.stringify(x,null,2)}catch(e){return String(x)}}return String(x)}).join(" ")}','  function s(l,a){try{parent.postMessage({type:"preview-console",level:l,message:ser(a),timestamp:new Date().toISOString()},"*")}catch(e){}}','  console.log=function(){s("log",arguments);oL.apply(console,arguments)};','  console.warn=function(){s("warn",arguments);oW.apply(console,arguments)};','  console.error=function(){s("error",arguments);oE.apply(console,arguments)};','  console.info=function(){s("info",arguments);oI.apply(console,arguments)};','  window.onerror=function(m,src,l,c,e){s("error",["Runtime Error: "+m+(l?" (line "+l+")":"")]);return false};','  window.onunhandledrejection=function(ev){s("error",["Unhandled: "+(ev.reason?(ev.reason.message||ev.reason):"unknown")])};','})();'].join('\n');

const ERROR_BOUNDARY = ['class __ErrorBoundary extends React.Component {','  constructor(props) { super(props); this.state = { hasError: false, error: null }; }','  static getDerivedStateFromError(error) { return { hasError: true, error: error }; }','  componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); }','  render() {','    if (this.state.hasError) {','      return React.createElement("div", { style: { padding: "32px", fontFamily: "system-ui, sans-serif", background: "#0a0a0b", color: "#fff", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" } },','        React.createElement("div", { style: { maxWidth: "480px", textAlign: "center" } },','          React.createElement("h2", { style: { fontSize: "18px", fontWeight: "600", marginBottom: "12px" } }, "Something went wrong"),','          React.createElement("p", { style: { fontSize: "13px", color: "#f87171", fontFamily: "monospace", wordBreak: "break-word" } }, this.state.error && this.state.error.message || "Unknown error")));','    }','    return this.props.children;','  }','}'].join('\n');

function escapeHTML(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function buildDiagnosticHTML(phase: string, errorMsg: string, filePath?: string, suggestion?: string): string {
  const locationInfo = filePath ? 'File: ' + escapeHTML(filePath) : '';
  const fixBtnData = JSON.stringify({ phase, error: errorMsg, file: filePath || '' }).replace(/\"/g, '&quot;');
  const fixBtn = '<button onclick="try{parent.postMessage({type:&apos;preview-fix-errors&apos;,payload:JSON.parse(this.dataset.err)},&apos;*&apos;)}catch(e){}" data-err="' + fixBtnData + '" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(217,70,239,0.12));border:1px solid rgba(139,92,246,0.25);color:#c4b5fd;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;margin-top:16px;font-family:system-ui,sans-serif" onmouseover="this.style.background=&apos;linear-gradient(135deg,rgba(139,92,246,0.25),rgba(217,70,239,0.2))&apos;;this.style.color=&apos;#ddd6fe&apos;" onmouseout="this.style.background=&apos;linear-gradient(135deg,rgba(139,92,246,0.15),rgba(217,70,239,0.12))&apos;;this.style.color=&apos;#c4b5fd&apos;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>Fix with AI</button>';
  return '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0a0b;font-family:system-ui,sans-serif;padding:24px;overflow-y:auto"><div style="max-width:600px;width:100%"><div style="display:flex;align-items:center;gap:12px;margin-bottom:24px"><div style="width:48px;height:48px;border-radius:14px;background:rgba(248,113,113,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div><h2 style="color:#fff;font-size:16px;font-weight:600;margin:0">Preview Error</h2><p style="color:#6b7280;font-size:12px;margin:4px 0 0">Phase: ' + escapeHTML(phase) + (locationInfo ? ' &middot; ' + locationInfo : '') + '</p></div></div><div style="background:rgba(248,113,113,0.04);border:1px solid rgba(248,113,113,0.12);border-radius:12px;padding:16px;margin-bottom:16px"><p style="color:#fca5a5;font-size:13px;margin:0;line-height:1.6;word-break:break-word;font-family:monospace">' + escapeHTML(errorMsg) + '</p></div>' + (suggestion ? '<div style="background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);border-radius:12px;padding:14px;margin-bottom:16px"><p style="color:#a78bfa;font-size:12px;margin:0;line-height:1.5">' + escapeHTML(suggestion) + '</p></div>' : '') + fixBtn + '</div></div>';
}

export function buildPlaceholderHTML(title: string, message: string): string {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;background:#0a0a0b;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif}</style></head><body><div style="text-align:center;max-width:400px;padding:32px"><div style="width:64px;height:64px;margin:0 auto 24px;border-radius:16px;background:rgba(139,92,246,0.1);display:flex;align-items:center;justify-content:center"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div><h2 style="color:#fff;font-size:18px;font-weight:600;margin:0 0 8px">' + escapeHTML(title) + '</h2><p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0">' + escapeHTML(message) + '</p></div></body></html>';
}

// ═══════════════════════════════════════════════════════════════════
// EXECUTION SCRIPT BUILDER
// ═══════════════════════════════════════════════════════════════════

function buildExecutionScript(registry: Map<string, ModuleRecord>, executionOrder: string[]): string {
  const lines: string[] = [];

  // Diagnostic panel builder
  lines.push('  function __buildScriptDiagHTML(phase, errorMsg, filePath, lineNum, codeExcerpt, suggestion) {');
  lines.push('    var h = "<div style=\\"position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0a0a0b;font-family:system-ui,sans-serif;padding:24px;overflow-y:auto\\"><div style=\\"max-width:640px;width:100%\\"><div style=\\"display:flex;align-items:center;gap:12px;margin-bottom:24px\\"><div style=\\"width:48px;height:48px;border-radius:14px;background:rgba(248,113,113,0.08);display:flex;align-items:center;justify-content:center;flex-shrink:0\\"><svg width=\\"24\\" height=\\"24\\" viewBox=\\"0 0 24 24\\" fill=\\"none\\" stroke=\\"#f87171\\" stroke-width=\\"2\\"><circle cx=\\"12\\" cy=\\"12\\" r=\\"10\\"/><line x1=\\"12\\" y1=\\"8\\" x2=\\"12\\" y2=\\"12\\"/><line x1=\\"12\\" y1=\\"16\\" x2=\\"12.01\\" y2=\\"16\\"/></svg></div><div><h2 style=\\"color:#fff;font-size:16px;font-weight:600;margin:0\\">Script Validation Failed</h2><p style=\\"color:#6b7280;font-size:12px;margin:4px 0 0\\">Phase: " + phase.replace(/</g,"&lt;") + (filePath ? " &middot; File: " + filePath.replace(/</g,"&lt;") : "") + (lineNum ? " &middot; Line: " + lineNum : "") + "</p></div></div><div style=\\"background:rgba(248,113,113,0.04);border:1px solid rgba(248,113,113,0.12);border-radius:12px;padding:16px;margin-bottom:16px\\"><p style=\\"color:#fca5a5;font-size:13px;margin:0;line-height:1.6;word-break:break-word;font-family:monospace\\">" + errorMsg.replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</p></div>";');
  lines.push('    if (codeExcerpt) h += "<details open style=\\"margin-bottom:16px\\"><summary style=\\"color:#6b7280;font-size:11px;cursor:pointer;margin-bottom:8px\\">Source Excerpt</summary><pre style=\\"color:#d4d4d8;font-size:11px;line-height:1.7;margin:0;padding:12px;background:#111;border-radius:10px;overflow:auto;max-height:240px;white-space:pre-wrap\\">" + codeExcerpt.replace(/</g,"&lt;").replace(/>/g,"&gt;") + "</pre></details>";');
  lines.push('    if (suggestion) h += "<div style=\\"background:rgba(139,92,246,0.04);border:1px solid rgba(139,92,246,0.12);border-radius:12px;padding:14px;margin-bottom:16px\\"><p style=\\"color:#a78bfa;font-size:12px;margin:0;line-height:1.5\\">" + suggestion.replace(/</g,"&lt;") + "</p></div>";');
  lines.push('    var payloadStr = JSON.stringify({ phase: phase, error: errorMsg, file: filePath || "", line: lineNum || null, excerpt: (codeExcerpt || "").substring(0, 500) });');
  lines.push('    h += "<button onclick=\\"try{parent.postMessage({type:\'preview-fix-errors\',payload:" + payloadStr.replace(/\\"/g, "\'") + "},\'*\')}catch(e){}\\" style=\\"display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(217,70,239,0.12));border:1px solid rgba(139,92,246,0.25);color:#c4b5fd;font-size:13px;font-weight:600;cursor:pointer;margin-top:16px;font-family:system-ui,sans-serif\\">Fix with AI</button>";');
  lines.push('    h += "</div></div>";');
  lines.push('    return h;');
  lines.push('  }');
  lines.push('');

  // Module data + HTML elements set for post-compile fix
  lines.push('  var __compiledModules = {};');
  lines.push('  var __failedModules = {};');
  lines.push('  var __moduleExports = {};');
  lines.push('  var __htmlElements = ' + HTML_ELEMENTS_JS + ';');
  lines.push('');
  lines.push('  var __dataEl = document.getElementById("__module_data");');
  lines.push('  var __moduleData = {};');
  lines.push('  if (__dataEl) { try { __moduleData = JSON.parse(__dataEl.textContent || "{}"); } catch(e) { console.error("[Preview] Failed to parse module data", e); } }');
  lines.push('');
  lines.push('  var __moduleKeys = Object.keys(__moduleData);');
  lines.push('  console.log("[Preview] Compiling " + __moduleKeys.length + " modules individually...");');
  lines.push('');

  // Per-file Babel compilation WITH post-compile lowercase JSX fix
  lines.push('  for (var __mi = 0; __mi < __moduleKeys.length; __mi++) {');
  lines.push('    var __filePath = __moduleKeys[__mi];');
  lines.push('    var __src = __moduleData[__filePath];');
  lines.push('    try {');
  lines.push('      var __t0 = performance.now();');
  lines.push('      var __result = Babel.transform(__src, { presets: ["react"], filename: __filePath, sourceType: "unambiguous" });');
  lines.push('      var __dt = Math.round(performance.now() - __t0);');
  lines.push('      // POST-COMPILE FIX: lowercase non-HTML JSX tags');
  lines.push('      // Babel compiles <icon .../> to React.createElement("icon", ...) treating it as HTML.');
  lines.push('      // But "icon" is actually a scoped variable holding a component reference.');
  lines.push('      // Convert to safe variable reference: typeof icon === "function" ? icon : "icon"');
  lines.push('      var __postCode = __result.code;');
  lines.push('      __postCode = __postCode.replace(/React\\.createElement\\("([a-z][a-zA-Z0-9]*)"/g, function(__m, __tag) {');
  lines.push('        if (__htmlElements.has(__tag)) return __m;');
  lines.push('        console.log("[Post-Compile Fix] " + __filePath + ": <" + __tag + " /> -> variable ref");');
  lines.push('        return "React.createElement(typeof " + __tag + " === \\"function\\" ? " + __tag + " : \\"" + __tag + "\\"";');
  lines.push('      });');
  lines.push('      __compiledModules[__filePath] = __postCode;');
  lines.push('      console.log("[Compile OK] " + __filePath + " (" + __dt + "ms)");');
  lines.push('    } catch(__compErr) {');
  lines.push('      var __loc = __compErr.loc ? ":" + __compErr.loc.line : "";');
  lines.push('      console.error("[Compile FAIL] " + __filePath + __loc + " - " + __compErr.message);');
  lines.push('      __failedModules[__filePath] = { error: __compErr.message, phase: "compilation", filePath: __filePath, line: __compErr.loc ? __compErr.loc.line : null };');
  lines.push('    }');
  lines.push('  }');
  lines.push('');

  // Execution in topological order
  lines.push('  var __execOrder = ' + JSON.stringify(executionOrder) + ';');
  lines.push('  console.log("[Preview] Executing " + __execOrder.length + " compiled modules...");');
  lines.push('');
  const depMap: Record<string, string[]> = {};
  for (const [fp, mod] of registry) depMap[fp] = mod.resolvedDeps;
  lines.push('  var __depMap = ' + JSON.stringify(depMap) + ';');
  const varMap: Record<string, string> = {};
  for (const fp of executionOrder) varMap[fp] = moduleVar(fp);
  lines.push('  var __varMap = ' + JSON.stringify(varMap) + ';');
  lines.push('');
  lines.push('  for (var __ei = 0; __ei < __execOrder.length; __ei++) {');
  lines.push('    var __fp = __execOrder[__ei]; var __vn = __varMap[__fp];');
  lines.push('    if (__failedModules[__fp]) { console.warn("[Execute SKIP] " + __fp + " - failed compilation"); continue; }');
  lines.push('    var __deps = __depMap[__fp] || []; var __depFailed = null;');
  lines.push('    for (var __di = 0; __di < __deps.length; __di++) { if (__failedModules[__deps[__di]]) { __depFailed = __deps[__di]; break; } }');
  lines.push('    if (__depFailed) { var __depErr = __failedModules[__depFailed]; console.warn("[Execute BLOCKED] " + __fp + " - dependency failed: " + __depFailed); __failedModules[__fp] = { error: "Blocked: dependency " + __depFailed + " failed", phase: "dependency", filePath: __fp }; continue; }');
  lines.push('    var __compiled = __compiledModules[__fp];');
  lines.push('    if (!__compiled) { console.warn("[Execute SKIP] " + __fp + " - no compiled code"); continue; }');
  lines.push('    try {');
  lines.push('      var exports = {};');
  lines.push('      var __execFn = new Function("exports", "React", "ReactDOM", Object.keys(__varMap).map(function(k){ return __varMap[k]; }).join(","), __compiled);');
  lines.push('      var __execArgs = [exports, React, ReactDOM].concat(Object.keys(__varMap).map(function(k){ return __moduleExports[k] || {}; }));');
  lines.push('      __execFn.apply(null, __execArgs);');
  lines.push('      __moduleExports[__fp] = exports; window[__vn] = exports;');
  lines.push('      console.log("[Execute OK] " + __fp + " (exports: " + Object.keys(exports).join(", ") + ")");');
  lines.push('    } catch(__execErr) { console.error("[Execute FAIL] " + __fp + ": " + __execErr.message); __failedModules[__fp] = { error: __execErr.message, phase: "execution", filePath: __fp }; }');
  lines.push('  }');
  lines.push('');

  // Export validation
  lines.push('  for (var __vi = 0; __vi < __execOrder.length; __vi++) { var __vfp = __execOrder[__vi]; if (__failedModules[__vfp]) continue; var __vexp = __moduleExports[__vfp]; if (__vexp && Object.keys(__vexp).length === 0 && !__vfp.includes("/types/")) console.error("[Validate FAIL] " + __vfp + " - Module produced no exports"); }');
  lines.push('');

  // Failure summary
  lines.push('  var failedKeys = Object.keys(__failedModules); var failedCount = failedKeys.length;');
  lines.push('  if (failedCount > 0) { console.warn("[Preview] " + failedCount + " module(s) failed:"); for (var __fi = 0; __fi < failedKeys.length; __fi++) { var __fmod = __failedModules[failedKeys[__fi]]; console.warn("  [" + __fmod.phase + "] " + failedKeys[__fi] + " - " + __fmod.error.substring(0, 120)); } }');
  lines.push('');

  // Mount App
  const appKey = executionOrder.find(k => k.endsWith('App.tsx') || k.endsWith('App.jsx') || k.endsWith('App.ts') || k.endsWith('App.js'));
  if (appKey) {
    lines.push('  var __appExports = __moduleExports[' + JSON.stringify(appKey) + '];');
    lines.push('  if (__failedModules[' + JSON.stringify(appKey) + ']) {');
    lines.push('    console.error("[Preview] App module failed - blocking mount");');
    lines.push('    var rootCauseFile = ' + JSON.stringify(appKey) + '; var rootCauseErr = __failedModules[rootCauseFile].error;');
    lines.push('    if (__failedModules[rootCauseFile].phase === "dependency") { for (var __ri = 0; __ri < failedKeys.length; __ri++) { if (__failedModules[failedKeys[__ri]].phase !== "dependency") { rootCauseFile = failedKeys[__ri]; rootCauseErr = __failedModules[rootCauseFile].error; break; } } }');
    lines.push('    document.getElementById("root").innerHTML = __buildScriptDiagHTML("Module Failure", rootCauseErr, rootCauseFile, null, null, failedCount + " module(s) failed. Root cause: " + rootCauseFile);');
    lines.push('    try { var failSummary = []; for (var fsi = 0; fsi < failedKeys.length; fsi++) { var fsMod = __failedModules[failedKeys[fsi]]; if (fsMod.phase !== "dependency") failSummary.push({ file: fsMod.filePath, error: fsMod.error.substring(0, 200), phase: fsMod.phase }); } parent.postMessage({ type: "preview-errors-available", payload: { rootCause: rootCauseFile, rootError: rootCauseErr.substring(0, 300), totalFailed: failedCount, failures: failSummary.slice(0, 10) } }, "*"); } catch(__pe) {}');
    lines.push('    return;');
    lines.push('  }');
    lines.push('  var __App = __appExports && (__appExports["default"] || __appExports);');
    lines.push('  if (!__App) { console.error("[Preview] No default export from App"); document.getElementById("root").innerHTML = __buildScriptDiagHTML("Mount", "App module has no default export", ' + JSON.stringify(appKey) + '); return; }');
    lines.push('  try { var __root = ReactDOM.createRoot(document.getElementById("root")); __root.render(React.createElement(__ErrorBoundary, null, React.createElement(__App))); console.log("[Preview] App mounted successfully"); }');
    lines.push('  catch(__mountErr) { console.error("[Preview] Mount error:", __mountErr); document.getElementById("root").innerHTML = __buildScriptDiagHTML("Mount", __mountErr.message || "Unknown mount error", ' + JSON.stringify(appKey) + '); try { parent.postMessage({ type: "preview-errors-available", payload: { rootCause: "src/App.tsx", rootError: (__mountErr.message || "Unknown").substring(0, 300), totalFailed: 1, failures: [{ file: "src/App.tsx", error: (__mountErr.message || "Unknown").substring(0, 200), phase: "mount" }] } }, "*"); } catch(__me) {} }');
  } else {
    lines.push('  console.error("[Preview] No App module found"); document.getElementById("root").innerHTML = __buildScriptDiagHTML("Discovery", "No App.tsx/App.jsx found in generated files");');
  }

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════════

export function renderPreviewHTML(files: ProjectFile[]): string {
  try {
    const registry = buildRegistry(files);
    const executionOrder = topologicalSort(registry);
    const diagnosticIssues = runDiagnosticScan(registry);
    if (diagnosticIssues.filter(i => i.severity === 'error').length > 0) console.warn('[Preview] Diagnostic issues found:', diagnosticIssues.length);

    const css = extractAllCSS(files);
    const moduleData: Record<string, string> = {};
    for (const fp of executionOrder) { const mod = registry.get(fp); if (mod) moduleData[fp] = mod.processedSource; }

    const moduleDataJSON = escapeForHTMLScript(JSON.stringify(moduleData));
    const executionScript = buildExecutionScript(registry, executionOrder);

    const html: string[] = [];
    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push('<head>');
    html.push('<meta charset="UTF-8">');
    html.push('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
    html.push('<title>Preview</title>');
    html.push('<script src="' + CDN.react + '"><\/script>');
    html.push('<script src="' + CDN.reactDom + '"><\/script>');
    html.push('<script src="' + CDN.babel + '"><\/script>');
    html.push('<script src="' + CDN.tailwind + '"><\/script>');
    html.push('<script src="' + CDN.lucide + '"><\/script>');
    html.push('<style>' + css.replace(/<\//g, '<\\/') + '</style>');
    html.push('</head>');
    html.push('<body>');
    html.push('<div id="root"></div>');
    html.push('<script type="application/json" id="__module_data">' + moduleDataJSON + '<\/script>');
    html.push('<script>' + CONSOLE_CAPTURE + '<\/script>');
    html.push('<script>' + ROUTER_SHIM + '<\/script>');
    html.push('<script>' + LUCIDE_FACTORY + '<\/script>');
    html.push('<script>' + ERROR_BOUNDARY + '<\/script>');
    html.push('<script>');
    html.push('(function() {');
    html.push(executionScript);
    html.push('})();');
    html.push('<\/script>');
    html.push('</body>');
    html.push('</html>');
    return html.join('\n');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Preview] Fatal render error:', msg);
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + buildDiagnosticHTML('Render', msg, undefined, 'The preview renderer encountered a fatal error. Try regenerating the project.') + '</body></html>';
  }
}
