import { useRef, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';

/**
 * Auto-preview hook: watches the project store for file changes
 * and triggers a debounced preview refresh.
 */
export function useAutoPreview(
  projectId: string | undefined,
  debounceMs = 800
): {
  previewKey: number;
  triggerRefresh: () => void;
} {
  const keyRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastHashRef = useRef('');
  const setKeyRef = useRef<(k: number) => void>(() => {});

  // We track previewKey via a simple state-like ref + forceUpdate pattern
  const forceUpdateRef = useRef(0);

  // Get the project files to compute a hash
  const project = useProjectStore((s) => s.getProject(projectId || ''));

  const computeHash = useCallback(() => {
    if (!project) return '';
    // Hash based on file count + paths + content lengths + last modification
    return project.files
      .map((f) => `${f.path}:${f.content.length}`)
      .join('|');
  }, [project]);

  const triggerRefresh = useCallback(() => {
    keyRef.current += 1;
    forceUpdateRef.current += 1;
  }, []);

  useEffect(() => {
    if (!projectId) return;

    const currentHash = computeHash();

    // Skip on initial render or if nothing changed
    if (lastHashRef.current === '' || lastHashRef.current === currentHash) {
      lastHashRef.current = currentHash;
      return;
    }

    lastHashRef.current = currentHash;

    // Debounced refresh
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      keyRef.current += 1;
      forceUpdateRef.current += 1;
      // Dispatch a custom event so the component can listen for it
      window.dispatchEvent(new CustomEvent('forjenta-preview-refresh', { detail: keyRef.current }));
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [projectId, computeHash, debounceMs]);

  return {
    previewKey: keyRef.current,
    triggerRefresh,
  };
}
