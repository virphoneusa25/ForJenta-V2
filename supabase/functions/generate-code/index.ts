import { corsHeaders } from "../_shared/cors.ts";
import {
  ROUTERS,
  GENERATION_PIPELINE,
  type RouterTask,
  type RouterConfig,
} from "../_shared/routers.ts";

const INWORLD_API_URL = "https://api.inworld.ai/v1/chat/completions";

// ═══════════════════════════════════════════════════════════════════
// APPROVED LIBRARIES
// ═══════════════════════════════════════════════════════════════════

const APPROVED_IMPORTS = new Set([
  "react", "react-dom", "react-dom/client", "react-router-dom",
  "lucide-react", "framer-motion", "zustand", "sonner",
  "clsx", "tailwind-merge", "class-variance-authority",
]);

// ═══════════════════════════════════════════════════════════════════
// JSON Repair Utilities
// ═══════════════════════════════════════════════════════════════════

function sanitizeRaw(raw: string): string {
  let text = raw.trim();
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonFenceMatch) text = jsonFenceMatch[1].trim();
  else {
    const genericFenceMatch = text.match(/```\s*([\s\S]*?)```/);
    if (genericFenceMatch) text = genericFenceMatch[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found in response");
  text = text.substring(start, end + 1);
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
  return text;
}

function tryParseJSON(text: string, routerName: string): any {
  try { return JSON.parse(text); } catch (e1) {
    console.log(`[JSON-Parse] Direct parse failed for ${routerName}: ${(e1 as Error).message}`);
  }
  try {
    const fixed = text.replace(/\r\n/g, "\\n").replace(/\r/g, "\\n").replace(/\n/g, "\\n").replace(/\t/g, "\\t");
    return JSON.parse(fixed);
  } catch (e2) {
    console.log(`[JSON-Parse] Escaped parse failed for ${routerName}`);
  }
  try {
    const noTrailing = text.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(noTrailing);
  } catch (e3) {
    console.log(`[JSON-Parse] Trailing-comma strip failed for ${routerName}`);
  }
  try { return extractFilesManually(text); } catch (e4) {
    console.log(`[JSON-Parse] Manual extraction failed for ${routerName}`);
  }
  throw new Error(`Failed to parse JSON from ${routerName}.`);
}

function extractFilesManually(text: string): any {
  const nameMatch = text.match(/"projectName"\s*:\s*"([^"]+)"/);
  const explMatch = text.match(/"explanation"\s*:\s*"([^"]+)"/);
  const files: any[] = [];
  const filePattern = /"path"\s*:\s*"([^"]+)"/g;
  let match;
  const filePaths: { path: string; index: number }[] = [];
  while ((match = filePattern.exec(text)) !== null) {
    filePaths.push({ path: match[1], index: match.index });
  }
  for (let i = 0; i < filePaths.length; i++) {
    const fp = filePaths[i];
    const nextBoundary = i + 1 < filePaths.length ? filePaths[i + 1].index : text.length;
    const segment = text.substring(fp.index, nextBoundary);
    const langMatch = segment.match(/"language"\s*:\s*"([^"]+)"/);
    const language = langMatch?.[1] || "text";
    const contentKeyIdx = segment.indexOf('"content"');
    let content = "";
    if (contentKeyIdx >= 0) {
      const colonIdx = segment.indexOf(":", contentKeyIdx + 9);
      if (colonIdx >= 0) {
        const openQuote = segment.indexOf('"', colonIdx + 1);
        if (openQuote >= 0) {
          let j = openQuote + 1;
          let escaped = false;
          while (j < segment.length) {
            if (escaped) { escaped = false; j++; continue; }
            if (segment[j] === "\\") { escaped = true; j++; continue; }
            if (segment[j] === '"') break;
            j++;
          }
          content = segment.substring(openQuote + 1, j);
          try { content = JSON.parse(`"${content}"`); } catch {
            content = content.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
          }
        }
      }
    }
    files.push({ path: fp.path, content, language });
  }
  if (files.length === 0) throw new Error("No files extracted manually");
  return { projectName: nameMatch?.[1] || "generated-app", explanation: explMatch?.[1] || "AI-generated project", files };
}

// ═══════════════════════════════════════════════════════════════════
// HTML Elements for JSX tag detection
// ═══════════════════════════════════════════════════════════════════

const HTML_ELEMENTS_SET = new Set([
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
  'radialGradient','stop','filter','animate','set',
]);

// ═══════════════════════════════════════════════════════════════════
// Post-Pipeline Validation & Repair
// ═══════════════════════════════════════════════════════════════════

