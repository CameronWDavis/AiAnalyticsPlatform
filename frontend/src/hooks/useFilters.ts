import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Filters } from "../lib/aggregate";

const ALLOWED_DAYS = [7, 30, 90];
const DEFAULT_DAYS = 30;

/**
 * Filter state lives in the URL, so a filtered view is a shareable link and the
 * back button steps through filter changes.
 */
export function useFilters(): [Filters, (next: Filters) => void] {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<Filters>(() => {
    const days = Number(params.get("days"));
    const userParam = params.get("user");
    const userId = userParam && userParam !== "all" && Number.isFinite(Number(userParam)) ? Number(userParam) : "all";

    return {
      days: ALLOWED_DAYS.includes(days) ? days : DEFAULT_DAYS,
      platform: params.get("platform") ?? "all",
      userId,
    };
  }, [params]);

  const setFilters = useCallback(
    (next: Filters) => {
      const updated = new URLSearchParams();
      if (next.days !== DEFAULT_DAYS) updated.set("days", String(next.days));
      if (next.platform !== "all") updated.set("platform", next.platform);
      if (next.userId !== "all") updated.set("user", String(next.userId));
      setParams(updated, { replace: true });
    },
    [setParams],
  );

  return [filters, setFilters];
}
