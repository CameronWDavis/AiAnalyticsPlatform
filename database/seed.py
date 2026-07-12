"""
Seed script for the AI analytics database.
"""

import os
import random
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

import psycopg
from dotenv import load_dotenv
from faker import Faker

load_dotenv()

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://analytics_app:devpassword@localhost:5432/analytics",
)

NUM_USERS = 4
DAYS_OF_HISTORY = 90
PROMPTS_PER_USER = 60

# (model, platform, approx cost per 1M input tokens, approx cost per 1M output tokens)
# Rough ballpark numbers — good enough for synthetic data.
MODELS = [
    ("claude-opus-4-7",   "Anthropic", 15.00, 75.00),
    ("claude-sonnet-4-6", "Anthropic",  3.00, 15.00),
    ("claude-haiku-4-5",  "Anthropic",  1.00,  5.00),
    ("gpt-4o",            "OpenAI",     2.50, 10.00),
    ("gpt-4o-mini",       "OpenAI",     0.15,  0.60),
    ("gemini-2.5-pro",    "Google",     1.25,  5.00),
    ("gemini-2.5-flash",  "Google",     0.075, 0.30),
]

CATEGORY_NAMES = [
    ("coding",   "#3B82F6"),
    ("writing",  "#10B981"),
    ("research", "#8B5CF6"),
    ("brainstorming", "#F59E0B"),
    ("debugging", "#EF4444"),
    ("learning",  "#06B6D4"),
]

# Prompt templates keyed by category — used to make prompts look realistic.
PROMPT_TEMPLATES = {
    "coding": [
        "Write a Python function that {task}.",
        "How do I {task} in JavaScript?",
        "Refactor this code to {task}.",
        "Explain how {task} works in Rust.",
    ],
    "writing": [
        "Draft an email about {task}.",
        "Write a short blog post on {task}.",
        "Help me rewrite this paragraph about {task}.",
        "Summarize this article on {task}.",
    ],
    "research": [
        "What are the latest developments in {task}?",
        "Compare different approaches to {task}.",
        "Find sources discussing {task}.",
        "Give me an overview of {task}.",
    ],
    "brainstorming": [
        "Give me 10 ideas for {task}.",
        "What are creative approaches to {task}?",
        "Help me brainstorm names for {task}.",
        "Suggest angles I haven't considered for {task}.",
    ],
    "debugging": [
        "Why is my code failing when {task}?",
        "Help me debug this error related to {task}.",
        "What could cause {task} to break?",
        "How do I trace an issue with {task}?",
    ],
    "learning": [
        "Explain {task} like I'm a beginner.",
        "What's the difference between {task}?",
        "Teach me the basics of {task}.",
        "Walk me through how {task} works.",
    ],
}

TASK_FRAGMENTS = [
    "parsing JSON in a stream", "React hooks", "SQL window functions",
    "async iterators", "docker networking", "gradient descent",
    "vector embeddings", "REST vs GraphQL", "OAuth2 flows",
    "regex lookaheads", "linear algebra", "the Kalman filter",
    "recursive CTEs", "quarterly reports", "team offsite planning",
    "onboarding new hires", "product launch strategy", "customer churn",
    "microservices architecture", "TypeScript generics", "Rust ownership",
    "database indexing", "caching strategies", "load balancing",
]

fake = Faker()
Faker.seed(42)
random.seed(42)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def calc_cost(input_tokens: int, output_tokens: int, in_rate: float, out_rate: float) -> Decimal:
    """Cost in USD given per-million-token rates."""
    cost = (input_tokens / 1_000_000) * in_rate + (output_tokens / 1_000_000) * out_rate
    return Decimal(f"{cost:.4f}")


def random_prompt(category: str) -> tuple[str, str]:
    """Return (prompt_text, response_text) for a category."""
    template = random.choice(PROMPT_TEMPLATES[category])
    task = random.choice(TASK_FRAGMENTS)
    prompt = template.format(task=task)
    response = fake.paragraph(nb_sentences=random.randint(3, 8))
    return prompt, response


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

