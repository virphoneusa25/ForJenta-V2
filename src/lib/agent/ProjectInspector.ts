/**
 * ProjectInspector - Analyzes existing project context for the AI Build Agent
 * 
 * Inspects current project state, file structure, and patterns
 * to provide intelligent context for generation decisions.
 */

import type { ProjectFile } from '@/types';

export interface ProjectInspection {
  summary: string;
  fileTree: FileTreeNode[];
  techStack: string[];
  patterns: CodePattern[];
  recentChanges: string[];
  potentialIssues: string[];
  relevantFiles: string[];
  architecture: ArchitectureInfo;
}

export interface FileTreeNode {
  path: string;
  type: 'file' | 'directory';
  language?: string;
  lineCount?: number;
  children?: FileTreeNode[];
}

export interface CodePattern {
  name: string;
  description: string;
  examples: string[];
}

export interface ArchitectureInfo {
  appType: string;
  framework: string;
  stateManagement: string;
  styling: string;
  routing: boolean;
  pages: string[];
  components: string[];
  hooks: string[];
  stores: string[];
}

/**
 * Inspect a project and return comprehensive analysis
 */
export function inspectProject(files: ProjectFile[]): ProjectInspection {
  const fileTree = buildFileTree(files);
  const techStack = detectTechStack(files);
  const patterns = detectPatterns(files);
  const architecture = analyzeArchitecture(files);
  const potentialIssues = detectIssues(files);
  
  const summary = generateSummary(files, architecture, techStack);
  
  return {
    summary,
    fileTree,
    techStack,
    patterns,
    recentChanges: [], // Would come from version history
    potentialIssues,
    relevantFiles: files.map(f => f.path),
    architecture,
  };
}

/**
 * Build a hierarchical file tree from flat file list
 */
function buildFileTree(files: ProjectFile[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];
  const dirs: Map<string, FileTreeNode> = new Map();
  
  // Sort files by path
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));
  
  for (const file of sortedFiles) {
    const parts = file.path.split('/');
    
    if (parts.length === 1) {
      // Root level file
      root.push({
        path: file.path,
        type: 'file',
        language: file.language,
        lineCount: file.content.split('\n').length,
      });
    } else {
      // Nested file - ensure parent directories exist
      let currentPath = '';
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!dirs.has(currentPath)) {
          const dirNode: FileTreeNode = {
            path: currentPath,
            type: 'directory',
            children: [],
          };
          dirs.set(currentPath, dirNode);
          
          // Add to parent
          if (parentPath && dirs.has(parentPath)) {
            dirs.get(parentPath)!.children!.push(dirNode);
          } else if (!parentPath) {
            root.push(dirNode);
          }
        }
      }
      
      // Add file to its parent directory
      const parentDir = currentPath;
      const fileNode: FileTreeNode = {
        path: file.path,
        type: 'file',
        language: file.language,
        lineCount: file.content.split('\n').length,
      };
      
      if (dirs.has(parentDir)) {
        dirs.get(parentDir)!.children!.push(fileNode);
      }
    }
  }
  
  return root;
}

/**
 * Detect the technology stack from file contents
 */
function detectTechStack(files: ProjectFile[]): string[] {
  const stack: Set<string> = new Set();
  
  for (const file of files) {
    const content = file.content;
    
    // Frameworks
    if (content.includes("from 'react'") || content.includes('from "react"')) {
      stack.add('React');
    }
    if (content.includes("from 'vue'") || content.includes('from "vue"')) {
      stack.add('Vue');
    }
    if (content.includes("from 'svelte'") || content.includes('from "svelte"')) {
      stack.add('Svelte');
    }
    
    // TypeScript
    if (file.path.endsWith('.ts') || file.path.endsWith('.tsx')) {
      stack.add('TypeScript');
    }
    
    // Styling
    if (content.includes('tailwind') || content.includes('className=')) {
      stack.add('Tailwind CSS');
    }
    if (file.path.endsWith('.css') || file.path.endsWith('.scss')) {
      if (file.path.endsWith('.scss')) {
        stack.add('SCSS');
      } else if (!stack.has('Tailwind CSS')) {
        stack.add('CSS');
      }
    }
    
    // State Management
    if (content.includes('zustand') || content.includes('create(')) {
      stack.add('Zustand');
    }
    if (content.includes('redux') || content.includes('createSlice')) {
      stack.add('Redux');
    }
    if (content.includes('@tanstack/react-query') || content.includes('useQuery')) {
      stack.add('React Query');
    }
    
    // Routing
    if (content.includes('react-router') || content.includes('BrowserRouter')) {
      stack.add('React Router');
    }
    
    // Icons
    if (content.includes('lucide-react') || content.includes('from \'lucide-react\'')) {
      stack.add('Lucide Icons');
    }
    if (content.includes('heroicons')) {
      stack.add('Heroicons');
    }
    
    // Animation
    if (content.includes('framer-motion')) {
      stack.add('Framer Motion');
    }
    
    // Forms
    if (content.includes('react-hook-form')) {
      stack.add('React Hook Form');
    }
    if (content.includes('zod')) {
      stack.add('Zod');
    }
  }
  
  return Array.from(stack);
}

