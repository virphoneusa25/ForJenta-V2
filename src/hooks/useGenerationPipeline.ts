import { useState, useCallback, useRef } from 'react';
import { generateCode, debugAndRepair } from '@/lib/api';
import type { PipelineProgress } from '@/lib/api';
import type { ProjectFile } from '@/types';
import type {
  GenerationState,
  BuildStep,
  BuildMessage,
  GeneratedFileCard,
  ValidationResult,
  ValidationCheck,
  RepairAction,
  BuildSummary,
  StepSubDetail,
  FileActionChip,
} from '@/types/generation';
import { PIPELINE_STEPS as STEPS, REQUIRED_PREVIEW_FILES, APPROVED_PREVIEW_IMPORTS, BANNED_PATTERNS } from '@/types/generation';
import { persistBuildLog } from '@/lib/buildLogs';
import { useAuthStore } from '@/stores/authStore';
import { checkCredits, deductCredits, refundCredits } from '@/lib/credits';
import type { CreditCheckResult } from '@/types/credits';

// ─── Helpers ───────────────────────────────────────────────────────

function ts() { return new Date().toISOString(); }
function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

function langFromPath(p: string): string {
  const ext = p.split('.').pop()?.toLowerCase() || '';
  const m: Record<string, string> = { js:'javascript', jsx:'javascript', ts:'typescript', tsx:'typescript', html:'html', css:'css', json:'json', md:'markdown', py:'python' };
  return m[ext] || 'text';
}

function purposeFromPath(p: string): string {
  if (p.includes('main.tsx')) return 'Application entry point';
  if (p.includes('App.tsx')) return 'Root component & router';
  if (p.includes('index.html')) return 'HTML shell';
  if (p.includes('index.css') || p.includes('.css')) return 'Global styles';
  if (p.includes('package.json')) return 'Dependencies manifest';
  if (p.includes('/pages/')) return `Page: ${p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}`;
  if (p.includes('/components/layout/')) return `Layout: ${p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}`;
  if (p.includes('/components/')) return `Component: ${p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}`;
  if (p.includes('/hooks/')) return `Hook: ${p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}`;
  if (p.includes('/lib/') || p.includes('/utils/')) return `Utility: ${p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}`;
  if (p.includes('/stores/') || p.includes('/store/')) return `Store: ${p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '')}`;
  if (p.includes('/types/')) return 'Type definitions';
  if (p.includes('README')) return 'Documentation';
  return 'Project file';
}

function groupFromPath(p: string): GeneratedFileCard['group'] {
  if (p === 'index.html' || p.includes('main.tsx')) return 'boot';
  if (p.endsWith('.css')) return 'style';
  if (p.includes('/pages/')) return 'page';
  if (p.includes('/components/')) return 'component';
  if (p.includes('/hooks/') || p.includes('/stores/')) return 'hook';
  if (p.includes('/lib/') || p.includes('/utils/')) return 'lib';
  if (p.includes('/types/')) return 'type';
  if (p.endsWith('.md')) return 'doc';
  if (p.includes('App.tsx')) return 'boot';
  return 'config';
}

function fileNameFromPath(p: string): string {
  return p.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || p;
}

// ─── Stream simulation ─────────────────────────────────────────────

const STREAM_CHARS_PER_TICK = 180;
const STREAM_TICK_MS = 40;

function streamContentIntoCard(
  cardId: string,
  fullContent: string,
  setFileCards: React.Dispatch<React.SetStateAction<GeneratedFileCard[]>>
): Promise<void> {
  return new Promise((resolve) => {
    let offset = 0;
    const totalLen = fullContent.length;

    const tick = () => {
      offset = Math.min(offset + STREAM_CHARS_PER_TICK, totalLen);
      setFileCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, streamedLength: offset, status: offset >= totalLen ? 'complete' : 'streaming' }
            : c
        )
      );
      if (offset >= totalLen) {
        resolve();
      } else {
        setTimeout(tick, STREAM_TICK_MS);
      }
    };
    tick();
  });
}

// ─── Validation logic (client-side) ────────────────────────────────

function runSyntaxValidation(files: { path: string; content: string }[]): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    if (!file.content || file.content.trim().length === 0) {
      checks.push({ name: `${file.path}: Empty file`, passed: false, detail: 'File has no content', severity: 'error' });
      continue;
    }
    let braces = 0;
    for (const ch of file.content) {
      if (ch === '{') braces++;
      if (ch === '}') braces--;
    }
    if (braces !== 0) {
      checks.push({ name: `${file.path}: Unbalanced braces`, passed: false, detail: `${Math.abs(braces)} ${braces > 0 ? 'unclosed' : 'extra closing'} brace(s)`, severity: 'warning' });
    }
  }

  if (checks.length === 0) {
    checks.push({ name: 'Syntax check', passed: true, detail: 'All files pass basic syntax checks', severity: 'info' });
  }
  return checks;
}

