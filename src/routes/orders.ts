import { Router } from 'express';
import { ordersDal } from '../dal/orders-dal.js';
import { randomUUID } from 'node:crypto';

export const ordersRouter = Router();

// TODO: No date validation on from/to parameters. Could cause SQL errors or unexpected results. 
// Validate date format and enforce range limits.

// TODO: Missing offset parameter for pagination; only limit supported. 
// Causes poor performance with large result sets. 
// Implement offset-based or cursor-based pagination.

// TODO: Unhandled exceptions in route. Returns generic 500 errors. 
// Add try-catch blocks with meaningful error messages.
ordersRouter.get('/', (req, res) => {
  const orders = ordersDal.listByMerchant(req.merchantId!, {
    from: typeof req.query.from === 'string' ? req.query.from : undefined,
    to: typeof req.query.to === 'string' ? req.query.to : undefined,
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
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

  // Validate refunds: ensure a corresponding sale exists
  if (body.type === 'refund') {
    const hasSale = ordersDal.hasSaleForCustomer(req.merchantId!, body.customer_email);
    if (!hasSale) {
      res.status(400).json({ error: 'no_sale_for_refund', detail: 'Cannot refund: no prior sale exists for this customer' });
      return;
    }
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
