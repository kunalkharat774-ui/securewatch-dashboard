import { useEffect, useState } from 'react';

export function usePersistentComponentState<T extends object>(component: string, initialState: T) {
  const [state, setState] = useState<T>(initialState);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/component-state/${encodeURIComponent(component)}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((remoteState) => {
        if (!cancelled && remoteState && typeof remoteState === 'object') {
          setState((current) => ({ ...current, ...remoteState }));
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [component]);

  const updateState = (nextState: T | ((current: T) => T)) => {
    setState((current) => {
      const next = typeof nextState === 'function'
        ? (nextState as (current: T) => T)(current)
        : nextState;
      void fetch(`/api/component-state/${encodeURIComponent(component)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      return next;
    });
  };

  return [state, updateState] as const;
}