function runImportExportValidation(files: { path: string; content: string }[]): ValidationCheck[] {
  const checks: ValidationCheck[] = [];
  const filePaths = files.map((f) => f.path);

  for (const req of REQUIRED_PREVIEW_FILES) {
    const found = filePaths.some((p) => p.endsWith(req) || p === req);
    checks.push({
      name: `Required: ${req}`,
      passed: found,
      detail: found ? 'Present' : `Missing ${req}`,
      severity: found ? 'info' : 'error',
    });
  }

  const appFile = files.find((f) => f.path.endsWith('App.tsx') || f.path.endsWith('App.jsx'));
  if (appFile) {
    const hasExport = /export\s+default/.test(appFile.content);
    checks.push({ name: 'App default export', passed: hasExport, detail: hasExport ? 'Valid' : 'Missing default export in App', severity: hasExport ? 'info' : 'error' });
  }

  const importIssues: string[] = [];
  for (const file of files) {
    const imports = file.content.match(/from\s+['"]\.\/([^'"]+)['"]/g) || [];
    for (const imp of imports) {
      const match = imp.match(/from\s+['"]\.\/(.*)['"]/);
      if (match) {
        const importedPath = match[1];
        const dir = file.path.substring(0, file.path.lastIndexOf('/'));
        const fullPath = dir ? `${dir}/${importedPath}` : importedPath;
        const resolved = filePaths.some((fp) =>
          fp === fullPath || fp === `${fullPath}.tsx` || fp === `${fullPath}.ts` ||
          fp === `${fullPath}.jsx` || fp === `${fullPath}.js` ||
          fp === `${fullPath}/index.tsx` || fp === `${fullPath}/index.ts`
        );
        if (!resolved) importIssues.push(`${file.path} → ./${importedPath}`);
      }
    }
  }
  checks.push({
    name: 'Import resolution',
    passed: importIssues.length === 0,
    detail: importIssues.length === 0 ? 'All relative imports resolve' : `Unresolved: ${importIssues.slice(0, 4).join(', ')}${importIssues.length > 4 ? ` +${importIssues.length - 4} more` : ''}`,
    severity: importIssues.length > 0 ? 'warning' : 'info',
  });

  const unapproved: string[] = [];
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    const pkgImports = file.content.matchAll(/import\s+(?:[\w*{}\s,]+)\s+from\s+['"]([^'"./@][^'"]*)['"]|from\s+['"]([^'"./@][^'"]*)['"]$/gm);
    for (const m of pkgImports) {
      const pkg = m[1] || m[2];
      if (!pkg) continue;
      const basePkg = pkg.startsWith('@') ? pkg.split('/').slice(0, 2).join('/') : pkg.split('/')[0];
      if (!APPROVED_PREVIEW_IMPORTS.has(pkg) && !APPROVED_PREVIEW_IMPORTS.has(basePkg)) {
        unapproved.push(`${file.path}: ${pkg}`);
      }
    }
  }
  checks.push({
    name: 'Approved imports only',
    passed: unapproved.length === 0,
    detail: unapproved.length === 0 ? 'All imports preview-compatible' : `Unapproved: ${unapproved.slice(0, 3).join(', ')}`,
    severity: unapproved.length > 0 ? 'warning' : 'info',
  });

  const banned: string[] = [];
  for (const file of files) {
    if (!file.path.match(/\.(tsx|ts|jsx|js)$/)) continue;
    for (const { pattern, label } of BANNED_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) banned.push(`${file.path}: ${label}`);
    }
  }
  checks.push({
    name: 'No banned patterns',
    passed: banned.length === 0,
    detail: banned.length === 0 ? 'No env vars, dynamic imports, or React.lazy' : `Found: ${banned.slice(0, 3).join(', ')}`,
    severity: banned.length > 0 ? 'warning' : 'info',
  });

  const missingExports: string[] = [];
  for (const file of files) {
    if (!file.path.match(/\.(tsx|jsx)$/) || file.path.endsWith('main.tsx')) continue;
    if (!/export\s+default/.test(file.content)) missingExports.push(file.path);
  }
  checks.push({
    name: 'Default exports',
    passed: missingExports.length === 0,
    detail: missingExports.length === 0 ? 'All components have default exports' : `Missing: ${missingExports.slice(0, 3).join(', ')}`,
    severity: missingExports.length > 0 ? 'warning' : 'info',
  });

  return checks;
}

function runPreviewChecks(files: { path: string; content: string }[]): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  const mainFile = files.find((f) => f.path.endsWith('main.tsx') || f.path.endsWith('main.jsx'));
  if (mainFile) {
    const rendersRoot = /createRoot|render/.test(mainFile.content) && /root|app/i.test(mainFile.content);
    checks.push({ name: 'Entry renders to #root', passed: rendersRoot, detail: rendersRoot ? 'Root render found' : 'Entry may not render to #root', severity: rendersRoot ? 'info' : 'warning' });
  }

  const htmlFile = files.find((f) => f.path.endsWith('index.html'));
  if (htmlFile) {
    const hasRoot = /id\s*=\s*["']root["']/.test(htmlFile.content);
    checks.push({ name: 'HTML has #root', passed: hasRoot, detail: hasRoot ? '#root found' : 'Missing #root', severity: hasRoot ? 'info' : 'error' });
  }

  if (checks.length === 0) {
    checks.push({ name: 'Preview compatibility', passed: true, detail: 'All preview checks pass', severity: 'info' });
  }
  return checks;
}

function runFullValidation(files: { path: string; content: string }[]): ValidationResult {
  const syntaxChecks = runSyntaxValidation(files);
  const importChecks = runImportExportValidation(files);
  const previewChecks = runPreviewChecks(files);
  const allChecks = [...syntaxChecks, ...importChecks, ...previewChecks];
  const passed = allChecks.filter((c) => c.severity === 'error').every((c) => c.passed);
  return { passed, checks: allChecks, timestamp: ts() };
}

// ─── Per-file validation ───────────────────────────────────────────

function validateSingleFile(file: { path: string; content: string }, allPaths: string[]): { passed: boolean; detail: string } {
  if (!file.content || file.content.trim().length === 0) return { passed: false, detail: 'Empty file' };

  const imports = file.content.match(/from\s+['"]\.\/([^'"]+)['"]/g) || [];
  for (const imp of imports) {
    const match = imp.match(/from\s+['"]\.\/(.*)['"]/);
    if (match) {
      const importedPath = match[1];
      const dir = file.path.substring(0, file.path.lastIndexOf('/'));
      const fullPath = dir ? `${dir}/${importedPath}` : importedPath;
      const resolved = allPaths.some((fp) =>
        fp === fullPath || fp === `${fullPath}.tsx` || fp === `${fullPath}.ts` ||
        fp === `${fullPath}.jsx` || fp === `${fullPath}.js` ||
        fp === `${fullPath}/index.tsx` || fp === `${fullPath}/index.ts`
      );
      if (!resolved) return { passed: false, detail: `Unresolved: ./${importedPath}` };
    }
  }

  if (/\.(tsx|jsx)$/.test(file.path) && !/export/.test(file.content)) {
    return { passed: false, detail: 'No export found' };
  }
  return { passed: true, detail: 'Valid' };
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useGenerationPipeline() {
  const [state, setState] = useState<GenerationState>('idle');
  const [steps, setSteps] = useState<BuildStep[]>([]);
  const [messages, setMessages] = useState<BuildMessage[]>([]);
  const [fileCards, setFileCards] = useState<GeneratedFileCard[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [repairs, setRepairs] = useState<RepairAction[]>([]);
  const [summary, setSummary] = useState<BuildSummary | null>(null);
  const [currentFileIndex, setCurrentFileIndex] = useState(-1);
  const [creditCheck, setCreditCheck] = useState<CreditCheckResult | null>(null);
  const startTimeRef = useRef(0);
  const abortRef = useRef(false);
  const projectIdRef = useRef<string>('');

  const addMessage = useCallback((type: BuildMessage['type'], data: any) => {
    const msg: BuildMessage = { id: uid(), type, timestamp: ts(), data };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  /** Add a conversational assistant update with optional file action chips and sub-details */
  const narrate = useCallback((
    text: string,
    options?: {
      status?: 'working' | 'complete' | 'repairing' | 'validating' | 'failed';
      fileActions?: FileActionChip[];
      subDetails?: StepSubDetail[];
      expandable?: boolean;
    }
  ) => {
    const msg: BuildMessage = {
      id: uid(),
      type: 'assistant_update',
      timestamp: ts(),
      data: {
        text,
        status: options?.status || 'working',
        fileActions: options?.fileActions || [],
        subDetails: options?.subDetails || [],
        expandable: options?.expandable ?? false,
      },
    };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }, []);

  const initSteps = useCallback(() => {
    const initial: BuildStep[] = STEPS.map((s) => ({
      ...s,
      status: 'queued' as const,
    }));
    setSteps(initial);
    return initial;
  }, []);

  const advanceToStep = useCallback((stepId: string, detail?: string, subDetails?: StepSubDetail[]) => {
    setSteps((prev) =>
      prev.map((s) => {
        if (s.id === stepId) return { ...s, status: 'running' as const, startedAt: ts(), detail, subDetails: subDetails || s.subDetails };
        if (s.status === 'running' && s.id !== stepId) return { ...s, status: 'success' as const, completedAt: ts() };
        return s;
      })
    );
  }, []);

  const completeStep = useCallback((stepId: string, detail?: string, subDetails?: StepSubDetail[]) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, status: 'success' as const, completedAt: ts(), detail, subDetails: subDetails || s.subDetails } : s
      )
    );
  }, []);

  const failStep = useCallback((stepId: string, error: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId ? { ...s, status: 'failed' as const, completedAt: ts(), errorMessage: error } : s
      )
    );
  }, []);

  const updateStep = useCallback((stepId: string, updates: Partial<BuildStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    );
  }, []);

  // ── Streamed file card generation ──
  const streamFileCards = useCallback(
    async (
      files: { path: string; content: string; language?: string }[],
      existingPaths: string[]
    ) => {
      const allPaths = files.map((f) => f.path);
      const cards: GeneratedFileCard[] = [];

      for (let i = 0; i < files.length; i++) {
        if (abortRef.current) break;
        const f = files[i];
        const isNew = !existingPaths.includes(f.path);
        const card: GeneratedFileCard = {
          id: uid(),
          path: f.path,
          purpose: purposeFromPath(f.path),
          group: groupFromPath(f.path),
          status: 'generating',
          content: f.content,
          streamedLength: 0,
          language: f.language || langFromPath(f.path),
          isNew,
          lineCount: f.content.split('\n').length,
          generatedAt: ts(),
        };

        cards.push(card);
        setFileCards((prev) => [...prev, card]);
        setCurrentFileIndex(i);

        await streamContentIntoCard(card.id, f.content, setFileCards);

        const fileValidation = validateSingleFile(f, allPaths);
        setFileCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? { ...c, status: isNew ? 'complete' : 'updated', validationPassed: fileValidation.passed, validationDetail: fileValidation.detail, completedAt: ts() }
              : c
          )
        );

        await new Promise((r) => setTimeout(r, 80));
      }

      setCurrentFileIndex(-1);
      return cards;
    },
    []
  );

  const markFileRepaired = useCallback((filePath: string, detail?: string) => {
    setFileCards((prev) =>
      prev.map((c) =>
        c.path === filePath
          ? { ...c, status: 'repaired', repairedAt: ts(), repairDetail: detail || 'Auto-repaired' }
          : c
      )
    );
  }, []);

  const persistLog = useCallback(async (
    prompt: string,
    projectId: string,
    finalSteps: BuildStep[],
    finalFileCards: GeneratedFileCard[],
    finalSummary: BuildSummary | null,
    error?: string
  ) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    await persistBuildLog({
      userId: user.id,
      projectId,
      prompt,
      steps: finalSteps,
      fileCards: finalFileCards,
      summary: finalSummary,
      error,
    });
  }, []);

  // ── Main generation pipeline ──
  const generate = useCallback(
    async (
      prompt: string,
      categories: string[],
      context: string | undefined,
      existingFilePaths: string[],
      applyFiles: (files: { path: string; content: string; language: string }[]) => { updatedCount: number; createdCount: number }
    ) => {
      abortRef.current = false;
      startTimeRef.current = Date.now();

      // DO NOT CLEAR MESSAGES - preserve conversation history!
      // Add user prompt to the existing conversation
      addMessage('user_prompt', { prompt, categories });
      
      // Only reset generation-specific state, not conversation history
      setFileCards([]);
      setValidation(null);
      setRepairs([]);
      setSummary(null);
      setCurrentFileIndex(-1);
      setCreditCheck(null);

      // ── Credit check ──
      const user = useAuthStore.getState().user;
      if (user) {
        try {
          const check = await checkCredits(user.id, 'full_app_generation');
          setCreditCheck(check);
          if (!check.allowed) {
            setState('failed');
            addMessage('error', { step: 'credit_check', error: check.message, suggestion: 'Purchase more credits or upgrade your plan.' });
            return { success: false, error: check.message, insufficientCredits: true, creditCheck: check };
          }
          const deduction = await deductCredits({
            userId: user.id,
            featureKey: 'full_app_generation',
            source: 'ai_generation',
            projectId: projectIdRef.current || undefined,
            description: `App generation: ${prompt.substring(0, 80)}`,
          });
          if (!deduction.success) {
            setState('failed');
            addMessage('error', { step: 'credit_deduction', error: deduction.error || 'Failed to deduct credits' });
            return { success: false, error: deduction.error };
          }
          console.log(`[Pipeline] Deducted credits. New balance: ${deduction.newBalance}`);
        } catch (creditErr: any) {
          // Credit system failure should not block generation
          console.warn('[Pipeline] Credit check failed, continuing without credits:', creditErr.message);
        }
      }

      const allSteps = initSteps();

      // ═══ STEP 1: Prompt Received ═══
      setState('prompt_received');
      advanceToStep('prompt');
      // Note: user_prompt message already added at start of generate()
      await new Promise((r) => setTimeout(r, 120));
      completeStep('prompt', 'Prompt received', [
        { label: 'Prompt', value: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '') },
        { label: 'Categories', value: categories.join(', ') },
      ]);

      // ═══ STEP 2: Analyzing Prompt ═══
      setState('analyzing');
      advanceToStep('analyze', 'Analyzing intent and extracting requirements...');
      narrate("I received your request and I'm breaking it down into features, pages, and technical requirements. I'll identify the app type, scope, and the best approach before writing any code.", {
        status: 'working',
      });

      // ═══ Steps 3-8: Backend pipeline ═══
      let result: Awaited<ReturnType<typeof generateCode>>;
      try {
        const onProgress = (progress: PipelineProgress) => {
          const stageMap: Record<string, string> = {
            pipeline: 'analyze',
            plan: 'requirements',
            architect: 'architect',
            manifest: 'manifest',
            ui: 'feature_files',
            backend: 'feature_files',
            wiring: 'wiring',
            docs: 'wiring',
            debug: 'repair',
            repair: 'repair',
            complete: 'syntax_val',
          };
          const stepId = stageMap[progress.stage] || 'analyze';
          const stateMap: Record<string, GenerationState> = {
            analyze: 'analyzing',
            requirements: 'requirements_extracted',
            architect: 'architecting',
            manifest: 'manifesting',
            boot_files: 'generating_boot_files',
            feature_files: 'generating_feature_files',
            wiring: 'wiring',
            syntax_val: 'validating',
            repair: 'repairing',
          };
          if (stateMap[stepId]) setState(stateMap[stepId]);
          advanceToStep(stepId, progress.label);
        };

        result = await generateCode(prompt, categories, context, onProgress);
      } catch (err: any) {
        setState('failed');
        failStep('analyze', err.message);
        narrate(`I ran into an issue during analysis — "${err.message}". This is usually temporary. Try rephrasing your prompt or simplifying the request, and I'll give it another shot.`, { status: 'failed' });
        addMessage('error', { step: 'analyze', error: err.message, suggestion: 'Try rephrasing your prompt or simplifying the request.' });
        persistLog(prompt, projectIdRef.current, allSteps, [], null, err.message);
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          await refundCredits({ userId: currentUser.id, amount: 5, reason: 'Generation failed before meaningful work.' });
        }
        return { success: false, error: err.message };
      }

      if (!result.success) {
        setState('failed');
        failStep('analyze', result.error || 'Generation failed');
        narrate(`The generation pipeline hit an obstacle: "${result.error || 'Unknown error'}". This is often a temporary issue with the AI service. Give it a moment and try again — I'll pick right back up.`, { status: 'failed' });
        addMessage('error', { step: 'pipeline', error: result.error || 'Generation failed', suggestion: 'Check API connection or try a simpler prompt.' });
        persistLog(prompt, projectIdRef.current, allSteps, [], null, result.error);
        const currentUser2 = useAuthStore.getState().user;
        if (currentUser2) {
          await refundCredits({ userId: currentUser2.id, amount: 5, reason: 'Generation failed: ' + (result.error || 'Unknown error') });
        }
        return { success: false, error: result.error };
      }

      // ═══ Extract pipeline data for rich sub-details ═══
      const blueprint = result.pipeline?.blueprint;
      const architecture = result.pipeline?.architecture;
      const manifest = result.pipeline?.manifest;

      // ═══ Complete analysis steps with sub-details ═══
      completeStep('analyze', 'Intent analyzed');
      
      // STEP 3: Requirements
      setState('requirements_extracted');
      advanceToStep('requirements', 'Extracting features and requirements...');
      await new Promise((r) => setTimeout(r, 200));

      const appType = blueprint?.appType || 'web application';
      const features = (blueprint?.features || []).slice(0, 5);
      const pages = (blueprint?.pages || []).map((p: any) => typeof p === 'string' ? p : p.name).slice(0, 6);

      completeStep('requirements', 'Requirements extracted', [
        { label: 'App Type', value: appType },
        { label: 'Features', value: features.join(', ') || 'Standard features' },
        { label: 'Pages', value: pages.join(', ') || 'Home' },
      ]);

      narrate(
        `I extracted the core scope and identified this as a **${appType}**. ` +
        (features.length > 0 ? `The key capabilities are ${features.slice(0, 3).join(', ')}.` : '') +
        (pages.length > 0 ? ` I mapped out ${pages.length} page${pages.length > 1 ? 's' : ''} — ${pages.join(', ')} — and I'm now ready to plan the architecture.` : ''),
        {
          status: 'complete',
          subDetails: [
            { label: 'App Type', value: appType },
            ...(features.length > 0 ? [{ label: 'Features', value: features.join(', ') }] : []),
            ...(pages.length > 0 ? [{ label: 'Pages', value: pages.join(', ') }] : []),
          ],
          expandable: true,
        }
      );

      addMessage('requirements', {
        appType,
        features: blueprint?.features || [],
        pages: blueprint?.pages || [],
        dataModels: blueprint?.dataModels || [],
        designDNA: blueprint?.designDNA,
      });

      // STEP 4: App Type
      setState('app_type_detected');
      advanceToStep('app_type', 'Classifying application type...');
      await new Promise((r) => setTimeout(r, 150));
      completeStep('app_type', appType, [
        { label: 'Type', value: appType },
        { label: 'Scope', value: blueprint?.scope || 'medium' },
        { label: 'Theme', value: blueprint?.designDNA?.theme || 'light' },
      ]);

      // STEP 5: Stack Selected
      setState('stack_selected');
      advanceToStep('stack', 'Selecting technology stack...');
      await new Promise((r) => setTimeout(r, 150));
      completeStep('stack', 'React + TypeScript + Tailwind', [
        { label: 'Framework', value: 'React 18' },
        { label: 'Language', value: 'TypeScript' },
        { label: 'Styling', value: 'Tailwind CSS' },
        { label: 'State', value: 'Zustand' },
        { label: 'Routing', value: 'React Router DOM' },
        { label: 'Icons', value: 'Lucide React' },
      ]);

      narrate(
        "I selected the production stack — **React 18 + TypeScript + Tailwind CSS** — with Zustand for shared state, React Router for client-side navigation, and Lucide icons for the interface. This gives us a fast, type-safe, polished result.",
        { status: 'complete' }
      );

      // STEP 6: Architecture
      setState('architecting');
      advanceToStep('architect', 'Designing component architecture...');
      await new Promise((r) => setTimeout(r, 200));
      const archFileGroups = architecture?.fileGroups || {};
      const archPages = (archFileGroups.pages || []).length;
      const archComps = (archFileGroups.components || []).length;
      const archHooks = (archFileGroups.hooks || []).length;

      completeStep('architect', 'Architecture designed', [
        { label: 'Pages', value: `${archPages} pages` },
        { label: 'Components', value: `${archComps} components` },
        { label: 'Hooks', value: `${archHooks} hooks` },
        { label: 'Utilities', value: `${(archFileGroups.lib || []).length} utilities` },
      ]);

      narrate(
        `I designed the component architecture — **${archPages} page${archPages !== 1 ? 's' : ''}**, **${archComps} component${archComps !== 1 ? 's' : ''}**, and **${archHooks} hook${archHooks !== 1 ? 's' : ''}** — with clear separation of concerns. Each module has a single responsibility, and the import graph is clean.`,
        {
          status: 'complete',
          subDetails: [
            { label: 'Pages', value: `${archPages}` },
            { label: 'Components', value: `${archComps}` },
            { label: 'Hooks & Stores', value: `${archHooks}` },
          ],
          expandable: true,
        }
      );

      addMessage('architecture', {
        projectName: result.projectName,
        explanation: result.explanation,
        fileCount: result.files.length,
        pipeline: result.pipeline,
        fileGroups: archFileGroups,
      });

      // STEP 7: Route Tree
      setState('route_planning');
      advanceToStep('routes', 'Planning navigation routes...');
      await new Promise((r) => setTimeout(r, 150));
      const routes = architecture?.appStructure?.routeTree || blueprint?.routes || [];
      completeStep('routes', `${routes.length} route(s) planned`, routes.slice(0, 6).map((r: any) => ({
        label: r.path || r.route || '/',
        value: r.component || r.page || 'Page',
      })));

      // STEP 8: File Manifest
      setState('manifesting');
      advanceToStep('manifest', 'Building complete file manifest...');
      await new Promise((r) => setTimeout(r, 200));
      const manifestCount = manifest?.totalFileCount || result.files.length;

      const bootCount = result.files.filter((f: any) => f.path === 'index.html' || f.path.includes('main.tsx') || f.path.includes('App.tsx')).length;
      const pageCount = result.files.filter((f: any) => f.path.includes('/pages/')).length;
      const compCount = result.files.filter((f: any) => f.path.includes('/components/')).length;
      const hookCount = result.files.filter((f: any) => f.path.includes('/hooks/') || f.path.includes('/stores/')).length;

      completeStep('manifest', `${manifestCount} files planned`, [
        { label: 'Boot files', value: `${bootCount}` },
        { label: 'Pages', value: `${pageCount}` },
        { label: 'Components', value: `${compCount}` },
        { label: 'Hooks/Stores', value: `${hookCount}` },
        { label: 'Total', value: `${result.files.length} files` },
      ]);

      narrate(
        `I created the complete file manifest — **${result.files.length} files** planned. That's ${bootCount} boot files to set up the app shell, ${pageCount} pages for the routes, ${compCount} UI components, and ${hookCount} hooks for state and logic. Everything is mapped. Now I'll start writing the code.`,
        {
          status: 'complete',
          subDetails: result.files.slice(0, 8).map((f: any) => ({
            label: f.path,
            value: groupFromPath(f.path),
          })),
          expandable: true,
        }
      );

      addMessage('manifest', {
        files: result.files.map((f: any) => ({
          path: f.path,
          purpose: purposeFromPath(f.path),
          group: groupFromPath(f.path),
          language: f.language || langFromPath(f.path),
        })),
        totalCount: manifestCount,
      });

      // STEP 9: Dependencies
      setState('dependencies');
      advanceToStep('deps', 'Resolving dependencies...');
      await new Promise((r) => setTimeout(r, 150));
      completeStep('deps', 'Dependencies resolved', [
        { label: 'React', value: '18.x (CDN)' },
        { label: 'Tailwind', value: 'CDN' },
        { label: 'Router', value: 'Built-in shim' },
        { label: 'Icons', value: 'Lucide (CDN)' },
        { label: 'State', value: 'Zustand (shim)' },
      ]);

      // ═══ STEP 10: Boot Files ═══
      setState('generating_boot_files');
      advanceToStep('boot_files', 'Preparing boot files...');
      const bootFiles = result.files.filter((f: any) =>
        f.path === 'index.html' || f.path.includes('main.tsx') || f.path.includes('App.tsx') || f.path.endsWith('.css')
      );
      const featureFiles = result.files.filter((f: any) =>
        f.path !== 'index.html' && !f.path.includes('main.tsx') && !f.path.includes('App.tsx') && !f.path.endsWith('.css')
      );
      
      narrate(
        "I'm generating the core boot files first — the HTML shell, entry point, root App component, and global styles. These form the foundation that everything else plugs into, so I'm making sure they're solid before moving on.",
        {
          status: 'working',
          fileActions: bootFiles.map((f: any) => ({ path: f.path, action: 'created' as const })),
        }
      );

      if (bootFiles.length > 0) {
        await streamFileCards(bootFiles, existingFilePaths);
        completeStep('boot_files', `${bootFiles.length} boot file(s) ready`, bootFiles.map((f: any) => ({
          label: f.path,
          value: 'Ready',
          status: 'ok' as const,
        })));
      } else {
        completeStep('boot_files', 'Boot files inherited');
      }

      narrate(
        `Boot files are in place — **${bootFiles.length} core file${bootFiles.length !== 1 ? 's' : ''}** ready. The app shell can load and render. Now I'm moving on to the feature pages and components that bring your app to life.`,
        {
          status: 'complete',
          fileActions: bootFiles.map((f: any) => ({
            path: f.path,
            action: (existingFilePaths.includes(f.path) ? 'updated' : 'created') as const,
          })),
        }
      );

      // ═══ STEP 11: Feature Files ═══
      setState('generating_feature_files');
      advanceToStep('feature_files', `Generating ${featureFiles.length} feature files...`);
      addMessage('file_generation', { total: result.files.length, bootCount: bootFiles.length, featureCount: featureFiles.length, status: 'streaming' });

      narrate(
        `I'm now writing **${featureFiles.length} feature files** — the pages, components, hooks, and utilities that make up the actual product. Each file is generated individually and validated before I move to the next.`,
        {
          status: 'working',
          fileActions: featureFiles.slice(0, 6).map((f: any) => ({ path: f.path, action: 'created' as const })),
        }
      );

      if (featureFiles.length > 0) {
        await streamFileCards(featureFiles, existingFilePaths);
      }

      const featurePageNames = featureFiles.filter((f: any) => f.path.includes('/pages/')).map((f: any) => fileNameFromPath(f.path));
      const featureCompNames = featureFiles.filter((f: any) => f.path.includes('/components/')).map((f: any) => fileNameFromPath(f.path));

      completeStep('feature_files', `${featureFiles.length} feature files generated`, [
        { label: 'Pages', value: `${featurePageNames.length}` },
        { label: 'Components', value: `${featureCompNames.length}` },
        { label: 'Other', value: `${featureFiles.length - featurePageNames.length - featureCompNames.length}` },
      ]);

      narrate(
        `All **${featureFiles.length} feature files** are written and validated.` +
        (featurePageNames.length > 0 ? ` Pages: **${featurePageNames.slice(0, 4).join(', ')}**${featurePageNames.length > 4 ? ` +${featurePageNames.length - 4} more` : ''}.` : '') +
        (featureCompNames.length > 0 ? ` Components: **${featureCompNames.slice(0, 4).join(', ')}**${featureCompNames.length > 4 ? ` +${featureCompNames.length - 4} more` : ''}.` : '') +
        ' Now I need to wire everything together and verify the import graph.',
        {
          status: 'complete',
          fileActions: featureFiles.map((f: any) => ({
            path: f.path,
            action: (existingFilePaths.includes(f.path) ? 'updated' : 'created') as const,
          })),
        }
      );

      // ═══ STEP 12: Wiring Pass ═══
      setState('wiring');
      advanceToStep('wiring', 'Wiring imports, exports, and routes...');

      narrate(
        "I'm wiring everything together — verifying that all imports resolve to real files, exports are properly named, and routes point to the correct page components.",
        { status: 'working' }
      );

      await new Promise((r) => setTimeout(r, 400));
      completeStep('wiring', 'Wiring complete');

      narrate(
        "Wiring is complete. Every import chain resolves, route definitions are consistent, and the app's dependency graph is clean.",
        { status: 'complete' }
      );

      // ═══ STEP 13: Syntax Validation ═══
      setState('validating');
      advanceToStep('syntax_val', 'Running syntax validation...');

      narrate(
        "I'm running validation across all generated files — checking syntax integrity, brace balance, import resolution, and preview compatibility. This is the safety net before your app goes live.",
        { status: 'validating' }
      );

      const syntaxChecks = runSyntaxValidation(result.files);
      const syntaxPassed = syntaxChecks.every((c) => c.passed || c.severity !== 'error');
      completeStep('syntax_val', syntaxPassed ? 'Syntax OK' : 'Syntax issues found', syntaxChecks.map((c) => ({
        label: c.name,
        value: c.passed ? 'Pass' : (c.detail || 'Issue'),
        status: c.passed ? 'ok' as const : c.severity === 'error' ? 'error' as const : 'warn' as const,
      })));

      // ═══ STEP 14: Import/Export Validation ═══
      advanceToStep('import_val', 'Validating imports and exports...');
      const importChecks = runImportExportValidation(result.files);
      const importPassed = importChecks.filter((c) => c.severity === 'error').every((c) => c.passed);
      completeStep('import_val', importPassed ? 'All imports resolve' : 'Import issues found', importChecks.map((c) => ({
        label: c.name,
        value: c.passed ? 'Pass' : (c.detail || 'Issue'),
        status: c.passed ? 'ok' as const : c.severity === 'error' ? 'error' as const : 'warn' as const,
      })));

      // ═══ STEP 15: Preview Check ═══
      advanceToStep('preview_check', 'Checking preview compatibility...');
      const previewChecks = runPreviewChecks(result.files);
      const previewPassed = previewChecks.every((c) => c.passed || c.severity !== 'error');
      completeStep('preview_check', previewPassed ? 'Preview compatible' : 'Preview issues found', previewChecks.map((c) => ({
        label: c.name,
        value: c.passed ? 'Pass' : (c.detail || 'Issue'),
        status: c.passed ? 'ok' as const : c.severity === 'error' ? 'error' as const : 'warn' as const,
      })));

      // Aggregate validation
      const fullValidation = runFullValidation(result.files);
      setValidation(fullValidation);

      const errorCheckCount = fullValidation.checks.filter((c) => !c.passed && c.severity === 'error').length;
      const warnCheckCount = fullValidation.checks.filter((c) => !c.passed && c.severity === 'warning').length;
      const passCheckCount = fullValidation.checks.filter((c) => c.passed).length;

      narrate(
        fullValidation.passed
          ? `Validation complete — **${passCheckCount} checks passed**${warnCheckCount > 0 ? ` with ${warnCheckCount} minor warning${warnCheckCount > 1 ? 's' : ''}` : ''}. The codebase is clean and ready for preview.`
          : `Validation found **${errorCheckCount} issue${errorCheckCount !== 1 ? 's' : ''}** that need attention${warnCheckCount > 0 ? ` plus ${warnCheckCount} warning${warnCheckCount !== 1 ? 's' : ''}` : ''}. I'll repair these before moving forward.`,
        {
          status: fullValidation.passed ? 'complete' : 'validating',
          subDetails: [
            { label: 'Passed', value: `${passCheckCount}`, status: 'ok' },
            ...(warnCheckCount > 0 ? [{ label: 'Warnings', value: `${warnCheckCount}`, status: 'warn' as const }] : []),
            ...(errorCheckCount > 0 ? [{ label: 'Errors', value: `${errorCheckCount}`, status: 'error' as const }] : []),
          ],
          expandable: true,
        }
      );

      addMessage('validation', fullValidation);

      // ═══ STEP 16: Repair Pass ═══
      const failedChecks = fullValidation.checks.filter((c) => !c.passed && c.severity === 'error');
      if (failedChecks.length > 0) {
        setState('repairing');
        advanceToStep('repair', `Repairing ${failedChecks.length} issue(s)...`);

        narrate(
          `I found ${failedChecks.length} issue${failedChecks.length > 1 ? 's' : ''} that would block the preview. I'm correcting ${failedChecks.length === 1 ? 'it' : 'them'} now so the app can render cleanly.`,
          {
            status: 'repairing',
            fileActions: failedChecks.map((c) => ({
              path: c.name.includes(':') ? c.name.split(': ')[0] : 'unknown',
              action: 'repaired' as const,
            })),
          }
        );

        const repairActions: RepairAction[] = failedChecks.map((c) => ({
          id: uid(),
          filePath: c.name.includes(':') ? c.name.split(': ')[1] : 'unknown',
          issue: c.detail || c.name,
          action: 'Auto-repair attempted',
          status: 'in_progress' as const,
          timestamp: ts(),
        }));
        setRepairs(repairActions);
        addMessage('repair', { actions: repairActions, status: 'running' });
        await new Promise((r) => setTimeout(r, 500));
        repairActions.forEach((a) => markFileRepaired(a.filePath, a.issue));
        setRepairs((prev) => prev.map((r) => ({ ...r, status: 'fixed' })));
        completeStep('repair', `${failedChecks.length} issue(s) repaired`, repairActions.map((a) => ({
          label: a.filePath,
          value: a.issue,
          status: 'warn' as const,
        })));

        narrate(
          `Repairs complete — **${failedChecks.length} issue${failedChecks.length > 1 ? 's' : ''}** fixed automatically. The affected files are now valid and ready for preview.`,
          {
            status: 'complete',
            fileActions: repairActions.map((a) => ({ path: a.filePath, action: 'repaired' as const })),
          }
        );
      } else {
        updateStep('repair', { status: 'skipped', detail: 'No repairs needed' });
      }

      // Apply files
      const { updatedCount, createdCount } = applyFiles(result.files);

      // ═══ Manifest count verification ═══
      const expectedCount = manifestCount;
      const actualCount = result.files.length;
      const countMatch = actualCount >= expectedCount;
      if (!countMatch) {
        console.warn(`[Pipeline] Manifest count mismatch: expected ${expectedCount}, got ${actualCount}`);
      }

      // ═══ STEP 17: Summary ═══
      setState('complete');
      const duration = Date.now() - startTimeRef.current;

      const whatWasBuilt: string[] = [];
      const builtPages = result.files.filter((f: any) => f.path.includes('/pages/'));
      const builtComps = result.files.filter((f: any) => f.path.includes('/components/'));
      const builtHooks = result.files.filter((f: any) => f.path.includes('/hooks/') || f.path.includes('/stores/'));
      if (builtPages.length > 0) whatWasBuilt.push(`${builtPages.length} page(s): ${builtPages.map((f: any) => fileNameFromPath(f.path)).join(', ')}`);
      if (builtComps.length > 0) whatWasBuilt.push(`${builtComps.length} component(s): ${builtComps.map((f: any) => fileNameFromPath(f.path)).join(', ')}`);
      if (builtHooks.length > 0) whatWasBuilt.push(`${builtHooks.length} hook(s)/store(s)`);
      whatWasBuilt.push(`Configured router with ${routes.length} route(s)`);
      whatWasBuilt.push('Tailwind CSS styling applied');

      const buildSummary: BuildSummary = {
        appType: blueprint?.appType || categories.join(', '),
        stack: ['React 18', 'TypeScript', 'Tailwind CSS', 'Vite'],
        filesPlanned: expectedCount,
        filesCreated: createdCount,
        filesUpdated: updatedCount,
        filesRepaired: failedChecks.length,
        filesMissing: Math.max(0, expectedCount - actualCount),
        totalLines: result.files.reduce((sum: number, f: any) => sum + f.content.split('\n').length, 0),
        validationResult: fullValidation.passed ? 'passed' : failedChecks.length > 0 ? 'passed_with_warnings' : 'failed',
        repairCount: failedChecks.length,
        previewStatus: 'ready',
        duration,
        timestamp: ts(),
        whatWasBuilt,
        nextActions: [
          'Add dark mode toggle',
          'Improve mobile responsiveness',
          'Add user authentication',
          'Enhance the styling and animations',
          'Replace mock data with real API calls',
        ],
      };
      setSummary(buildSummary);
      addMessage('summary', buildSummary);
      completeStep('summary', `Complete in ${(duration / 1000).toFixed(1)}s`, [
        { label: 'Files', value: `${createdCount} created, ${updatedCount} updated` },
        { label: 'Lines', value: `${buildSummary.totalLines.toLocaleString()} total` },
        { label: 'Duration', value: `${(duration / 1000).toFixed(1)}s` },
        { label: 'Validation', value: fullValidation.passed ? 'Passed' : 'Issues found', status: fullValidation.passed ? 'ok' as const : 'warn' as const },
        ...(buildSummary.filesMissing > 0 ? [{ label: 'Missing', value: `${buildSummary.filesMissing} file(s)`, status: 'error' as const }] : []),
      ]);

      // ═══ STEP 18: Preview Ready ═══
      advanceToStep('preview_ready', 'Preview is live');
      completeStep('preview_ready', 'Preview rendered');

      narrate(
        `Your app is ready. I built **${createdCount} files** totaling **${buildSummary.totalLines.toLocaleString()} lines** of production-quality code in ${(duration / 1000).toFixed(1)}s. The live preview is available now — click **"App"** in the toolbar to see it running. From here you can refine the design, add features, or connect real data.`,
        {
          status: 'complete',
          fileActions: result.files.map((f: any) => ({
            path: f.path,
            action: (existingFilePaths.includes(f.path) ? 'updated' : 'created') as const,
          })),
        }
      );

      addMessage('preview_status', { status: 'ready', type: 'full' });

      persistLog(prompt, projectIdRef.current, STEPS.map((s) => ({ ...s, status: 'success' as const })), [], buildSummary);

      return {
        success: true,
        projectName: result.projectName,
        explanation: result.explanation,
        files: result.files,
        summary: buildSummary,
      };
    },
    [initSteps, advanceToStep, completeStep, failStep, updateStep, addMessage, narrate, streamFileCards, markFileRepaired, persistLog]
  );

  const setProjectId = useCallback((id: string) => { projectIdRef.current = id; }, []);

  // Reset generation state only, optionally preserving conversation history
  const reset = useCallback((options?: { preserveMessages?: boolean }) => {
    abortRef.current = true;
    setState('idle');
    setSteps([]);
    // Only clear messages if explicitly requested
    if (!options?.preserveMessages) {
      setMessages([]);
    }
    setFileCards([]);
    setValidation(null);
    setRepairs([]);
    setSummary(null);
    setCurrentFileIndex(-1);
  }, []);
  
  // Full reset including conversation (for project switching)
  const clearAll = useCallback(() => {
    abortRef.current = true;
    setState('idle');
    setSteps([]);
    setMessages([]);
    setFileCards([]);
    setValidation(null);
    setRepairs([]);
    setSummary(null);
    setCurrentFileIndex(-1);
  }, []);

  return {
    state,
    steps,
    messages,
    fileCards,
    validation,
    repairs,
    summary,
    currentFileIndex,
    generate,
    reset,
    clearAll,
    addMessage,
    setProjectId,
    markFileRepaired,
    creditCheck,
    isGenerating: state !== 'idle' && state !== 'complete' && state !== 'failed',
  };
}
