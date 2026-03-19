export const APP_NAME = 'ForJenta';
export const APP_DESCRIPTION = 'Build Any App with AI';
export const APP_TAGLINE = 'The #1 AI code generation platform';

export const CATEGORIES = [
  'Web',
  'Mobile',
  'Slack Bot',
  'AI Agent',
  'Chrome Extension',
] as const;

export type Category = (typeof CATEGORIES)[number];
