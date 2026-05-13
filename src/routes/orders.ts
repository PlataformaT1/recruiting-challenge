import { Router } from 'express';
import { ordersDal } from '../dal/orders-dal.js';
import { randomUUID } from 'node:crypto';
import { NLFilters, parseNaturalLanguageQuery } from '../utils/natural_language.js';

export const ordersRouter = Router();

// TODO: No date validation on from/to parameters. Could cause SQL errors or unexpected results. 
// Validate date format and enforce range limits.

// TODO: Missing offset parameter for pagination; only limit supported. 
// Causes poor performance with large result sets. 
// Implement offset-based or cursor-based pagination.

// TODO: Unhandled exceptions in route. Returns generic 500 errors. 
// Add try-catch blocks with meaningful error messages.
ordersRouter.get('/', async (req, res) => {
  const q = req.query;

  let nlFilters: NLFilters = {};
  if (typeof q.q === 'string') {
    try {
      nlFilters = await parseNaturalLanguageQuery(q.q);
    } catch (e) {
      res.status(400).json({ error: 'nl_parse_failed', message: (e as Error).message });
      return;
    }
  }

  // Explicit query params take precedence over NL-parsed values
  const merged = { ...nlFilters, ...q };

  const amountMin = typeof merged.amount_min === 'string' ? Number(merged.amount_min)
                  : typeof merged.amount_min === 'number' ? merged.amount_min
                  : undefined;
  const amountMax = typeof merged.amount_max === 'string' ? Number(merged.amount_max)
                  : typeof merged.amount_max === 'number' ? merged.amount_max
                  : undefined;

  const orders = ordersDal.listByMerchant(req.merchantId!, {
    from:           typeof merged.from           === 'string' ? merged.from           : undefined,
    to:             typeof merged.to             === 'string' ? merged.to             : undefined,
    limit:          typeof merged.limit          === 'string' ? Number(merged.limit)
                  : typeof merged.limit          === 'number' ? merged.limit          : undefined,
    customer_email: typeof merged.customer_email === 'string' ? merged.customer_email : undefined,
    status:         typeof merged.status         === 'string' ? merged.status         : undefined,
    type:           typeof merged.type           === 'string' ? merged.type           : undefined,
    amount_min:     amountMin !== undefined && isFinite(amountMin) ? amountMin : undefined,
    amount_max:     amountMax !== undefined && isFinite(amountMax) ? amountMax : undefined,
  });
  res.json({ orders });
});

//TODO: No authorization check on order access. 
// Merchants could access orders that don't belong to them by guessing IDs. 
// Add a check to ensure the order's merchant_id matches req.merchantId before returning the order.
ordersRouter.get('/:id', (req, res) => {
  const order = ordersDal.getById(req.params.id);
  if (!order) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ order });
});

// TODO: POST endpoint doesn't validate type parameter against allowed values ('sale' | 'refund'). 
// Invalid data gets stored, corrupting the database.
// Validate type parameter before inserting orders.

// TODO: Customer email input not validated (format, null check, etc.). 
// Invalid or malicious data gets stored, breaking queries.
// Validate email format and require non-empty values.
ordersRouter.post('/', (req, res) => {
  const body = req.body as {
    customer_email?: string;
    total_amount?: number;
    type?: 'sale' | 'refund';
  };
  if (!body.customer_email || typeof body.total_amount !== 'number') {
    res.status(400).json({ error: 'invalid_body' });
    return;
  }
  const order = ordersDal.create({
    id: randomUUID(),
    merchant_id: req.merchantId!,
    customer_email: body.customer_email,
    total_amount: body.total_amount,
    type: body.type ?? 'sale',
    status: 'completed',
  });
  res.status(201).json({ order });
});