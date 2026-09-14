import { apiGet } from "./client";
import type { AnalyticsSummary, Category, Prompt, UsageLog, User } from "./types";

export const getUsers = (signal?: AbortSignal) => apiGet<User[]>("/api/users", { signal });

export const getCategories = (signal?: AbortSignal) => apiGet<Category[]>("/api/categories", { signal });

export const getPrompts = (signal?: AbortSignal) => apiGet<Prompt[]>("/api/prompts", { signal });

export const getUsageLogs = (signal?: AbortSignal) => apiGet<UsageLog[]>("/api/usage_log", { signal });

export const getAnalyticsSummary = (days: number, signal?: AbortSignal) =>
  apiGet<AnalyticsSummary>("/api/analytics/summary", { params: { days }, signal });
