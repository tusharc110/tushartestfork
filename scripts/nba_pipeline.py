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

AIRTABLE_API_KEY   = os.environ.get("AIRTABLE_API_KEY", "")
AIRTABLE_BASE_ID   = os.environ.get("AIRTABLE_BASE_ID",   "appFUJWWTaoJ3YiWt")
AIRTABLE_TABLE_ID  = os.environ.get("AIRTABLE_REVIEWS_TABLE", "tblef0n1hQXiKPHxI")
GROQ_API_KEY       = os.environ.get("GROQ_API_KEY", "")
BUSINESS_FILTER    = os.environ.get("BUSINESS_FILTER", "")
MAX_RECORDS        = int(os.environ.get("MAX_RECORDS", "50"))
DRY_RUN            = os.environ.get("DRY_RUN", "0") == "1"

# Groq — fast, free tier, OpenAI-compatible
OAI_BASE = "https://api.groq.com/openai/v1"
MODEL    = "llama-3.3-70b-versatile"

AT_BASE_URL = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{AIRTABLE_TABLE_ID}"
AT_HEADERS  = {"Authorization": f"Bearer {AIRTABLE_API_KEY}"}
# Headers built lazily in call_qwen to pick up the env var correctly
def _oai_headers():
    return {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
        "User-Agent": "python-requests/2.31.0",
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
    # Retry up to 3 times with exponential backoff for rate limits
    for attempt in range(3):
        try:
            req = urllib.request.Request(
                f"{OAI_BASE}/chat/completions",
                data=payload, headers=_oai_headers(), method="POST"
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.load(resp)
            content = body["choices"][0]["message"]["content"].strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            return json.loads(content.strip())
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                wait = 10 * (attempt + 1)
                print(f"    rate limited, waiting {wait}s…")
                time.sleep(wait)
            else:
                raise

# ── Airtable helpers ───────────────────────────────────────────────────────
def airtable_get(params: dict) -> dict:
    qs = urllib.parse.urlencode(params)
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
        formula = f"AND({no_nba},{biz_filter})"
    else:
        formula = no_nba

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
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY not set.")
        sys.exit(1)
    print(f"Using Groq with model '{MODEL}'")

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

        time.sleep(0.5)  # Groq free tier: 30 req/min, plenty of headroom

    print(f"\nDone.  ok={ok}  skipped={skipped}  errors={errors}")

if __name__ == "__main__":
    main()