function postPipelineValidate(files: any[]): { files: any[]; warnings: string[] } {
  const warnings: string[] = [];
  const filePaths = new Set(files.map((f: any) => f.path));

  // Ensure index.html
  if (!filePaths.has("index.html")) {
    files.push({
      path: "index.html",
      content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>`,
      language: "html",
    });
    filePaths.add("index.html");
    warnings.push("Added missing index.html");
  } else {
    const idx = files.findIndex((f: any) => f.path === "index.html");
    if (idx >= 0 && !files[idx].content.includes('id="root"')) {
      files[idx].content = files[idx].content.replace("</body>", '  <div id="root"></div>\n</body>');
      warnings.push("Added missing #root to index.html");
    }
  }

  // Ensure src/main.tsx
  if (!filePaths.has("src/main.tsx")) {
    files.push({
      path: "src/main.tsx",
      content: `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
      language: "typescript",
    });
    filePaths.add("src/main.tsx");
    warnings.push("Added missing src/main.tsx");
  }

  // Ensure src/App.tsx with default export
  if (!filePaths.has("src/App.tsx")) {
    warnings.push("Added missing src/App.tsx");
    files.push({
      path: "src/App.tsx",
      content: `import React from 'react';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen flex items-center justify-center bg-gray-50">\n      <h1 className="text-2xl font-bold text-gray-900">App</h1>\n    </div>\n  );\n}`,
      language: "typescript",
    });
    filePaths.add("src/App.tsx");
  } else {
    const appIdx = files.findIndex((f: any) => f.path === "src/App.tsx");
    if (appIdx >= 0 && !/export\s+default/.test(files[appIdx].content)) {
      const funcMatch = files[appIdx].content.match(/(?:function|const)\s+(App)\s*/);
      if (funcMatch) {
        files[appIdx].content += `\nexport default ${funcMatch[1]};\n`;
        warnings.push("Added missing default export to App.tsx");
      }
    }
  }

  // Ensure src/index.css exists
  if (!filePaths.has("src/index.css")) {
    files.push({
      path: "src/index.css",
      content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: 'Inter', system-ui, -apple-system, sans-serif;\n  -webkit-font-smoothing: antialiased;\n}`,
      language: "css",
    });
    filePaths.add("src/index.css");
    warnings.push("Added missing src/index.css");
  }

  // Scan for unapproved imports
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    const importMatches = file.content.matchAll(/import\s+(?:[\w*{}\s,]+)\s+from\s+['"]([^'"./][^'"]*)['"]/g);
    for (const m of importMatches) {
      const pkg = m[1];
      const basePkg = pkg.startsWith("@") ? pkg.split("/").slice(0, 2).join("/") : pkg.split("/")[0];
      if (!APPROVED_IMPORTS.has(pkg) && !APPROVED_IMPORTS.has(basePkg)) {
        warnings.push(`Unapproved import '${pkg}' in ${file.path}`);
      }
    }
    // Strip env var references
    if (/import\.meta\.env|process\.env/.test(file.content)) {
      file.content = file.content
        .replace(/import\.meta\.env\.(\w+)/g, "'PREVIEW_PLACEHOLDER'")
        .replace(/process\.env\.(\w+)/g, "'PREVIEW_PLACEHOLDER'");
      warnings.push(`Replaced env var references in ${file.path}`);
    }
  }

  // Ensure every .tsx component has a default export
  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/) || file.path.endsWith("main.tsx")) continue;
    if (!/export\s+default/.test(file.content)) {
      const fileName = file.path.split("/").pop()?.replace(/\.(tsx|jsx)$/, "") || "";
      const funcPattern = new RegExp(`(?:function|const)\\s+(${fileName})\\s*`, "i");
      const match = file.content.match(funcPattern);
      if (match) {
        file.content += `\nexport default ${match[1]};\n`;
        warnings.push(`Added default export to ${file.path}`);
      }
    }
  }

  // Verify all internal imports resolve
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    const relativeImports = file.content.matchAll(/from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]/g);
    for (const m of relativeImports) {
      const specifier = m[1];
      const dir = file.path.substring(0, file.path.lastIndexOf('/'));
      const parts = dir.split('/').filter(Boolean);
      for (const sp of specifier.split('/')) {
        if (sp === '.') continue;
        if (sp === '..') { parts.pop(); continue; }
        parts.push(sp);
      }
      const basePath = parts.join('/');
      const candidates = [basePath, `${basePath}.tsx`, `${basePath}.ts`, `${basePath}.jsx`, `${basePath}.js`, `${basePath}/index.tsx`, `${basePath}/index.ts`];
      const resolved = candidates.some((c) => filePaths.has(c));
      if (!resolved) {
        warnings.push(`Unresolved import '${specifier}' in ${file.path}`);
      }
    }
  }

  // ── Verify import/export name consistency + AUTO-REPAIR mismatches ──
  const exportMap = new Map<string, Set<string>>();
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    const exports = new Set<string>();
    const declExports = file.content.matchAll(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
    for (const m of declExports) exports.add(m[1]);
    const defExports = file.content.matchAll(/export\s+default\s+(?:function|class)\s+(\w+)/g);
    for (const m of defExports) exports.add(m[1]);
    const namedExports = file.content.matchAll(/export\s*\{([^}]+)\}/g);
    for (const m of namedExports) {
      m[1].split(',').forEach((n: string) => {
        const trimmed = n.trim().split(/\s+as\s+/)[0].trim();
        if (trimmed) exports.add(trimmed);
      });
    }
    if (/export\s+default\b/.test(file.content)) exports.add('default');
    exportMap.set(file.path, exports);
  }

  function resolveSpecToPath(fromFile: string, specifier: string): string | null {
    const dir = fromFile.substring(0, fromFile.lastIndexOf('/'));
    const parts = dir.split('/').filter(Boolean);
    for (const sp of specifier.split('/')) {
      if (sp === '.') continue;
      if (sp === '..') { parts.pop(); continue; }
      parts.push(sp);
    }
    const basePath = parts.join('/');
    const candidates = [basePath, `${basePath}.tsx`, `${basePath}.ts`, `${basePath}.jsx`, `${basePath}.js`, `${basePath}/index.tsx`, `${basePath}/index.ts`];
    return candidates.find((c) => exportMap.has(c)) || null;
  }

  function findBestExportMatch(importName: string, availableExports: Set<string>): string | null {
    if (availableExports.has(importName)) return null;
    const lower = importName.toLowerCase();
    for (const exp of availableExports) {
      if (exp.startsWith('MOCK_') && exp.slice(5).toLowerCase() === lower) return exp;
    }
    for (const exp of availableExports) {
      if (exp.toLowerCase() === lower) return exp;
      if (exp.toLowerCase() === `mock_${lower}`) return exp;
    }
    for (const exp of availableExports) {
      const expLower = exp.toLowerCase().replace('mock_', '');
      if (expLower.includes(lower) || lower.includes(expLower)) return exp;
    }
    return null;
  }

  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    const namedImports = file.content.matchAll(/import\s*\{([^}]+)\}\s+from\s+['"](\.\/[^'"]+|\.\.\/[^'"]+)['"]\s*;?/g);
    for (const m of namedImports) {
      const importedNames = m[1].split(',').map((n: string) => n.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      const specifier = m[2];
      const targetPath = resolveSpecToPath(file.path, specifier);
      if (targetPath) {
        const targetExports = exportMap.get(targetPath)!;
        for (const name of importedNames) {
          if (!targetExports.has(name)) {
            const bestMatch = findBestExportMatch(name, targetExports);
            if (bestMatch) {
              console.log(`[PostValidate] AUTO-REPAIR: ${file.path} — '${name}' → '${bestMatch}'`);
              const nameRegex = new RegExp(`\\b${name}\\b`, 'g');
              file.content = file.content.replace(nameRegex, bestMatch);
              warnings.push(`AUTO-REPAIRED: ${file.path} — '${name}' → '${bestMatch}' (matched from ${targetPath})`);
            } else {
              warnings.push(`Import mismatch: ${file.path} imports '${name}' from '${specifier}' but ${targetPath} does not export it (available: ${Array.from(targetExports).join(', ')})`);
            }
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 1: Force MOCK_ prefix on data file array exports
  // ══════════════════════════════════════════════════════════════════
  const DATA_FILE_PATTERNS = /src\/lib\/(data|mockData|mock-data|mock_data|constants|mockdata)\.(ts|tsx|js|jsx)$/;
  const dataFiles = files.filter((f: any) => DATA_FILE_PATTERNS.test(f.path));

  for (const dataFile of dataFiles) {
    const bareArrayExports: { oldName: string; newName: string }[] = [];
    const exportRegex = /export\s+(?:const|let|var)\s+([a-z][a-zA-Z_$]*)\s*(?::\s*[^=]+)?\s*=\s*\[/g;
    let eMatch;
    while ((eMatch = exportRegex.exec(dataFile.content)) !== null) {
      const oldName = eMatch[1];
      if (oldName.startsWith('MOCK_') || oldName.startsWith('mock_')) continue;
      const snake = oldName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
      const newName = 'MOCK_' + snake;
      bareArrayExports.push({ oldName, newName });
    }

    const bareObjExports: { oldName: string; newName: string }[] = [];
    const objExportRegex = /export\s+(?:const|let|var)\s+([a-z][a-zA-Z_$]*)\s*(?::\s*[^=]+)?\s*=\s*\{/g;
    let oMatch;
    while ((oMatch = objExportRegex.exec(dataFile.content)) !== null) {
      const oldName = oMatch[1];
      if (['cn', 'utils', 'helpers', 'formatDate', 'formatCurrency', 'generateId'].includes(oldName)) continue;
      if (oldName.startsWith('MOCK_') || oldName.startsWith('mock_') || oldName.startsWith('use')) continue;
      const ENTITY_NAMES = ['leads','customers','contacts','deals','activities','tickets','users','orders','products','tasks','projects','messages','events','notifications','invoices','payments','categories','tags','comments','posts','articles','items','members','teams','accounts','campaigns','reports','analytics','stats','metrics','settings','profiles'];
      if (!ENTITY_NAMES.includes(oldName.toLowerCase())) continue;
      const snake = oldName.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
      const newName = 'MOCK_' + snake;
      bareObjExports.push({ oldName, newName });
    }

    const allRenames = [...bareArrayExports, ...bareObjExports];
    if (allRenames.length === 0) continue;

    console.log(`[DETERMINISTIC FIX 1] ${dataFile.path}: renaming ${allRenames.length} bare exports to MOCK_ prefix`);

    for (const rename of allRenames) {
      const nameRegex = new RegExp(`\\b${rename.oldName}\\b`, 'g');
      for (const file of files) {
        if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
        const before = file.content;
        file.content = file.content.replace(nameRegex, rename.newName);
        if (file.content !== before) {
          if (file.path === dataFile.path) {
            warnings.push(`DETERMINISTIC: Renamed export '${rename.oldName}' -> '${rename.newName}' in ${file.path}`);
          } else {
            warnings.push(`DETERMINISTIC: Updated reference '${rename.oldName}' -> '${rename.newName}' in ${file.path}`);
          }
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 1.5: Strip type annotations from data file declarations
  // Converts: export const MOCK_LEADS: Lead[] = [...] → export const MOCK_LEADS = [...]
  // ══════════════════════════════════════════════════════════════════
  const DATA_FILE_TS_PATTERNS = /src\/(lib|constants|data|hooks)\/(data|mockData|mock-data|mock_data|constants|mockdata)\.(ts|tsx)$/;
  for (const file of files) {
    if (!DATA_FILE_TS_PATTERNS.test(file.path)) continue;
    const before15 = file.content;
    // Strip type annotations from const/let/var declarations: const X: Type[] = → const X =
    file.content = file.content.replace(
      /(export\s+)?(?:const|let|var)\s+(\w+)\s*:\s*[^=]+=/g,
      (match, exp, name) => {
        const prefix = exp ? 'export ' : '';
        return `${prefix}const ${name} =`;
      }
    );
    if (file.content !== before15) {
      warnings.push(`DETERMINISTIC: Stripped type annotations from declarations in ${file.path}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 2: Fix parameter generic syntax
  // Converts: function foo(ref<HTMLElement>, handler) -> function foo(ref, handler)
  // ══════════════════════════════════════════════════════════════════
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    const before = file.content;
    file.content = file.content.replace(
      /([,(]\s*)(\w+)<[^>]+>(?=\s*[,):])/g,
      '$1$2'
    );
    file.content = file.content.replace(
      /(\(\s*)(\w+)<[^>]+>(?=\s*[,):])/g,
      '$1$2'
    );
    if (file.content !== before) {
      warnings.push(`DETERMINISTIC: Fixed parameter generic syntax in ${file.path}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 3: Fix JSX property-access component tags
  // <item.icon /> -> const Icon = item.icon; <Icon />
  // Strategy: Replace tags, then inject extraction BEFORE the nearest return.
  // ══════════════════════════════════════════════════════════════════
  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/)) continue;
    const before3 = file.content;

    const memberJSXMatches = [...file.content.matchAll(/<([a-zA-Z_$][\w$]*)\.([a-zA-Z_$][\w$]*)(?=[\s>\/>])/g)];
    if (memberJSXMatches.length === 0) continue;

    const uniqueTags3 = new Map<string, { obj: string; prop: string }>();
    for (const m of memberJSXMatches) {
      const key = `${m[1]}.${m[2]}`;
      if (!uniqueTags3.has(key)) uniqueTags3.set(key, { obj: m[1], prop: m[2] });
    }

    for (const [, { obj, prop }] of uniqueTags3) {
      const capName = prop.charAt(0).toUpperCase() + prop.slice(1);
      const escObj = obj.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escProp = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Replace all JSX tags first
      file.content = file.content.replace(new RegExp(`<${escObj}\\.${escProp}(?=[\\s>\\/>])`, 'g'), `<${capName}`);
      file.content = file.content.replace(new RegExp(`</${escObj}\\.${escProp}>`, 'g'), `</${capName}>`);

      // Inject extraction BEFORE return statements that use the tag
      const lines3 = file.content.split('\n');
      const processed3: string[] = [];
      let injected3 = false;
      for (let li = 0; li < lines3.length; li++) {
        const line = lines3[li];
        // Reset on scope boundaries
        if (/\b(?:map|forEach|filter|reduce|flatMap)\s*\(/.test(line) || /=>\s*\{/.test(line) || /function\s*[\w]*\s*\(/.test(line)) {
          injected3 = false;
        }
        // Inject before return if the return block uses our tag
        if (!injected3 && /\breturn\b/.test(line)) {
          const rest = lines3.slice(li).join('\n');
          if (rest.includes(`<${capName} `) || rest.includes(`<${capName}>`) || rest.includes(`<${capName}/`)) {
            const indent = line.match(/^(\s*)/)?.[1] || '    ';
            processed3.push(`${indent}const ${capName} = ${obj}.${prop};`);
            injected3 = true;
          }
        }
        processed3.push(line);
      }
      file.content = processed3.join('\n');
    }

    if (file.content !== before3) {
      warnings.push(`DETERMINISTIC: Fixed JSX property-access component tags in ${file.path}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 4: Fix lowercase non-HTML JSX component tags
  // Two-part strategy:
  //   A) Rename in destructured props: { icon } -> { icon: Icon }
  //   B) For .map() callbacks, inject const Icon = icon; before return
  // The preview renderer post-Babel fix is the final safety net.
  // ══════════════════════════════════════════════════════════════════
  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/)) continue;
    const before4 = file.content;

    // Find lowercase JSX tags that are NOT HTML elements
    const lcTagMatches = [...file.content.matchAll(/<([a-z][a-zA-Z0-9]+)(?=[\s>\/>])/g)];
    const nonHTMLTags = new Set<string>();
    for (const m of lcTagMatches) {
      const tag = m[1];
      if (!HTML_ELEMENTS_SET.has(tag) && tag.length > 1) nonHTMLTags.add(tag);
    }

    for (const tag of nonHTMLTags) {
      const capTag = tag.charAt(0).toUpperCase() + tag.slice(1);

      // ── Strategy A: Rename in destructured function parameters ──
      // { icon, title } -> { icon: Icon, title }
      // Handles: function StatCard({ icon, title }) and ({ icon, title }) =>
      // Match the tag word inside { } that is NOT already followed by ":"
      const destructureRegex = new RegExp(
        `(\\{[^}]*?)\\b${tag}\\b(?!\\s*:)(?=\\s*[,}])([^}]*\\})`,
        'g'
      );
      file.content = file.content.replace(destructureRegex, `$1${tag}: ${capTag}$2`);

      // ── Replace all JSX tag occurrences ──
      file.content = file.content.replace(new RegExp(`<${tag}(?=[\\s>\\/>])`, 'g'), `<${capTag}`);
      file.content = file.content.replace(new RegExp(`</${tag}>`, 'g'), `</${capTag}>`);

      // ── Strategy B: For tags NOT caught by destructuring rename ──
      // Inject const CapTag = tag; BEFORE the nearest return statement
      const wasRenamed = file.content.includes(`${tag}: ${capTag}`);
      if (!wasRenamed) {
        const lines4 = file.content.split('\n');
        const processed4: string[] = [];
        let injected4 = false;
        for (let li = 0; li < lines4.length; li++) {
          const line = lines4[li];
          // Reset on new scope boundaries
          if (/\b(?:map|forEach|filter|reduce|flatMap)\s*\(/.test(line) || /=>\s*\{/.test(line) || /function\s*[\w]*\s*\(/.test(line)) {
            injected4 = false;
          }
          // Inject before return if the return block uses our capitalized tag
          if (!injected4 && /\breturn\b/.test(line)) {
            const rest = lines4.slice(li).join('\n');
            if (rest.includes(`<${capTag} `) || rest.includes(`<${capTag}>`) || rest.includes(`<${capTag}/`)) {
              const indent = line.match(/^(\s*)/)?.[1] || '    ';
              processed4.push(`${indent}const ${capTag} = ${tag};`);
              injected4 = true;
            }
          }
          processed4.push(line);
        }
        file.content = processed4.join('\n');
      }
    }

    if (file.content !== before4) {
      warnings.push(`DETERMINISTIC: Fixed lowercase JSX component tags in ${file.path}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 5: Strip env var references that slipped through
  // ══════════════════════════════════════════════════════════════════
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    if (/import\.meta\.env|process\.env/.test(file.content)) {
      file.content = file.content
        .replace(/import\.meta\.env\.(\w+)/g, "'PREVIEW_PLACEHOLDER'")
        .replace(/process\.env\.(\w+)/g, "'PREVIEW_PLACEHOLDER'");
      warnings.push(`DETERMINISTIC: Stripped env var references in ${file.path}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // DETERMINISTIC FIX 6: Strip ALL TypeScript syntax from ALL files
  // The preview runtime compiles JSX but CANNOT parse TypeScript.
  // This runs AFTER all other fixes so it catches any TS that slipped through.
  // ══════════════════════════════════════════════════════════════════
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts)$/)) continue;
    const before6 = file.content;

    // 6a: Remove interface declarations (single-line and multi-line)
    const lines6: string[] = file.content.split('\n');
    const output6: string[] = [];
    let removing6 = false;
    let braceDepth6 = 0;
    for (let li6 = 0; li6 < lines6.length; li6++) {
      const line = lines6[li6];
      if (!removing6) {
        // Match: interface X {, export interface X extends Y {
        if (/^\s*(?:export\s+)?interface\s+\w+/.test(line)) {
          braceDepth6 = 0;
          for (const ch of line) { if (ch === '{') braceDepth6++; if (ch === '}') braceDepth6--; }
          if (braceDepth6 <= 0) { output6.push(''); } else { removing6 = true; }
          continue;
        }
        // Match: type X = { (block type aliases)
        if (/^\s*(?:export\s+)?type\s+\w+\s*(?:<[^>]*>)?\s*=\s*\{/.test(line)) {
          braceDepth6 = 0;
          for (const ch of line) { if (ch === '{') braceDepth6++; if (ch === '}') braceDepth6--; }
          if (braceDepth6 <= 0) { output6.push(''); } else { removing6 = true; }
          continue;
        }
        // Match: enum X { (including const enum)
        if (/^\s*(?:export\s+)?(?:const\s+)?enum\s+\w+/.test(line)) {
          braceDepth6 = 0;
          for (const ch of line) { if (ch === '{') braceDepth6++; if (ch === '}') braceDepth6--; }
          if (braceDepth6 <= 0) { output6.push(''); } else { removing6 = true; }
          continue;
        }
      }
      if (removing6) {
        for (const ch of line) { if (ch === '{') braceDepth6++; if (ch === '}') braceDepth6--; }
        if (braceDepth6 <= 0) { removing6 = false; }
        continue;
      }
      output6.push(line);
    }
    file.content = output6.join('\n');

    // 6b: Remove single-line type aliases: type X = string | number;
    file.content = file.content.replace(/^\s*(?:export\s+)?type\s+\w+\s*(?:<[^>]*>)?\s*=\s*[^;{]+;\s*$/gm, '');

    // 6c: Remove import type statements
    file.content = file.content.replace(/^\s*import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\s*$/gm, '');
    file.content = file.content.replace(/^\s*import\s+type\s+\w+\s+from\s+['"][^'"]*['"];?\s*$/gm, '');

    // 6d: Strip generic type params from function declarations: function foo<T>( → function foo(
    file.content = file.content.replace(/(function\s+\w+)\s*<[^>]*>\s*\(/g, '$1(');

    // 6e: Strip React.FC type annotation
    file.content = file.content.replace(/:\s*React\.FC(?:<[^>]*>)?/g, '');

    // 6f: Strip generic params from hooks/utilities
    file.content = file.content.replace(/(useState|useRef|useCallback|useMemo|useContext|createContext|useReducer|createStore|createWithEqualityFn|forwardRef|memo|lazy|useMutation|useQuery|useInfiniteQuery)\s*<[^>]*>/g, '$1');
    // Strip generic on assignment: = <Type>(
    file.content = file.content.replace(/(=\s*)<[^>]*>\s*\(/g, '$1(');
    // Fix malformed parameter generics: func(ref<HTMLElement>) → func(ref)
    file.content = file.content.replace(/([,(]\s*\w+)<[^>]+>(?=\s*[,):])/g, '$1');

    // 6g: Strip 'as' type casts
    file.content = file.content.replace(/\bas\s+keyof\s+typeof\s+\w+/g, '');
    file.content = file.content.replace(/\bas\s+typeof\s+\w+/g, '');
    file.content = file.content.replace(/\bas\s+const\b/g, '');
    file.content = file.content.replace(/\bas\s+(?:[a-zA-Z][\w.]*(?:<[^>]*>)?(?:\[\])*)(\s*\|\s*(?:[a-zA-Z][\w.]*(?:<[^>]*>)?(?:\[\])*))*(?![\w$])/g, '');

    // 6h: Strip 'satisfies' expressions
    file.content = file.content.replace(/\bsatisfies\s+\w+(?:<[^>]*>)?/g, '');

    // 6i: Strip non-null assertions: obj! → obj (but NOT !== or !=)
    file.content = file.content.replace(/(\w+)!(?!=)/g, '$1');

    // 6j: Strip 'declare' statements
    file.content = file.content.replace(/^\s*declare\s+.+$/gm, '');

    // ══════════════════════════════════════════════════════════════
    // AGGRESSIVE GENERIC TYPE STRIPPING (replaces old enumeration approach)
    // These use [\w.]+ to match ANY type name, not just a whitelist.
    // ══════════════════════════════════════════════════════════════

    // 6k: Return type annotations: ): Type { → ) {
    file.content = file.content.replace(/(\))\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[\w.]+(?:<[^>]*>)?(?:\[\])?)*\s*(?=[{=])/g, '$1 ');
    file.content = file.content.replace(/(\))\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[\w.]+(?:<[^>]*>)?(?:\[\])?)*\s*(?==>)/g, '$1 ');

    // 6l: Function type params: handler: () => void → handler
    file.content = file.content.replace(/([,(]\s*\w+)\s*:\s*\([^)]*\)\s*=>\s*[\w.]+(?:<[^>]*>)?(?:\[\])?\s*(?=[,)])/g, '$1');

    // 6m: Variable type annotations: const x: Type = → const x =
    file.content = file.content.replace(/((?:export\s+)?(?:const|let|var)\s+\w+)\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[\w.]+(?:<[^>]*>)?(?:\[\])?)*\s*(?==)/g, '$1 ');

    // 6n: Rest parameter annotations: ...args: string[] → ...args
    file.content = file.content.replace(/(\.\.\.[a-zA-Z_$]\w*)\s*:\s*[\w.]+(?:<[^>]*>)?(?:\[\])*/g, '$1');

    // 6o: Parameter type annotations — SAFE VERSION
    //   Only strip known TypeScript type keywords to avoid corrupting object literals.
    //   { value: 50000, icon: Component } must NOT be touched.
    //   Only { param: string, param: number } etc. are stripped.
    file.content = file.content.replace(/([,(]\s*)(\w+)\s*:\s*(?:string|number|boolean|void|never|any|unknown|null|undefined|object|symbol|bigint)(?:\[\])?\s*(?=[,)])/g, '$1$2');
    // Also strip uppercase type names only when inside function-like parameter context
    file.content = file.content.replace(/(\(\s*(?:\w+\s*,\s*)*)(\w+)\s*:\s*[A-Z][\w.]*(?:<[^>]*>)?(?:\[\])?(?:\s*\|\s*[A-Z][\w.]*(?:<[^>]*>)?(?:\[\])?)*\s*(?=[,)])/g, '$1$2');

    // 6p: Destructured type annotations: } : { ... } → }
    let r6 = '';
    let i6 = 0;
    while (i6 < file.content.length) {
      if (file.content[i6] === '}' || file.content[i6] === ']') {
        const closingChar = file.content[i6];
        r6 += closingChar;
        i6++;
        let j6 = i6;
        while (j6 < file.content.length && (file.content[j6] === ' ' || file.content[j6] === '\t')) j6++;
        if (j6 < file.content.length && file.content[j6] === ':') {
          let k6 = j6 + 1;
          while (k6 < file.content.length && (file.content[k6] === ' ' || file.content[k6] === '\t')) k6++;
          if (k6 < file.content.length && (file.content[k6] === '{' || file.content[k6] === '[')) {
            const openBrace6 = file.content[k6];
            const closeBrace6 = openBrace6 === '{' ? '}' : ']';
            let depth6 = 1;
            let m6 = k6 + 1;
            while (m6 < file.content.length && depth6 > 0) {
              if (file.content[m6] === openBrace6) depth6++;
              if (file.content[m6] === closeBrace6) depth6--;
              m6++;
            }
            let n6 = m6;
            while (n6 < file.content.length && (file.content[n6] === ' ' || file.content[n6] === '\t' || file.content[n6] === '\n')) n6++;
            if (n6 < file.content.length && (file.content[n6] === ')' || file.content[n6] === ',' || file.content[n6] === '{' || (file.content[n6] === '=' && n6 + 1 < file.content.length && file.content[n6 + 1] === '>'))) {
              i6 = m6;
              continue;
            }
          } else if (k6 < file.content.length && /[A-Za-z]/.test(file.content[k6])) {
            let m6b = k6;
            while (m6b < file.content.length && /[\w.]/.test(file.content[m6b])) m6b++;
            if (m6b < file.content.length && file.content[m6b] === '<') {
              let gDepth = 1; m6b++;
              while (m6b < file.content.length && gDepth > 0) { if (file.content[m6b] === '<') gDepth++; if (file.content[m6b] === '>') gDepth--; m6b++; }
            }
            while (m6b + 1 < file.content.length && file.content[m6b] === '[' && file.content[m6b + 1] === ']') m6b += 2;
            // Check for union types: | TypeName
            let tempPos = m6b;
            while (tempPos < file.content.length && (file.content[tempPos] === ' ' || file.content[tempPos] === '\t')) tempPos++;
            if (tempPos < file.content.length && file.content[tempPos] === '|') {
              tempPos++;
              while (tempPos < file.content.length && (file.content[tempPos] === ' ' || file.content[tempPos] === '\t')) tempPos++;
              while (tempPos < file.content.length && /[\w.]/.test(file.content[tempPos])) tempPos++;
              if (tempPos < file.content.length && file.content[tempPos] === '<') {
                let gd2 = 1; tempPos++;
                while (tempPos < file.content.length && gd2 > 0) { if (file.content[tempPos] === '<') gd2++; if (file.content[tempPos] === '>') gd2--; tempPos++; }
              }
              while (tempPos + 1 < file.content.length && file.content[tempPos] === '[' && file.content[tempPos + 1] === ']') tempPos += 2;
              m6b = tempPos;
            }
            let n6b = m6b;
            while (n6b < file.content.length && (file.content[n6b] === ' ' || file.content[n6b] === '\t' || file.content[n6b] === '\n')) n6b++;
            if (n6b < file.content.length && (file.content[n6b] === ')' || file.content[n6b] === ',' || file.content[n6b] === '{' || (file.content[n6b] === '=' && n6b + 1 < file.content.length && file.content[n6b + 1] === '>'))) {
              i6 = m6b;
              continue;
            }
          }
        }
        continue;
      }
      r6 += file.content[i6];
      i6++;
    }
    file.content = r6;

    if (file.content !== before6) {
      warnings.push(`DETERMINISTIC: Stripped TypeScript syntax from ${file.path}`);
    }
  }

  console.log(`[PostValidate] ${warnings.length} total fixes/warnings`);
  if (warnings.length > 0) {
    const deterministicCount = warnings.filter(w => w.startsWith('DETERMINISTIC')).length;
    const autoRepairCount = warnings.filter(w => w.startsWith('AUTO-REPAIRED')).length;
    console.log(`[PostValidate] ${deterministicCount} deterministic fixes, ${autoRepairCount} auto-repairs, ${warnings.length - deterministicCount - autoRepairCount} other warnings`);
    for (const w of warnings) console.log(`  [PostValidate] ${w}`);
  }
  return { files, warnings };
}

// ═══════════════════════════════════════════════════════════════════
// Router Call
// ═══════════════════════════════════════════════════════════════════

const FALLBACK_MODEL = "inworld/backup-router";

async function callModel(
  apiKey: string, model: string, systemPrompt: string,
  userMessage: string, temperature: number, maxTokens: number
): Promise<{ success: boolean; data?: any; raw?: string; error?: string }> {
  console.log(`[Router] Calling ${model} (maxTokens: ${maxTokens})`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const payload: Record<string, any> = {
      model,
      messages: [
        { role: "system", content: systemPrompt + "\n\nIMPORTANT: Return ONLY a single valid JSON object. No markdown, no commentary. Start with { and end with }." },
        { role: "user", content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
      response_format: { type: "json_object" },
    };

    const response = await fetch(INWORLD_API_URL, {
      method: "POST",
      headers: { Authorization: `Basic ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Router] ${model} HTTP ${response.status}: ${errText.substring(0, 300)}`);
      return { success: false, error: `${model} returned ${response.status}: ${errText.substring(0, 200)}` };
    }

    const result = await response.json();
    if (!result.choices?.length) return { success: false, error: `${model}: No choices in response` };

    const choice = result.choices[0];
    const aiText: string | undefined = choice?.message?.content ?? choice?.text ?? choice?.delta?.content;
    if (!aiText || aiText.trim().length < 2) return { success: false, error: `${model}: Empty response` };

    const trimmed = aiText.trim();
    console.log(`[Router] ${model} response: ${trimmed.length} chars`);
    const sanitized = sanitizeRaw(trimmed);
    const parsed = tryParseJSON(sanitized, model);
    return { success: true, data: parsed, raw: trimmed };
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") return { success: false, error: `${model} timed out (55s)` };
    return { success: false, error: `${model}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function callRouter(apiKey: string, config: RouterConfig, userMessage: string): Promise<{ success: boolean; data?: any; raw?: string; error?: string }> {
  const primary = await callModel(apiKey, config.model, config.systemPrompt, userMessage, config.temperature, config.maxTokens);
  if (primary.success) return primary;
  console.log(`[Router] Primary failed, trying fallback...`);
  const fallback = await callModel(apiKey, FALLBACK_MODEL, config.systemPrompt, userMessage, config.temperature, config.maxTokens);
  if (fallback.success) return fallback;
  return { success: false, error: `Both primary and fallback failed. Primary: ${primary.error}. Fallback: ${fallback.error}` };
}

async function handlePipelineStep(apiKey: string, task: RouterTask, userMessage: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const config = ROUTERS[task];
  if (!config) return { success: false, error: `Unknown router task: ${task}` };
  const result = await callRouter(apiKey, config, userMessage);
  if (!result.success) console.error(`[Pipeline] ${task} failed: ${result.error}`);
  return result;
}

// ═══════════════════════════════════════════════════════════════════
// Full Pipeline
// ═══════════════════════════════════════════════════════════════════

async function handleFullPipeline(apiKey: string, prompt: string, categories: string[], context?: string): Promise<Response> {
  const categoriesStr = categories.join(", ");
  const pipelineResults: Record<string, any> = {};
  const allFiles: any[] = [];

  // Step 1: Plan
  console.log("[Pipeline] Step 1/7: Planning...");
  const planPrompt = context
    ? `Build request: "${prompt}"\nCategories: ${categoriesStr}\n\nExisting context:\n${context.substring(0, 2000)}`
    : `Build request: "${prompt}"\nCategories: ${categoriesStr}`;
  const planResult = await handlePipelineStep(apiKey, "plan", planPrompt);
  if (!planResult.success) return errorResponse(`Planning failed: ${planResult.error}`);
  pipelineResults.blueprint = planResult.data;

  // Step 2: Architect
  console.log("[Pipeline] Step 2/7: Architecting...");
  const archPrompt = `Blueprint:\n${JSON.stringify(planResult.data, null, 2)}`;
  const archResult = await handlePipelineStep(apiKey, "architect", archPrompt);
  if (!archResult.success) return errorResponse(`Architecture failed: ${archResult.error}`);
  pipelineResults.architecture = archResult.data;

  // Step 3: Manifest
  console.log("[Pipeline] Step 3/7: Building manifest...");
  const manifestPrompt = `Blueprint:\n${JSON.stringify(planResult.data, null, 2)}\n\nArchitecture:\n${JSON.stringify(archResult.data, null, 2)}`;
  const manifestResult = await handlePipelineStep(apiKey, "manifest", manifestPrompt);
  if (!manifestResult.success) return errorResponse(`Manifest failed: ${manifestResult.error}`);
  pipelineResults.manifest = manifestResult.data;
  const expectedFileCount = manifestResult.data?.totalFileCount || manifestResult.data?.files?.length || 0;

  // Step 4: UI Generation
  console.log("[Pipeline] Step 4/7: Generating UI...");
  const uiPrompt = `Blueprint:\n${JSON.stringify(planResult.data, null, 2)}\n\nArchitecture:\n${JSON.stringify(archResult.data, null, 2)}\n\nFile Manifest:\n${JSON.stringify(manifestResult.data, null, 2)}\n\nIMPORTANT: Generate ALL ${expectedFileCount} files listed in the manifest. Every file must be complete and functional. Do not skip any files.`;
  const uiResult = await handlePipelineStep(apiKey, "ui", uiPrompt);
  if (!uiResult.success) return errorResponse(`UI generation failed: ${uiResult.error}`);
  if (uiResult.data?.files) allFiles.push(...uiResult.data.files);

  // Step 5: Backend/Utilities
  console.log("[Pipeline] Step 5/7: Generating utilities...");
  const backendManifest = manifestResult.data?.backendFiles || manifestResult.data?.files?.filter((f: any) => f.group === "backend") || [];
  const missingUtilFiles = (manifestResult.data?.filesByType?.lib || []).filter(
    (p: string) => !allFiles.some((f: any) => f.path === p)
  );
  const missingTypeFiles = (manifestResult.data?.filesByType?.types || []).filter(
    (p: string) => !allFiles.some((f: any) => f.path === p)
  );
  const missingHookFiles = (manifestResult.data?.filesByType?.hooks || []).filter(
    (p: string) => !allFiles.some((f: any) => f.path === p)
  );
  const allMissing = [...backendManifest.map((f: any) => typeof f === 'string' ? f : f.path), ...missingUtilFiles, ...missingTypeFiles, ...missingHookFiles];

  if (allMissing.length > 0) {
    const backendPrompt = `Blueprint:\n${JSON.stringify(planResult.data, null, 2)}\n\nArchitecture:\n${JSON.stringify(archResult.data, null, 2)}\n\nGenerate these missing files:\n${JSON.stringify(allMissing, null, 2)}\n\nAlready generated files: ${allFiles.map((f: any) => f.path).join(', ')}`;
    const backendResult = await handlePipelineStep(apiKey, "backend", backendPrompt);
    if (backendResult.success && backendResult.data?.files) allFiles.push(...backendResult.data.files);
  }

  // Step 6: Wiring
  console.log("[Pipeline] Step 6/7: Wiring...");
  const fileSummary = allFiles.map((f: any) => `${f.path} (${f.language}): ${(f.content || "").substring(0, 200)}`).join("\n\n");
  const manifestFileList = (manifestResult.data?.files || []).map((f: any) => f.path);
  const generatedPaths = new Set(allFiles.map((f: any) => f.path));
  const stillMissing = manifestFileList.filter((p: string) => !generatedPaths.has(p));

  const wiringPrompt = `All generated files:\n${fileSummary}\n\nManifest expected these files: ${manifestFileList.join(', ')}\n\nStill missing: ${stillMissing.length > 0 ? stillMissing.join(', ') : 'None'}\n\nVerify all imports, exports, and route definitions. Fix broken references. GENERATE any missing files listed above.`;
  const wiringResult = await handlePipelineStep(apiKey, "wiring", wiringPrompt);
  if (wiringResult.success) {
    if (wiringResult.data?.repairedFiles?.length > 0) {
      for (const repaired of wiringResult.data.repairedFiles) {
        const idx = allFiles.findIndex((f: any) => f.path === repaired.path);
        if (idx >= 0) allFiles[idx] = { path: repaired.path, content: repaired.content, language: repaired.language || allFiles[idx].language };
        else allFiles.push({ path: repaired.path, content: repaired.content, language: repaired.language || "typescript" });
      }
    }
    if (wiringResult.data?.missingFiles?.length > 0) {
      for (const missing of wiringResult.data.missingFiles) {
        if (!allFiles.some((f: any) => f.path === missing.path)) {
          allFiles.push({ path: missing.path, content: missing.content, language: missing.language || "typescript" });
        }
      }
    }
  }

  // Step 7: Docs
  console.log("[Pipeline] Step 7/7: Docs...");
  const docPrompt = `Project: ${planResult.data?.projectName || "app"}\nDescription: ${planResult.data?.description || prompt}\n\nFiles:\n${allFiles.map((f: any) => f.path).join("\n")}`;
  const docsResult = await handlePipelineStep(apiKey, "docs", docPrompt);
  if (docsResult.success && docsResult.data?.files) {
    for (const doc of docsResult.data.files) {
      const idx = allFiles.findIndex((f: any) => f.path === doc.path);
      if (idx >= 0) allFiles[idx] = doc;
      else allFiles.push(doc);
    }
  }

  // Post-pipeline validation
  if (allFiles.length === 0) return errorResponse("Pipeline completed but produced no files");

  const validatedFiles = allFiles.map((f: any, i: number) => ({
    path: f.path || `file-${i}.txt`,
    content: f.content || "",
    language: f.language || "text",
  }));

  const { files: finalFiles, warnings } = postPipelineValidate(validatedFiles);

  const finalCount = finalFiles.length;
  if (expectedFileCount > 0 && finalCount < expectedFileCount) {
    warnings.push(`Manifest expected ${expectedFileCount} files, generated ${finalCount}`);
  }

  const projectName = planResult.data?.projectName || "generated-app";
  const explanation = planResult.data?.description || "AI-generated project";
  console.log(`[Pipeline] Complete: ${projectName} (${finalFiles.length} files, ${warnings.length} warnings)`);

  return new Response(
    JSON.stringify({
      success: true,
      projectName,
      explanation,
      files: finalFiles,
      warnings,
      pipeline: {
        blueprint: pipelineResults.blueprint,
        architecture: pipelineResults.architecture,
        manifest: pipelineResults.manifest,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ═══════════════════════════════════════════════════════════════════
// Single-Task & Helpers
// ═══════════════════════════════════════════════════════════════════

async function handleSingleTask(apiKey: string, task: RouterTask, body: any): Promise<Response> {
  const prompt = body.prompt || body.input || "";
  const context = body.context || "";
  const fullPrompt = context ? `${prompt}\n\nContext:\n${context.substring(0, 3000)}` : prompt;
  const result = await handlePipelineStep(apiKey, task, fullPrompt);
  if (!result.success) return errorResponse(`${task} router failed: ${result.error}`);
  return new Response(JSON.stringify({ success: true, task, data: result.data }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 500): Response {
  console.error(`[Error] ${message}`);
  return new Response(JSON.stringify({ success: false, error: message }), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("INWORLD_API_KEY");
    if (!apiKey) return errorResponse("INWORLD_API_KEY not configured");

    const body = await req.json();
    const task: string = body.task || "pipeline";
    const prompt = body.prompt || "Create a simple web application";
    const categories: string[] = body.categories || ["Web"];
    const context = body.context || "";

    console.log(`[Request] task=${task} | prompt="${prompt.substring(0, 80)}..." | categories=${categories.join(",")}`);

    if (task === "pipeline" || task === "generate") {
      return await handleFullPipeline(apiKey, prompt, categories, context);
    }

    const validTasks: RouterTask[] = ["plan", "architect", "manifest", "ui", "backend", "wiring", "debug", "repair", "docs"];
    if (!validTasks.includes(task as RouterTask)) {
      return errorResponse(`Unknown task: ${task}. Valid: pipeline, ${validTasks.join(", ")}`, 400);
    }

    return await handleSingleTask(apiKey, task as RouterTask, body);
  } catch (error) {
    console.error("[Fatal]", error);
    return errorResponse(`Server error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
});
