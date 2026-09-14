# Database

Postgres 16 in Docker, the schema it boots with, and a seed script that fills it
with realistic synthetic data.

Read by [`../api`](../api), which is read by [`../frontend`](../frontend).

## Layout

```
docker-compose.yml    Postgres 16, bind-mounted data and init directories
init/01_schema.sql    the schema — runs automatically on first boot
seed.py               generates synthetic users, categories, usage and prompts
requirements.txt      dependencies for seed.py only
data/                 the Postgres data directory (gitignored, created on boot)
```

## Configuration

`docker-compose.yml` substitutes `${POSTGRES_DB}`, `${POSTGRES_USER}` and
`${POSTGRES_PASSWORD}`, and Compose reads `.env` from the directory holding the
compose file. `seed.py` calls `load_dotenv()` and picks up the same file. So one
`database/.env` covers both:

```dotenv
POSTGRES_DB=analytics
POSTGRES_USER=analytics_app
POSTGRES_PASSWORD=devpassword
DATABASE_URL=postgresql://analytics_app:devpassword@localhost:5432/analytics
```

> Note the **plain** `postgresql://` here. `seed.py` passes this straight to
> `psycopg.connect()`, and libpq rejects the `postgresql+psycopg://` form that
> SQLAlchemy needs on the API side. See [`../api/README.md`](../api/README.md)
> for why the two differ and how to use a single value instead.
>
> `seed.py` falls back to exactly the URL above if `DATABASE_URL` is unset, but
> Compose has no fallback for the `POSTGRES_*` values — without `.env` the
> container starts with an empty user and password.

## Starting it

```bash
docker compose up -d
```

Postgres listens on `localhost:5432`.

> **`init/` only runs on a first boot**, when `data/` is empty — that is how the
> official Postgres image works. If you edit `01_schema.sql` after the fact,
> nothing happens until you reset (below). No Docker? Any local Postgres 16
> works; run `init/01_schema.sql` against it by hand and point `DATABASE_URL`
> at it.

Check it came up:

```bash
docker compose ps
```

## Seeding

```bash
pip install -r requirements.txt
```

```bash
python seed.py
```

> **This wipes the database.** The first statement is
> `TRUNCATE TABLE prompts, usage_logs, categories, users RESTART IDENTITY CASCADE`
> — every existing row is destroyed and the id sequences reset. It is meant for
> a dev database you do not mind losing. Never point it at anything you care
> about.

Seeded with a fixed random seed, so runs are reproducible. Defaults at the top
of the file: **4 users**, **90 days** of history, **60 prompts each**, across 7
models on 3 platforms (Anthropic, OpenAI, Google) and 6 categories per user.

Categories and prompts are exact — 24 and 240. Usage rows are not: each user has
a 60% chance of activity on any given day and uses 1–3 models when active, so the
count lands in the mid-hundreds rather than at a fixed number. The script prints
the real figures when it finishes.

Costs come from per-million-token rates that approximate real list prices —
close enough for the dashboard to look plausible, not accurate enough to bill
anyone.

## Schema

Four tables. `01_schema.sql` is the source of truth; the SQLAlchemy models in
`../api/app/models/` mirror it by hand — **change both together**, there are no
migrations.

| Table | Holds | Notes |
|---|---|---|
| `users` | name, email, created_at | `email` is unique |
| `categories` | user-defined prompt labels + a hex colour | unique on `(user_id, name)` |
| `usage_logs` | token counts per user/day/model/platform | unique on `(user_id, date, model, platform)` |
| `prompts` | prompt and response text, model, platform | `category_id` is nullable |

Things worth knowing:

- **`usage_logs.total_tokens` is a generated column** —
  `GENERATED ALWAYS AS (input_tokens + output_tokens) STORED`. Never write to
  it; it is computed and stored by Postgres.
- **`estimated_cost_usd` is `NUMERIC(10,4)`** and nullable, so it arrives in
  Python as a `Decimal` or `None`. Both `to_dict()` and the analytics route cast
  it before serialising.
- **Deleting a user cascades** to their categories, usage logs and prompts.
  Deleting a category sets `prompts.category_id` to `NULL` rather than deleting
  the prompt.
- Indexes cover the access patterns the API actually uses:
  `usage_logs(user_id, date)`, `usage_logs(model)`, `prompts(user_id)`,
  `prompts(category_id)`, `prompts(created_at)`.

## Resetting

To rebuild from scratch — schema included:

```bash
docker compose down && rm -rf data && docker compose up -d
```

This deletes `data/` entirely, so `init/01_schema.sql` runs again on the next
boot. Re-run `seed.py` afterwards. To wipe only the rows and keep the schema,
`seed.py` already truncates on every run.

## Connecting by hand

```bash
docker compose exec postgres psql -U analytics_app -d analytics
```
