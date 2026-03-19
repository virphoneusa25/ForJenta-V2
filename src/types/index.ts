export interface NavigationLink {
  label: string;
  href: string;
  hasDropdown?: boolean;
  dropdownItems?: { label: string; href: string }[];
}

export interface BenchmarkItem {
  name: string;
  score: number;
  isForJenta: boolean;
}

export interface Feature {
  title: string;
  description: string;
}

export interface BuildRequest {
  id: string;
  prompt: string;
  categories: string[];
  timestamp: string;
}

export interface User {
  id: string;
  email: string;
  credits: number;
  trialEndsAt: string | null;
  isTrialActive: boolean;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular: boolean;
  ctaText: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  prompt: string;
  categories: string[];
  createdAt: string;
  files: ProjectFile[];
  versions: Version[];
}

export interface ProjectFile {
  id: string;
  path: string;
  content: string;
  language: string;
}

export interface Version {
  id: string;
  versionNumber: number;
  message: string;
  createdAt: string;
  files: Record<string, string>;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: { path: string; content: string; language: string }[];
}

export interface TerminalLine {
  id: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'command' | 'output';
  timestamp: string;
}
