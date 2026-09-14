import type { ReactNode } from "react";
import { ApiError } from "../api/client";

export function LoadingState({ height = 200 }: { height?: number }) {
  return (
    <div className="skeleton" style={{ height }} role="status" aria-live="polite">
      <span className="visually-hidden">Loading…</span>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="state">
      <p className="state__title">{title}</p>
      {detail && <p className="state__detail">{detail}</p>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const isOffline = error instanceof ApiError && error.status === 0;

  return (
    <div className="state" role="alert">
      <p className="state__title">{isOffline ? "Can’t reach the API" : "Something went wrong"}</p>
      <p className="state__detail">{error.message}</p>
      {isOffline && (
        <p className="state__hint">
          Start the backend with <code className="mono">python run.py</code> in the <code className="mono">api/</code>{" "}
          directory.
        </p>
      )}
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Renders the right state for a resource: skeleton on first load, error with a
 * retry, empty when there is nothing, and the children otherwise — dimmed
 * rather than replaced while a refetch is in flight.
 */
export function ResourceView<T>({
  data,
  error,
  isLoading,
  isRefreshing,
  onRetry,
  isEmpty,
  emptyTitle = "No data yet",
  emptyDetail,
  skeletonHeight,
  children,
}: {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  isRefreshing?: boolean;
  onRetry?: () => void;
  isEmpty?: (data: T) => boolean;
  emptyTitle?: string;
  emptyDetail?: string;
  skeletonHeight?: number;
  children: (data: T) => ReactNode;
}) {
  if (isLoading) return <LoadingState height={skeletonHeight} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (data === undefined) return <LoadingState height={skeletonHeight} />;
  if (isEmpty?.(data)) return <EmptyState title={emptyTitle} detail={emptyDetail} />;

  return <div className={isRefreshing ? "is-refreshing" : undefined}>{children(data)}</div>;
}
