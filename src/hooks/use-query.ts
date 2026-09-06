import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  /** Relance la requête (fire-and-forget). */
  reload: () => void;
  /** Relance la requête et résout quand elle est terminée (pull-to-refresh). */
  refresh: () => Promise<void>;
}

/**
 * Exécute `run` contre la BDD, au montage et à chaque retour de focus de l'écran.
 * `deps` (sérialisées) forcent une réexécution (ex. filtre catégorie, recherche).
 */
export function useQuery<T>(
  run: (db: SQLiteDatabase) => Promise<T>,
  deps: readonly unknown[] = [],
): QueryState<T> {
  const db = useSQLiteContext();
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [tick, setTick] = useState(0);

  const pendingResolve = useRef<(() => void) | null>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const refresh = useCallback(
    () =>
      new Promise<void>((resolve) => {
        pendingResolve.current = resolve;
        setTick((t) => t + 1);
      }),
    [],
  );

  const depsKey = JSON.stringify(deps);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        setLoading(true);
        try {
          const result = await run(db);
          if (!cancelled) {
            setData(result);
            setError(undefined);
          }
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
        } finally {
          if (!cancelled) setLoading(false);
          pendingResolve.current?.();
          pendingResolve.current = null;
        }
      };

      void load();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db, depsKey, tick]),
  );

  return { data, loading, error, reload, refresh };
}