def seed(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        # Clean slate — wipe existing data. TRUNCATE ... CASCADE resets identities too.
        print("Clearing existing data...")
        cur.execute(
            "TRUNCATE TABLE prompts, usage_logs, categories, users "
            "RESTART IDENTITY CASCADE;"
        )

        # -------------------- users --------------------
        print(f"Creating {NUM_USERS} users...")
        user_ids: list[int] = []
        for _ in range(NUM_USERS):
            name = fake.name()
            email = fake.unique.email()
            cur.execute(
                "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id;",
                (name, email),
            )
            user_ids.append(cur.fetchone()[0])

        # -------------------- categories --------------------
        print("Creating categories per user...")
        # user_id -> {category_name: category_id}
        user_categories: dict[int, dict[str, int]] = {uid: {} for uid in user_ids}
        for uid in user_ids:
            for cat_name, color in CATEGORY_NAMES:
                cur.execute(
                    "INSERT INTO categories (user_id, name, color) "
                    "VALUES (%s, %s, %s) RETURNING id;",
                    (uid, cat_name, color),
                )
                user_categories[uid][cat_name] = cur.fetchone()[0]

        # -------------------- usage_logs --------------------
        print(f"Generating {DAYS_OF_HISTORY} days of usage logs...")
        today = date.today()
        rows_inserted = 0

        for uid in user_ids:
            # Each user has 2-4 "favorite" models they use more often.
            favorites = random.sample(MODELS, k=random.randint(2, 4))

            for day_offset in range(DAYS_OF_HISTORY):
                log_date = today - timedelta(days=day_offset)

                # Not every user uses every model every day — 60% chance of activity.
                if random.random() > 0.6:
                    continue

                # Pick 1-3 models used on this day, weighted toward favorites.
                models_today = set()
                for _ in range(random.randint(1, 3)):
                    if random.random() < 0.75:
                        models_today.add(random.choice(favorites))
                    else:
                        models_today.add(random.choice(MODELS))

                for model, platform, in_rate, out_rate in models_today:
                    requests = random.randint(1, 40)
                    # Rough per-request token counts, scaled by model tier.
                    avg_input = random.randint(200, 2000)
                    avg_output = random.randint(100, 1500)
                    input_tokens = requests * avg_input
                    output_tokens = requests * avg_output
                    cost = calc_cost(input_tokens, output_tokens, in_rate, out_rate)

                    cur.execute(
                        """
                        INSERT INTO usage_logs
                            (user_id, date, model, platform,
                             input_tokens, output_tokens, request_count, estimated_cost_usd)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s);
                        """,
                        (uid, log_date, model, platform,
                         input_tokens, output_tokens, requests, cost),
                    )
                    rows_inserted += 1

        print(f"  inserted {rows_inserted} usage_log rows")

        # -------------------- prompts --------------------
        print(f"Generating ~{PROMPTS_PER_USER} prompts per user...")
        total_prompts = 0
        for uid in user_ids:
            for _ in range(PROMPTS_PER_USER):
                cat_name = random.choice([c[0] for c in CATEGORY_NAMES])
                cat_id = user_categories[uid][cat_name]
                prompt_text, response_text = random_prompt(cat_name)
                model, platform, _, _ = random.choice(MODELS)

                # Timestamps scattered across the same 90-day window.
                created_at = datetime.now(timezone.utc) - timedelta(
                    days=random.randint(0, DAYS_OF_HISTORY - 1),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )

                cur.execute(
                    """
                    INSERT INTO prompts
                        (user_id, category_id, prompt_text, response_text,
                         model, platform, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s);
                    """,
                    (uid, cat_id, prompt_text, response_text,
                     model, platform, created_at),
                )
                total_prompts += 1
        print(f"  inserted {total_prompts} prompts")

    conn.commit()
    print("\nDone.")


def print_summary(conn: psycopg.Connection) -> None:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM users;")
        users = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM categories;")
        categories = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM usage_logs;")
        logs = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM prompts;")
        prompts = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(SUM(total_tokens), 0) FROM usage_logs;")
        total_tokens = cur.fetchone()[0]
        cur.execute("SELECT COALESCE(SUM(estimated_cost_usd), 0) FROM usage_logs;")
        total_cost = cur.fetchone()[0]

    print("\n--- Summary ---")
    print(f"  users:        {users}")
    print(f"  categories:   {categories}")
    print(f"  usage_logs:   {logs}")
    print(f"  prompts:      {prompts}")
    print(f"  total tokens: {total_tokens:,}")
    print(f"  total cost:   ${total_cost}")


if __name__ == "__main__":
    print(f"Connecting to {DATABASE_URL}")
    with psycopg.connect(DATABASE_URL) as conn:
        seed(conn)
        print_summary(conn)
