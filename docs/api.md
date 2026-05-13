# API reference

> Quick-and-dirty. Not complete.

All endpoints require the `X-Merchant-Id` header.

## `GET /api/health`
No auth. Returns `{ ok: true }`.

## `GET /api/orders`
List orders for the authenticated merchant.

**Query Parameters:**
- `q` (optional, string): Natural language query for advanced filtering
- `from` (optional, string): Start date for filtering orders (ISO format)
- `to` (optional, string): End date for filtering orders (ISO format)
- `limit` (optional, number): Maximum number of orders to return (default: 100)
- `type` (optional, string): Filter by order type
- `status` (optional, string): Filter by order status
- `customer_email` (optional, string): Filter by customer email address
- `amount_min` (optional, number): Minimum order amount (in cents)
- `amount_max` (optional, number): Maximum order amount (in cents)

**Natural Language Query (q parameter):**

The `q` parameter accepts plain English queries that are parsed by an LLM to extract structured filters. This allows for more intuitive filtering without needing to specify exact query parameters.

Examples:
- `q=refunds over $50 in April` → filters for refund-type orders with amount > 50 in April
- `q=sales for john@example.com` → filters for sale-type orders from a specific customer
- `q=orders totaling more than $100` → filters for orders with amount > 100

Note: Natural language queries require OpenAI API access configured via environment variables (OPEN_AI_URL, OPEN_AI_KEY, OPEN_AI_MODEL, SYSTEM_PROMPT, TEMPERATURE).

**Explicit Parameters Precedence:**
When both natural language query (`q`) and explicit parameters are provided, explicit parameters take precedence and override any conflicting values parsed from the natural language query.

**Response:** Array of orders
```json
{
  "orders": [
    {
      "id": "uuid",
      "merchant_id": "uuid",
      "customer_email": "string",
      "total_amount": "number",
      "type": "sale|refund",
      "status": "string",
      "created_at": "ISO timestamp"
    }
  ]
}
```

## `GET /api/orders/:id`
Get a single order by ID.

**Path Parameters:**
- `id` (required, string): Order ID (UUID)

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "merchant_id": "uuid",
    "customer_email": "string",
    "total_amount": "number",
    "type": "sale|refund",
    "status": "string",
    "created_at": "ISO timestamp"
  }
}
```

**Error Response:** Returns 404 if order not found or doesn't belong to the authenticated merchant.

## `POST /api/orders`
Body: `{ customer_email, total_amount, type? }`.

## `GET /api/revenue?from=...&to=...`
Total revenue for the merchant in the date range.

## `GET /api/metrics/summary`
TODO: document fields.

## `GET /api/metrics/top-customers`
TODO: document fields.
