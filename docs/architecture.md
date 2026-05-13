# Architecture (DRAFT — needs love)

> This file was started a while ago and hasn't been kept up to date.
> Treat as partial. Update what you change.

## Modules

- **`server.ts`** — Express bootstrapper. Wires routers to paths.
- **`db.ts`** — SQLite connection + schema init. Single shared `db` instance.
- **`auth.ts`** — request authentication. Today: trusts `X-Merchant-Id` header.
  Eventually this becomes a real signed token; the header shape is a placeholder.
- **`dal/`** — data-access layer. The intent is that all order queries route
  through `ordersDal` so we have one place to add auditing, caching, tenancy
  filters, etc. (Not all routes follow this yet — see `metrics.ts`.)
- **`routes/`** — Express routers, one file per resource.
- **`utils/`** — utilities including natural language query parsing.
  - **`natural_language.ts`** — LLM-powered query parsing. Converts plain English
    queries into structured filter objects for advanced order searching.

## Data model

Two tables: `merchants`, `orders`. See `db.ts` for the canonical DDL.

`orders.type` is one of `'sale' | 'refund'`. A refund row records that a sale
was reversed; it does not by itself reverse the sale row.

## Natural Language Query Parsing

The natural language feature allows users to query orders using plain English instead of specific query parameters. This is implemented in `utils/natural_language.ts` and integrated into the `GET /api/orders` endpoint.

### How it works

1. **User Query**: A user provides a query string via the `q` parameter (e.g., "refunds over $50 in April")
2. **LLM Parsing**: The query is sent to OpenAI API with a system prompt that instructs the model to extract structured filters
3. **Filter Extraction**: OpenAI returns a JSON object with parsed filters (type, amount_min, from, to, etc.)
4. **Merge with Explicit Params**: Explicit query parameters override any conflicting values from the NL parse
5. **Query Execution**: The merged filters are used to query the database through the DAL

### Configuration

The feature requires these environment variables:
- `OPEN_AI_URL` — OpenAI API endpoint
- `OPEN_AI_KEY` — API authentication key
- `OPEN_AI_MODEL` — Model to use (e.g., "gpt-4")
- `SYSTEM_PROMPT` — Instructions for filter extraction
- `TEMPERATURE` — Model temperature for consistency (typically 0.5)

## Open items

- ~~Wire `dashboard.tsx` once we pick a frontend framework~~ — went with static HTML+fetch instead. Doc stale.
- Decide whether `analytics-events` is its own service or a route here.
- Audit logging — TBD where it lives.
