# AI Analytics Platform — Frontend

React + TypeScript dashboard for the Flask analytics API in `../api`.

## Stack

| | |
|---|---|
| Build | Vite 8 |
| UI | React 19, React Router 7 |
| Charts | Recharts 3 |
| Types | TypeScript 7, `strict` + `noUncheckedIndexedAccess` |
| Styling | Plain CSS with custom-property design tokens (`src/styles/theme.css`) |
| Type | Space Grotesk (display), Plus Jakarta Sans (body), JetBrains Mono (numerals) — self-hosted via `@fontsource-variable`, no font CDN at runtime |

No CSS framework and no data-fetching library — the app is small enough that a
typed `fetch` wrapper and a `useResource` hook cover it.

## Running it

The backend must be up first:

```bash
cd ../database && docker compose up -d
```

```bash
cd ../api && python run.py
```

Then, in this directory:

```bash
npm install
```

```bash
npm run dev
```

The app is served at <http://localhost:5173> — the port is pinned with
`strictPort`, because `api/app/__init__.py` allows exactly that origin via CORS.

`/api/*` requests go through the Vite dev proxy to `http://127.0.0.1:5000`, so
the browser only ever talks to one origin. Point the proxy somewhere else with
`VITE_PROXY_TARGET`, or bypass it entirely by setting `VITE_API_BASE_URL` to an
absolute API origin. See `.env.example`.

### Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server with HMR on port 5173 |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the built output |
| `npm run typecheck` | Types only, no emit |

## Layout

```
src/
  api/          client.ts (fetch + ApiError), endpoints.ts, types.ts
  lib/          aggregate.ts (all derived metrics), format.ts, palette.ts
  hooks/        useResource, useFilters (URL-backed), useTheme
  components/   shell, Ledger, Panel, filter bar, DataTable, ParticleWave, charts/
  pages/        Landing, Dashboard, UsageLogs, Prompts, Users, Categories
```

### Routes

| Route | Page |
|---|---|
| `/` | Landing page — hero, live totals, feature overview. Rendered **outside** the app shell, so it has no sidebar and gets the full viewport width. |
| `/dashboard` | KPI tiles, tokens over time stacked by platform, tokens by model, cost by platform, input vs. output split, prompts by category. |
| `/usage`, `/prompts`, `/users`, `/categories` | Searchable, sortable tables. |

The sidebar brand links back to `/`, and every call to action on the landing
page leads into `/dashboard`.

The landing page's stat strip reads `/api/analytics/summary` and `/api/usage_log`
live, but treats them as optional: if the API is down the strip and the hero
figure are simply omitted and the rest of the page still renders. The hero
artwork (`src/components/HeroArt.tsx`) is a static illustration, not a chart of
real data — it carries no values or axis so it never invites a reading.

Filter state (range, platform, user) lives in the URL query string, so a
filtered dashboard is a shareable link and the back button steps through filter
changes.

## How it talks to the API

Every endpoint the Flask app exposes is read-only, so this is a read-only
dashboard — there are no create/edit flows.

| Endpoint | Used by |
|---|---|
| `GET /api/users` | Users page, user filter, name lookups |
| `GET /api/categories` | Categories page, prompt category labels |
| `GET /api/prompts` | Prompts page, prompts-by-category chart |
| `GET /api/usage_log` | Everything on the dashboard |
| `GET /api/analytics/summary?days=N` | Cross-check against the API's own totals |

### API contract notes

`/api/analytics/summary` takes only a `days` parameter — it has no platform or
user filter — so the KPI tiles are computed client-side from `usage_log`, and
the API's own `active_users` figure is shown alongside as a cross-check only
when no platform or user filter is applied.

Everything else maps one-to-one: every timestamp is an ISO 8601 string, every
money field is a number, and each model's `to_dict()` exposes its own primary
key plus its foreign keys under their real column names.

## Design contract

What this interface is allowed to look like. Read it before changing layout.

**Hierarchy.** The product answers one question: what are the models costing,
and what changed? The dashboard ranks by that — spend first as the headline
figure, then the single model most responsible for the movement, then volume
over time, then breakdowns, then prompt mix. Tokens and requests are
subordinate typography in the headline band, never peers of it.

**Allowed.** A typographic ledger band; numbered section headers under rules;
full-bleed plots sitting directly on the page; ranked rows; tables; quiet
text-weight toggles.

**Forbidden** — the specific ways this page used to look machine-made:

- **Equal-weight KPI card grids.** Four rounded cards in a row, each with a
  label, a number and a delta chip, is the most recognisable agent-generated
  dashboard there is. Spend has rank; the layout has to show it.
- **A rounded card around every chart.** Uniform containers claim every section
  matters equally, which is false.
