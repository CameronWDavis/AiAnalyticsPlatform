/**
 * Types mirroring the Flask API's JSON responses.
 *
 * These match what `to_dict()` in api/app/models/* emits. Every timestamp is an
 * ISO 8601 string and every money field is a number.
 */

/** GET /api/users */
export interface User {
  id: number;
  name: string;
  email: string;
  /** ISO 8601 string, or null when the row has no timestamp. */
  created_at: string | null;
}

/** GET /api/categories */
export interface Category {
  id: number;
  user_id: number;
  name: string;
  /** Hex colour like "#3B82F6", or null. */
  color: string | null;
}

/** GET /api/usage_log */
export interface UsageLog {
  id: number;
  user_id: number;
  /** "YYYY-MM-DD" */
  date: string | null;
  model: string;
  platform: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  request_count: number;
  /** Nullable in the schema; already coerced to a float by the API. */
  estimated_cost_usd: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/** GET /api/prompts */
export interface Prompt {
  id: number;
  user_id: number;
  /** Null when the prompt is uncategorised, or its category was deleted. */
  category_id: number | null;
  prompt_text: string;
  response_text: string | null;
  model: string | null;
  platform: string | null;
  /** ISO 8601 string. */
  created_at: string | null;
}

/** GET /api/analytics/summary?days=N */
export interface AnalyticsSummary {
  time_window_days: number;
  total_tokens: number;
  /** Cast to a float by the route; 0 when the window has no usage. */
  estimated_cost_usd: number;
  request_count: number;
  active_users: number;
}
