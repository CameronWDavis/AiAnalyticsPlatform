import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getAnalyticsSummary, getUsageLogs } from "../api/endpoints";
import type { UsageLog } from "../api/types";
import { ParticleWave } from "../components/ParticleWave";
import { useResource } from "../hooks/useResource";
import { useReveal } from "../hooks/useReveal";
import { useTheme } from "../hooks/useTheme";
import type { ThemePreference } from "../hooks/useTheme";
import { formatCompact, formatCurrency, formatNumber } from "../lib/format";

const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Auto" },
];

interface Feature {
  title: string;
  body: string;
  to: string;
  link: string;
  icon: string;
  /** The lead card spans the full bento width and carries the sketch. */
  lead?: boolean;
}

const FEATURES: readonly Feature[] = [
  {
    title: "Every prompt you have ever sent, searchable",
    body: "Full prompt and response text with the model that produced it, the platform it ran on and the category you filed it under. Sortable, filterable, and readable as a table — because some questions are answered by reading, not by looking at a chart.",
    to: "/prompts",
    link: "Browse prompts",
    icon: "M4 5h16v11H9l-5 4z",
    lead: true,
  },
  {
    title: "Tokens over time",
    body: "Daily input and output volume stacked by platform, measured against the period before it — so a spike has something to be a spike against.",
    to: "/dashboard",
    link: "See the trend",
    icon: "M4 19h16M4 5v14M8 15l4-6 4 3 4-7",
  },
  {
    title: "Per-user accounting",
    body: "All-time tokens, requests and spend for everyone on the platform, with one filter that scopes every chart to a single person.",
    to: "/users",
    link: "View users",
    icon: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0",
  },
];

const PIPELINE = [
  { title: "Log usage", body: "One row per user, day, model and platform, counting input and output tokens separately." },
  { title: "Capture prompts", body: "Prompt and response text stored next to the model that produced it." },
  { title: "Categorise", body: "Your own labels — coding, research, debugging — applied per prompt." },
  { title: "Read the result", body: "Charts and tables over all of it, scoped by range, platform and user." },
] as const;

const SPARK_HEIGHTS = [38, 56, 92, 64, 47, 72];