/**
 * Detect coding patterns in the project
 */
function detectPatterns(files: ProjectFile[]): CodePattern[] {
  const patterns: CodePattern[] = [];
  
  // Component patterns
  const hasDefaultExports = files.some(f => 
    f.path.endsWith('.tsx') && /export\s+default\s+function/.test(f.content)
  );
  if (hasDefaultExports) {
    patterns.push({
      name: 'Functional Components',
      description: 'Components are defined as functions with default exports',
      examples: files.filter(f => /export\s+default\s+function/.test(f.content)).map(f => f.path).slice(0, 3),
    });
  }
  
  // Hook patterns
  const customHooks = files.filter(f => 
    f.path.includes('/hooks/') && /^export\s+(function|const)\s+use[A-Z]/.test(f.content)
  );
  if (customHooks.length > 0) {
    patterns.push({
      name: 'Custom Hooks',
      description: 'Custom React hooks for shared logic',
      examples: customHooks.map(f => f.path).slice(0, 3),
    });
  }
  
  // Store patterns
  const stores = files.filter(f => 
    f.path.includes('/stores/') || f.content.includes('create(')
  );
  if (stores.length > 0) {
    patterns.push({
      name: 'Zustand Stores',
      description: 'State management using Zustand stores',
      examples: stores.map(f => f.path).slice(0, 3),
    });
  }
  
  // API patterns
  const apiFiles = files.filter(f => 
    f.path.includes('/api') || f.path.includes('/lib/') && f.content.includes('fetch')
  );
  if (apiFiles.length > 0) {
    patterns.push({
      name: 'API Layer',
      description: 'Centralized API functions',
      examples: apiFiles.map(f => f.path).slice(0, 3),
    });
  }
  
  return patterns;
}

/**
 * Analyze the project architecture
 */
function analyzeArchitecture(files: ProjectFile[]): ArchitectureInfo {
  const pages = files.filter(f => f.path.includes('/pages/')).map(f => {
    const name = f.path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
    return name;
  });
  
  const components = files.filter(f => f.path.includes('/components/')).map(f => {
    const name = f.path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
    return name;
  });
  
  const hooks = files.filter(f => f.path.includes('/hooks/')).map(f => {
    const name = f.path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
    return name;
  });
  
  const stores = files.filter(f => f.path.includes('/stores/')).map(f => {
    const name = f.path.split('/').pop()?.replace(/\.(tsx|ts|jsx|js)$/, '') || '';
    return name;
  });
  
  // Detect app type
  let appType = 'web application';
  const hasAuth = files.some(f => f.content.includes('auth') || f.content.includes('login'));
  const hasDashboard = files.some(f => f.path.includes('dashboard') || f.content.includes('Dashboard'));
  const hasLanding = files.some(f => f.path.includes('landing') || f.path.includes('home'));
  const hasEcommerce = files.some(f => f.content.includes('cart') || f.content.includes('checkout'));
  
  if (hasDashboard) appType = 'dashboard application';
  if (hasEcommerce) appType = 'e-commerce application';
  if (hasLanding && !hasDashboard) appType = 'landing page / marketing site';
  
  // Detect framework
  const isReact = files.some(f => f.content.includes("from 'react'"));
  const framework = isReact ? 'React' : 'Unknown';
  
  // Detect state management
  const hasZustand = files.some(f => f.content.includes('zustand'));
  const hasRedux = files.some(f => f.content.includes('redux'));
  const stateManagement = hasZustand ? 'Zustand' : hasRedux ? 'Redux' : 'React State';
  
  // Detect styling
  const hasTailwind = files.some(f => f.content.includes('tailwind') || f.content.includes('className='));
  const styling = hasTailwind ? 'Tailwind CSS' : 'CSS';
  
  // Detect routing
  const hasRouting = files.some(f => f.content.includes('react-router') || f.content.includes('BrowserRouter'));
  
  return {
    appType,
    framework,
    stateManagement,
    styling,
    routing: hasRouting,
    pages,
    components,
    hooks,
    stores,
  };
}

