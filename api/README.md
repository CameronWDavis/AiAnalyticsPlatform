# API

Flask + SQLAlchemy JSON API over the analytics database. Read-only: every
endpoint is a `GET`, and nothing here writes.

It is consumed by [`../frontend`](../frontend), and reads the database defined
in [`../database`](../database).

## Layout

```
run.py            entry point — creates the app and runs the dev server
config.py         reads DATABASE_URL and SECRET_KEY from the environment
app/
  __init__.py     create_app(): config, extensions, blueprint registration
  extensions.py   the shared SQLAlchemy and CORS instances
  models/         user, category, usage_log, prompt
  routes/         one blueprint per resource
```

Each model owns its own `to_dict()`, and the routes do nothing but call it. If
a field looks wrong in the API, the model is where to fix it.

## Configuration

`config.py` calls `load_dotenv()`, which searches upward from the working
directory — so running from `api/` picks up `api/.env`. Nothing is committed;
create it yourself:

```dotenv
DATABASE_URL=postgresql+psycopg://analytics_app:devpassword@localhost:5432/analytics
SECRET_KEY=dev-secret-change-me
```

> **The `+psycopg` is load-bearing.** `requirements.txt` pins `psycopg[binary]`,
> which is psycopg **3**. SQLAlchemy maps a bare `postgresql://` URL to psycopg
> **2**, which is not installed, and the app dies at startup with
> `ModuleNotFoundError: No module named 'psycopg2'`.
>
> Note that `database/seed.py` needs the **plain** `postgresql://` form, because
> it passes the URL straight to `psycopg.connect()` and libpq rejects the
> `+psycopg` scheme. Keeping a separate `database/.env` is the simplest way to
> have both. To use one shared value instead, normalise it here:
>
> ```python
> _url = os.environ.get("DATABASE_URL", "")
> SQLALCHEMY_DATABASE_URI = _url.replace("postgresql://", "postgresql+psycopg://", 1)
> ```

## Running it

The database has to be up first — see [`../database`](../database).

```bash
pip install -r requirements.txt
```

```bash
python run.py
```

Serves on `http://127.0.0.1:5000` with `debug=True`.

> On macOS, **AirPlay Receiver also listens on port 5000**. If requests come
> back `403` with a `server: AirTunes` header, that is AirPlay and not this app
> — turn it off in System Settings → General → AirDrop & Handoff, or run Flask
> on another port.

## Endpoints

All are prefixed `/api` and return JSON.

| Endpoint | Returns |
|---|---|
| `GET /api/users` | Every user: `id`, `name`, `email`, `created_at` |
| `GET /api/categories` | Every category: `id`, `user_id`, `name`, `color` |
| `GET /api/usage_log` | Every usage row: `id`, `user_id`, `date`, `model`, `platform`, `input_tokens`, `output_tokens`, `total_tokens`, `request_count`, `estimated_cost_usd`, `created_at`, `updated_at` |
| `GET /api/prompts` | Every prompt: `id`, `user_id`, `category_id`, `prompt_text`, `response_text`, `model`, `platform`, `created_at` |
| `GET /api/analytics/summary?days=N` | Aggregates over the last `N` days (default 30): `time_window_days`, `total_tokens`, `estimated_cost_usd`, `request_count`, `active_users` |

Conventions: every timestamp is an ISO 8601 string, `date` is `YYYY-MM-DD`, and
every money field is a number rather than a string — `SUM` over a `NUMERIC`
column returns a `Decimal`, which Flask would otherwise serialise as a string,
so `analytics.py` casts it.

Quick check that it is alive:

```bash
curl -s "http://127.0.0.1:5000/api/analytics/summary?days=30"
```

## CORS

`create_app()` allows exactly one origin:

```python
cors.init_app(app, origins=["http://localhost:5173"])
```

That is Vite's default port, which is why the frontend pins it with
`strictPort`. Serving the frontend from anywhere else means adding that origin
here.

## Known limitations

Worth knowing before building on this:

- **No pagination.** `/api/prompts` and `/api/usage_log` return every row via
  `Model.query.all()`. Fine at seed scale (hundreds of rows); it will not stay
  fine.
- **`/api/analytics/summary` takes only `days`** — no platform or user filter.
  The frontend therefore computes its filtered totals client-side from
  `/api/usage_log` rather than calling this route.
- **No authentication.** Every endpoint is open to anyone who can reach the
  port. Do not expose this beyond localhost as it stands.
- **No write endpoints.** Data comes from `database/seed.py` or from writing to
  Postgres directly.
