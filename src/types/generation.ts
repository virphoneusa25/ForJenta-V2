// ─── Generation State Machine (18-state) ──────────────────────────

export type GenerationState =
  | 'idle'
  | 'prompt_received'
  | 'analyzing'
  | 'requirements_extracted'
  | 'app_type_detected'
  | 'stack_selected'
  | 'planning'
  | 'architecting'
  | 'route_planning'
  | 'manifesting'
  | 'dependencies'
  | 'generating_boot_files'
  | 'generating_feature_files'
  | 'wiring'
  | 'validating'
  | 'repairing'
  | 'preview_checking'
  | 'complete'
  | 'failed';

export type StepStatus = 'queued' | 'running' | 'success' | 'failed' | 'repaired' | 'skipped';

// ─── Sub-details for pipeline steps ────────────────────────────────

export interface StepSubDetail {
  label: string;
  value: string;
  status?: 'ok' | 'warn' | 'error';
}

export interface BuildStep {
  id: string;
  index: number;
  name: string;
  label: string;
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  detail?: string;
  errorMessage?: string;
  subDetails?: StepSubDetail[];
}

export interface GeneratedFileCard {
  id: string;
  path: string;
  purpose: string;
  group: 'boot' | 'page' | 'component' | 'hook' | 'lib' | 'style' | 'config' | 'doc' | 'type';
  status: 'queued' | 'generating' | 'streaming' | 'complete' | 'failed' | 'repaired' | 'updated';
  content: string;
  streamedLength: number;
  language: string;
  isNew: boolean;
  validationPassed?: boolean;
  validationDetail?: string;
  repairedAt?: string;
  repairDetail?: string;
  lineCount: number;
  generatedAt?: string;
  completedAt?: string;
  expectedDeps?: string[];
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  timestamp: string;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  detail?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface RepairAction {
  id: string;
  filePath: string;
  issue: string;
  action: string;
  status: 'pending' | 'in_progress' | 'fixed' | 'failed';
  timestamp: string;
}

export interface BuildSummary {
  appType: string;
  stack: string[];
  filesPlanned: number;
  filesCreated: number;
  filesUpdated: number;
  filesRepaired: number;
  filesMissing: number;
  totalLines: number;
  validationResult: 'passed' | 'passed_with_warnings' | 'failed';
  repairCount: number;
  previewStatus: 'ready' | 'fallback' | 'failed';
  duration: number;
  timestamp: string;
  whatWasBuilt: string[];
  nextActions?: string[];
}

// ─── File Action Chips ─────────────────────────────────────────────

export type FileActionType = 'created' | 'edited' | 'updated' | 'repaired' | 'deleted' | 'validated';

export interface FileActionChip {
  path: string;
  action: FileActionType;
}

// ─── Manifest types ────────────────────────────────────────────────

export interface ManifestFile {
  path: string;
  type: 'boot' | 'page' | 'component' | 'hook' | 'lib' | 'style' | 'config' | 'doc' | 'type';
  group: 'frontend' | 'backend' | 'shared';
  dependencies: string[];
  description: string;
}

export interface BuildManifest {
  appType: string;
  stack: string[];
  pages: string[];
  components: string[];
  hooks: string[];
  services: string[];
  configFiles: string[];
  styles: string[];
  routes: { path: string; component: string; file: string }[];
  files: ManifestFile[];
  totalFileCount: number;
}

// ─── Chat Message Types ────────────────────────────────────────────

export type BuildCardType =
  | 'user_prompt'
  | 'assistant_update'
  | 'analysis'
  | 'requirements'
  | 'planning'
  | 'architecture'
  | 'manifest'
  | 'file_generation'
  | 'wiring'
  | 'validation'
  | 'repair'
  | 'diagnostic'
  | 'preview_status'
  | 'summary'
  | 'error'
  | 'assistant';

export interface BuildMessage {
  id: string;
  type: BuildCardType;
  timestamp: string;
  data: any;
}

// ─── Pipeline Step Definitions (18 steps) ──────────────────────────

export const PIPELINE_STEPS: Omit<BuildStep, 'status' | 'startedAt' | 'completedAt' | 'detail' | 'errorMessage' | 'subDetails'>[] = [
  { id: 'prompt',          index: 0,  name: 'prompt_received',         label: 'Prompt Received' },
  { id: 'analyze',         index: 1,  name: 'analyzing',               label: 'Prompt Analyzed' },
  { id: 'requirements',    index: 2,  name: 'requirements_extracted',  label: 'Requirements Extracted' },
  { id: 'app_type',        index: 3,  name: 'app_type_detected',       label: 'App Type Detected' },
  { id: 'stack',           index: 4,  name: 'stack_selected',          label: 'Stack Selected' },
  { id: 'architect',       index: 5,  name: 'architecting',            label: 'Architecture Designed' },
  { id: 'routes',          index: 6,  name: 'route_planning',          label: 'Route Tree Planned' },
  { id: 'manifest',        index: 7,  name: 'manifesting',             label: 'File Manifest Built' },
  { id: 'deps',            index: 8,  name: 'dependencies',            label: 'Dependency Plan Built' },
  { id: 'boot_files',      index: 9,  name: 'generating_boot_files',   label: 'Boot Files Prepared' },
  { id: 'feature_files',   index: 10, name: 'generating_feature_files', label: 'Feature Files Generated' },
  { id: 'wiring',          index: 11, name: 'wiring',                  label: 'Wiring Pass' },
  { id: 'syntax_val',      index: 12, name: 'validating',              label: 'Syntax Validation' },
  { id: 'import_val',      index: 13, name: 'validating',              label: 'Import/Export Validation' },
  { id: 'preview_check',   index: 14, name: 'preview_checking',        label: 'Runtime Preview Check' },
  { id: 'repair',          index: 15, name: 'repairing',               label: 'Repair Pass' },
  { id: 'summary',         index: 16, name: 'complete',                label: 'Final Summary' },
  { id: 'preview_ready',   index: 17, name: 'complete',                label: 'Preview Ready' },
];

// ─── Preview Compatibility Constants ───────────────────────────────

export const REQUIRED_PREVIEW_FILES = ['index.html', 'src/main.tsx', 'src/App.tsx'];

export const LOCKED_CORE_FILES = [
  'index.html',
  'src/main.tsx',
  'src/App.tsx',
];

export const APPROVED_PREVIEW_IMPORTS = new Set([
  'react',
  'react-dom',
  'react-dom/client',
  'react-router-dom',
  'lucide-react',
  'framer-motion',
  'zustand',
  'sonner',
  'clsx',
  'tailwind-merge',
  'class-variance-authority',
]);

export const BANNED_PATTERNS = [
  { pattern: /import\.meta\.env/g, label: 'import.meta.env' },
  { pattern: /process\.env/g, label: 'process.env' },
  { pattern: /import\s*\(/g, label: 'dynamic import()' },
  { pattern: /React\.lazy/g, label: 'React.lazy' },
];