export function Landing() {
  const theme = useTheme();

  // Live numbers are a bonus, not a dependency: if the API is down the page
  // still renders in full, just without them.
  const summary = useResource((signal) => getAnalyticsSummary(30, signal), []);
  const logs = useResource<UsageLog[]>((signal) => getUsageLogs(signal), []);
  const stats = summary.error ? undefined : summary.data;

  const inventory = useMemo(() => {
    const rows = logs.data ?? [];
    return {
      models: new Set(rows.map((row) => row.model)).size,
      platforms: new Set(rows.map((row) => row.platform)).size,
    };
  }, [logs.data]);

  useReveal(stats !== undefined);

  return (
    <div className="landing">
      <div className="brand-stripe" aria-hidden="true" />

      <header className="topnav">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            AI
          </span>
          <div>
            <div className="brand__name">Analytics</div>
            <div className="brand__sub">Prompt &amp; token usage</div>
          </div>
        </div>

        <div className="topnav__actions">
          <div className="segmented" role="group" aria-label="Colour theme">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="segmented__option"
                aria-pressed={theme.preference === option.value}
                onClick={() => theme.setPreference(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <Link className="button button--primary" to="/dashboard">
            Open dashboard
          </Link>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div className="reveal">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              {stats ? "Live · connected to your API" : "Self-hosted telemetry"}
            </p>

            <h1 className="hero__title">
              Your models are spending <em>real money</em> right now.
            </h1>

            <p className="hero__lede">
              Every prompt costs something. This reads your own usage database and tells you exactly what — which model,
              which platform, which person, which day.
            </p>

            <div className="hero__actions">
              <Link className="button button--primary button--lg" to="/dashboard">
                Open dashboard
                <span className="button__icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
              <Link className="button button--lg button--ghost" to="/usage">
                Browse raw logs
                <span className="button__icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h13M13 6l6 6-6 6" />
                  </svg>
                </span>
              </Link>
            </div>

            <p className="hero__note">
              Postgres → Flask → this page. No third party sees your prompts.
            </p>
          </div>

          <figure className="wavecard bezel reveal" data-reveal-delay="120">
            <div className="wavecard__core bezel__core">
              <div className="wavecard__head">
                <span className="wavecard__label">Tokens · last 30 days</span>
                <span className="wavecard__value">{stats ? formatCompact(stats.total_tokens) : "—"}</span>
              </div>
              <ParticleWave className="wave" />
              <figcaption className="wavecard__foot">
                <span className="legend__item">
                  <span className="legend__swatch" style={{ background: "var(--series-1)" }} aria-hidden="true" />
                  Anthropic
                </span>
                <span className="legend__item">
                  <span className="legend__swatch" style={{ background: "var(--series-2)" }} aria-hidden="true" />
                  OpenAI
                </span>
                <span className="legend__item">
                  <span className="legend__swatch" style={{ background: "var(--series-3)" }} aria-hidden="true" />
                  Google
                </span>
              </figcaption>
            </div>
          </figure>
        </section>
      </div>

      {stats && (
        <section className="strip reveal" aria-label="Totals for the last 30 days">
          <div className="strip__cell">
            <p className="strip__value">{formatCompact(stats.total_tokens)}</p>
            <p className="strip__label">Tokens</p>
          </div>
          <div className="strip__cell">
            <p className="strip__value">{formatCurrency(stats.estimated_cost_usd)}</p>
            <p className="strip__label">Spend</p>
          </div>
          <div className="strip__cell">
            <p className="strip__value">{formatNumber(stats.request_count)}</p>
            <p className="strip__label">Requests</p>
          </div>
          <div className="strip__cell">
            <p className="strip__value">{formatNumber(inventory.models)}</p>
            <p className="strip__label">Models</p>
          </div>
          <div className="strip__cell">
            <p className="strip__value">{formatNumber(inventory.platforms)}</p>
            <p className="strip__label">Platforms</p>
          </div>
        </section>
      )}

      <div className="wrap">
        <section className="section">
          <div className="section__head reveal">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              What you get
            </p>
            <h2 className="section__title">Three questions, answered without writing a query.</h2>
            <p className="section__lede">
              The dashboard is built around how the bill actually goes wrong: one model quietly dominating, one week
              that spiked, one person who found a new workflow.
            </p>
          </div>

          <div className="bento">
            {FEATURES.map((feature, index) => (
              <article
                className={`feature reveal${feature.lead ? " feature--lead" : ""}`}
                data-reveal-delay={index * 80}
                key={feature.title}
              >
                <div>
                  <div className="feature__icon" aria-hidden="true">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d={feature.icon} />
                    </svg>
                  </div>
                  <h3 className="feature__title">{feature.title}</h3>
                  <p className="feature__body">{feature.body}</p>
                  <Link className="feature__link" to={feature.to}>
                    {feature.link} <span aria-hidden="true">→</span>
                  </Link>
                </div>

                {feature.lead && (
                  <div className="sparkbars" aria-hidden="true">
                    {SPARK_HEIGHTS.map((height, i) => (
                      <i key={i} style={{ height: `${height}%` }} />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section__head reveal">
            <p className="eyebrow">
              <span className="eyebrow__dot" aria-hidden="true" />
              How it works
            </p>
            <h2 className="section__title">Four tables and no vendor.</h2>
            <p className="section__lede">
              Everything here reads from your own Postgres database. Nothing is uploaded, and nothing calls out.
            </p>
          </div>

          <div className="pipeline">
            {PIPELINE.map((step, index) => (
              <div className="pipeline__step reveal" data-reveal-delay={index * 70} key={step.title}>
                <p className="pipeline__index">0{index + 1}</p>
                <h3 className="pipeline__title">{step.title}</h3>
                <p className="pipeline__body">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta bezel reveal">
          <div className="cta__core bezel__core">
            <div>
              <h2 className="cta__title">See where it all went.</h2>
              <p className="cta__body">
                {stats
                  ? "Your API is answering and the data is loaded."
                  : "Start the Flask API on port 5000 and this page will pick it up."}
              </p>
            </div>
            <Link className="button button--primary button--lg" to="/dashboard">
              Open dashboard
              <span className="button__icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h13M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          </div>
        </section>

        <footer className="landing__footer">
          <span>AI Analytics Platform</span>
          <span>Self-hosted prompt and token analytics</span>
        </footer>
      </div>
    </div>
  );
}
