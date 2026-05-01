#!/usr/bin/env python3
"""
nba_pipeline.py — Uplaud Next-Best-Action Pipeline
=====================================================
Reads reviews from Airtable that are missing NBA fields,
calls Qwen via OpenRouter (OpenAI-compatible), and writes back:
  NBA_Sentiment, NBA_Category, NBA_Action, NBA_Message,
  NBA_Rationale, NBA_Status, NBA_Human_Review

Usage:
  python3 scripts/nba_pipeline.py

Environment variables (set in .env or export):
  AIRTABLE_API_KEY       — Airtable personal access token
  AIRTABLE_BASE_ID       — default: appFUJWWTaoJ3YiWt
  AIRTABLE_REVIEWS_TABLE — default: tblef0n1hQXiKPHxI
  OPENROUTER_API_KEY     — from openrouter.ai (free account)
  BUSINESS_FILTER        — optional, filter to one business name
  MAX_RECORDS            — how many to process per run (default 50)
  DRY_RUN                — set to "1" to skip Airtable writes
"""

import os, json, time, sys, textwrap
import urllib.request, urllib.parse, urllib.error

# ── Load .env ──────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

AIRTABLE_API_KEY   = os.environ.get("AIRTABLE_API_KEY",
    "patZS8GyNhkwoP4wY.2beddc214f4dd2a5e4c220ae654f62652a5e02a47bae2287c54fced7bb97c07e")
AIRTABLE_BASE_ID   = os.environ.get("AIRTABLE_BASE_ID",   "appFUJWWTaoJ3YiWt")
AIRTABLE_TABLE_ID  = os.environ.get("AIRTABLE_REVIEWS_TABLE", "tblef0n1hQXiKPHxI")
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
BUSINESS_FILTER    = os.environ.get("BUSINESS_FILTER",    "")
MAX_RECORDS        = int(os.environ.get("MAX_RECORDS",     "50"))
DRY_RUN            = os.environ.get("DRY_RUN",            "0") == "1"
USE_OLLAMA         = os.environ.get("USE_OLLAMA",          "1") == "1"
OLLAMA_BASE        = os.environ.get("OLLAMA_BASE",         "http://localhost:11434")
OLLAMA_MODEL       = os.environ.get("OLLAMA_MODEL",        "qwen2.5:latest")

# API base — Ollama by default, OpenRouter as fallback
OAI_BASE = f"{OLLAMA_BASE}/v1" if USE_OLLAMA else "https://openrouter.ai/api/v1"
MODEL    = OLLAMA_MODEL if USE_OLLAMA else "qwen/qwen3-14b:free"

AT_BASE_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
AT_HEADERS  = {"Authorization": f"Bearer {AIRTABLE_API_KEY}"}
# Ollama doesn't need a real key; OpenRouter does
_api_key = "ollama" if USE_OLLAMA else OPENROUTER_API_KEY
OAI_HEADERS = {
    "Authorization": f"Bearer {_api_key}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://uplaud.ai",
    "X-Title": "Uplaud NBA Pipeline",
}

# ── Prompt ─────────────────────────────────────────────────────────────────
SYSTEM_PROMPT = textwrap.dedent("""
You are an AI analyst for Uplaud, a WhatsApp-based business review platform.
Your job is to analyze a customer review and produce structured next-best-action
recommendations for the business owner.

Rules:
- sentiment: "high" (clearly positive), "medium" (mixed/neutral), "low" (negative/critical)
- next_best_action must be one of:
    ask_for_referral, encourage_repeat_purchase, convert_to_social_content,
    ask_for_details, offer_support, start_remediation, offer_make_good,
    follow_up_no_action
  High sentiment → prefer ask_for_referral or encourage_repeat_purchase
  Medium sentiment → prefer ask_for_details or offer_support
  Low sentiment → prefer start_remediation or offer_make_good
- needs_human_review: true ONLY for safety, health, legal, fraud, or severe-harm concerns
- suggested_message: short, warm, personalized message the business could send (2-3 sentences max)
- human_rationale: 1-2 sentences explaining why this action was chosen
- category: short label, e.g. "Loyalty Opportunity", "Service Issue", "Product Feedback"

Respond ONLY with valid JSON, no markdown, no extra text:
{
  "sentiment": "high|medium|low",
  "category": "<short label>",
  "next_best_action": "<slug>",
  "suggested_message": "<message>",
  "human_rationale": "<reasoning>",
  "needs_human_review": false
}
""").strip()

