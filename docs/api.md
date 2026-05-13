# API reference

> Quick-and-dirty. Not complete.

All endpoints require the `X-Merchant-Id` header.

## `GET /api/health`
No auth. Returns `{ ok: true }`.

## `GET /api/orders`
List orders for the authenticated merchant.

**Query Parameters:**
- `from` (optional, string): Start date for filtering orders (ISO format)
- `to` (optional, string): End date for filtering orders (ISO format)
- `limit` (optional, number): Maximum number of orders to return (default: 100)

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