- **Filler metrics.** A number earns its place by changing a decision. "Active
  users: 4" on a four-person team does not.
- **A delta against a baseline that does not exist.** Show "no prior period"
  instead — and say nothing about what moved, since with no baseline every
  figure reads as newly added.
- **Repeated identical chrome.** One quiet affordance per plot, not the same
  segmented control five times down the page.
- **Decorative charts.** Anything chart-shaped that is not plotting real data
  carries no axis and no values (see the landing hero).

**Required states.** Every data surface ships all of them; a missing state is
an unfinished screen:

| State | Behaviour |
|---|---|
| Loading (first) | Skeleton at the final height. No layout jump when data lands. |
| Refreshing | Previous render held at reduced opacity. Never a skeleton flash. |
| Error | What failed, plus a retry. Names the likely cause when knowable. |
| Empty (no data) | Says why, and what would fill it. |
| Empty (filtered out) | Distinguished from no-data. Names the query, says what the filter searches, offers a way to clear it. |
| Hover | On every interactive row and mark. |
| Keyboard focus | Visible on everything focusable; same information as hover. |
| Reduced motion | All animation off, nothing hidden. |

**Finish gate.** A screen fails if: a row of equal-weight metric cards exists; a
metric is shown that nobody would act on; a delta is shown against a
non-existent baseline; every section has the same visual weight; any required
state is missing; a chart has no table equivalent; or a colour carries meaning
with no label beside it.

## Visual design

A vivid jade green (`#0fae76`) runs through the product: the stripe pinned above
every page, the primary actions, the active nav item, and the first chart slot.

**Surfaces.** The landing page is white by design, so `light` is the default
theme rather than following the OS; dark is one click away and is remembered per
browser. Dark mode is a green-tinted charcoal (`#121816`), deliberately **not**
near-black — near-black plus a lone acid-green accent is the single most
over-produced "AI product" look, and the palette avoids it by keeping white as
the primary surface and never letting green appear alone (blue and orange carry
data alongside it).

**Contrast.** Green type on white uses `--brand-text` (`#087a53`, 5.36:1) rather
than the vivid step, and green buttons use near-black ink (6.6:1) instead of
white text, which would fail AA on a vivid fill.

**The signature element** is the particle wave on the landing hero
(`src/components/ParticleWave.tsx`) — a field of points driven through a 3D wave
and projected with perspective onto a canvas. It is not a chart: no axis, no
values, nothing to misread. It is deliberately the only bold element on the
page; everything around it stays quiet.

It is also built to be cheap: one canvas, no library, no per-frame allocation,
and the loop stops entirely when it scrolls out of view or the tab is hidden.
`prefers-reduced-motion` renders a single static frame.

**Motion** is one curve (`cubic-bezier(0.32, 0.72, 0, 1)`) applied everywhere,
and animates only `transform` and `opacity`. Scroll reveals use an
IntersectionObserver rather than a scroll listener.

> The reveal is built so it can never hide content it fails to show. Its hiding
> styles are scoped to a `.js-reveal` class that `useReveal` adds only once it
> can reveal things again; anything already on screen is revealed synchronously;
> and if the observer reports nothing within 1.2s the hiding styles are dropped
> wholesale. `IntersectionObserver` genuinely does get throttled or stubbed in
> embedded webviews and automation contexts — losing the animation is fine,
> losing the page is not.

## Chart conventions

The charts follow a small set of rules so they stay readable and accessible:

- **The palette is validated, not eyeballed.** The slots in
  `src/lib/palette.ts` were checked against the exact surfaces this app renders
  on (white and `#121816`) for colourblind separation, lightness band, chroma
  and contrast — including the brand green, which is why it sits where it does.
- **Colour is assigned per entity from a fixed slot order**, never by current
  rank — filtering out a platform never repaints the others. Past three
  platforms the tail folds into a single "Other" band rather than getting a
  generated hue (`platformSeries()` in `src/lib/aggregate.ts`).
- **One y-axis per chart, never two.** Two measures of different scale get two
  charts.
- **Single-series charts use a single hue** — bar length already encodes the
  magnitude, so hue is not spent on it again.
- **Input vs. output tokens uses two shades of one hue**, not two identities,
  since it is an ordered split of the same quantity.
- **Every chart has a table view** behind the Chart/Table toggle, and any chart
  with two or more series always shows a legend — so no value is reachable only
  through colour or hover.

## Theming

Light, dark, and follow-the-OS, toggled from the sidebar (or the landing page's
top bar) and stored in `localStorage`. Dark mode is a separate set of colour
steps chosen for the dark surface, not an inverted light palette — including its
own chart slots, which were validated separately.