# ── OpenRouter call ────────────────────────────────────────────────────────
def call_qwen(business_name: str, review_text: str, score) -> dict:
    score_str = f"{score}/5" if score is not None else "not rated"
    user_msg = f"Business: {business_name}\nRating: {score_str}\nReview: {review_text}"
    payload = json.dumps({
        "model": MODEL,
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ],
    }).encode()
    req = urllib.request.Request(
        f"{OAI_BASE}/chat/completions",
        data=payload, headers=OAI_HEADERS, method="POST"
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = json.load(resp)
    content = body["choices"][0]["message"]["content"].strip()
    # Strip any accidental markdown fences
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    return json.loads(content.strip())

# ── Airtable helpers ───────────────────────────────────────────────────────
def airtable_get(params: dict) -> dict:
    qs = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
    url = f"{AT_BASE_URL}?{qs}"
    req = urllib.request.Request(url, headers=AT_HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)

def fetch_reviews(max_records: int, business: str = "") -> list:
    """Fetch reviews without NBA_Sentiment, optionally filtered to one business."""
    records, offset = [], None
    # Build filter
    no_nba = "{NBA_Sentiment}=''"
    if business:
        biz_filter = f"LOWER({{business_name}})=LOWER('{business}')"
        formula = urllib.parse.quote(f"AND({no_nba},{biz_filter})")
    else:
        formula = urllib.parse.quote(no_nba)

    while len(records) < max_records:
        params = {
            "filterByFormula": formula,
            "pageSize": min(100, max_records - len(records)),
        }
        if offset:
            params["offset"] = offset
        data = airtable_get(params)
        records.extend(data.get("records", []))
        offset = data.get("offset")
        if not offset:
            break
    return records[:max_records]

def patch_record(record_id: str, fields: dict):
    payload = json.dumps({"fields": fields}).encode()
    headers = {**AT_HEADERS, "Content-Type": "application/json"}
    url = f"{AT_BASE_URL}/{record_id}"
    req = urllib.request.Request(url, data=payload, headers=headers, method="PATCH")
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    if not USE_OLLAMA and not OPENROUTER_API_KEY:
        print("ERROR: OPENROUTER_API_KEY not set. Get a free key at openrouter.ai")
        sys.exit(1)
    if USE_OLLAMA:
        print(f"Using Ollama at {OLLAMA_BASE} with model '{OLLAMA_MODEL}'")

    label = f" for '{BUSINESS_FILTER}'" if BUSINESS_FILTER else ""
    print(f"{'[DRY RUN] ' if DRY_RUN else ''}Fetching up to {MAX_RECORDS} unprocessed reviews{label}…")
    records = fetch_reviews(MAX_RECORDS, BUSINESS_FILTER)
    print(f"Found {len(records)} reviews without NBA fields.\n")

    if not records:
        print("Nothing to process.")
        return

    ok = skipped = errors = 0

    for rec in records:
        fields    = rec.get("fields", {})
        record_id = rec["id"]
        biz       = fields.get("business_name", "Unknown Business")
        review    = fields.get("Uplaud", "")
        score     = fields.get("Uplaud Score")

        if not isinstance(review, str):
            review = str(review) if review else ""

        if not review.strip():
            print(f"  SKIP  {record_id}  (no review text)")
            skipped += 1
            continue

        short_review = review[:80].replace("\n", " ")
        print(f"  → {record_id}  {biz[:35]:<35}  score={score}  \"{short_review}\"")

        try:
            result = call_qwen(biz, review[:2000], score)
        except Exception as e:
            print(f"    LLM ERROR: {e}")
            errors += 1
            time.sleep(2)
            continue

        sentiment = result.get("sentiment", "medium").lower()
        if sentiment not in ("high", "medium", "low"):
            sentiment = "medium"

        nba_fields = {
            "NBA_Sentiment":    sentiment,
            "NBA_Category":     result.get("category", ""),
            "NBA_Action":       result.get("next_best_action", "follow_up_no_action"),
            "NBA_Message":      result.get("suggested_message", ""),
            "NBA_Rationale":    result.get("human_rationale", ""),
            "NBA_Status":       "pending_approval",
            "NBA_Human_Review": bool(result.get("needs_human_review", False)),
        }
        print(f"    ✓ sentiment={nba_fields['NBA_Sentiment']}  "
              f"action={nba_fields['NBA_Action']}  "
              f"human_review={nba_fields['NBA_Human_Review']}")

        if DRY_RUN:
            print(f"    [DRY RUN — not writing]")
            ok += 1
        else:
            try:
                patch_record(record_id, nba_fields)
                ok += 1
            except Exception as e:
                print(f"    WRITE ERROR: {e}")
                errors += 1

        time.sleep(0.4)  # Airtable rate limit buffer

    print(f"\nDone.  ok={ok}  skipped={skipped}  errors={errors}")

if __name__ == "__main__":
    main()
