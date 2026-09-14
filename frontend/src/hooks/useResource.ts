import { useCallback, useEffect, useRef, useState } from "react";

export interface Resource<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True only while there is nothing to show yet — drives the skeleton. */
  isLoading: boolean;
  /** True while re-fetching with data already on screen — dims instead of collapsing. */
  isRefreshing: boolean;
  reload: () => void;
}

/**
 * Fetches once per change of `deps` and keeps the previous data visible while a
 * refetch is in flight, so a filter change dims the charts instead of flashing
 * skeletons and jumping the layout.
 */
export function useResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[],
): Resource<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [isPending, setIsPending] = useState(true);
  const [nonce, setNonce] = useState(0);

  // Keep the latest fetcher in a ref so an inline arrow function in the caller
  // does not retrigger the effect on every render.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const hasData = data !== undefined;

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setIsPending(true);

    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(undefined);
      })
      .catch((cause: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause : new Error(String(cause)));
      })
      .finally(() => {
        if (active) setIsPending(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data,
    error,
    isLoading: isPending && !hasData,
    isRefreshing: isPending && hasData,
    reload,
  };
}