/**
 * Detect potential issues in the project
 */
function detectIssues(files: ProjectFile[]): string[] {
  const issues: string[] = [];
  
  for (const file of files) {
    // Check for empty files
    if (!file.content || file.content.trim().length === 0) {
      issues.push(`Empty file: ${file.path}`);
      continue;
    }
    
    // Check for unbalanced braces
    let braces = 0;
    for (const ch of file.content) {
      if (ch === '{') braces++;
      if (ch === '}') braces--;
    }
    if (braces !== 0) {
      issues.push(`Unbalanced braces in ${file.path}`);
    }
    
    // Check for console.log statements (potential debug leftovers)
    if (file.content.includes('console.log') && !file.path.includes('test')) {
      issues.push(`Debug statement in ${file.path}`);
    }
    
    // Check for TODO comments
    if (file.content.includes('TODO') || file.content.includes('FIXME')) {
      issues.push(`Unfinished work in ${file.path}`);
    }
  }
  
  return issues.slice(0, 10); // Limit to 10 issues
}

/**
 * Generate a human-readable summary of the project
 */
function generateSummary(
  files: ProjectFile[],
  architecture: ArchitectureInfo,
  techStack: string[]
): string {
  const fileCount = files.length;
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  
  let summary = `This is a ${architecture.appType} built with ${architecture.framework}`;
  
  if (techStack.includes('TypeScript')) {
    summary += ' and TypeScript';
  }
  
  summary += `. It has ${fileCount} files totaling ${totalLines.toLocaleString()} lines of code.`;
  
  if (architecture.pages.length > 0) {
    summary += ` The app has ${architecture.pages.length} page(s): ${architecture.pages.slice(0, 4).join(', ')}${architecture.pages.length > 4 ? ` and ${architecture.pages.length - 4} more` : ''}.`;
  }
  
  if (architecture.components.length > 0) {
    summary += ` There are ${architecture.components.length} component(s) providing the UI.`;
  }
  
  summary += ` State is managed with ${architecture.stateManagement}, and styling uses ${architecture.styling}.`;
  
  if (architecture.routing) {
    summary += ' Client-side routing is enabled.';
  }
  
  return summary;
}

/**
 * Find files relevant to a specific task
 */
export function findRelevantFiles(
  files: ProjectFile[],
  taskDescription: string,
  targetedAreas: string[]
): string[] {
  const relevant: Set<string> = new Set();
  const descLower = taskDescription.toLowerCase();
  
  for (const file of files) {
    const pathLower = file.path.toLowerCase();
    const contentLower = file.content.toLowerCase();
    
    // Check if file path matches any targeted area
    for (const area of targetedAreas) {
      if (pathLower.includes(area.toLowerCase().replace(/\//g, '').replace(/\s+/g, ''))) {
        relevant.add(file.path);
      }
    }
    
    // Check for keyword matches in content
    const keywords = descLower.split(/\s+/).filter(w => w.length > 3);
    for (const keyword of keywords) {
      if (contentLower.includes(keyword) || pathLower.includes(keyword)) {
        relevant.add(file.path);
      }
    }
  }
  
  // Always include entry points
  for (const file of files) {
    if (file.path.includes('App.tsx') || file.path.includes('main.tsx') || file.path === 'index.html') {
      relevant.add(file.path);
    }
  }
  
  return Array.from(relevant);
}

/**
 * Generate a conversational summary of the inspection
 */
export function getInspectionNarration(inspection: ProjectInspection): string {
  const { summary, architecture, potentialIssues, techStack } = inspection;
  
  let narration = `I reviewed the current workspace. ${summary}`;
  
  if (potentialIssues.length > 0) {
    narration += ` I noticed ${potentialIssues.length} potential issue(s) that might need attention.`;
  }
  
  return narration;
}
