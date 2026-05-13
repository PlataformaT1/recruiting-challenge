import { db } from '../db.js';

export interface OrderRow {
  id: string;
  merchant_id: string;
  customer_email: string;
  total_amount: number;
  type: 'sale' | 'refund';
  status: string;
  created_at: string;
}

/**
 * Data-access layer for orders. All order queries should go through here.
 *
 * - centralized place for query patterns
 * - the place to add auditing, caching, tenancy filters
 * - the seam for swapping the underlying store
 */

// TODO: Missing offset parameter for pagination; only limit supported. 
// Causes poor performance with large result sets.
// Implement offset-based or cursor-based pagination.

// TODO: createRefund() lacks validation: doesn't verify original sale exists, 
// prevents negative amounts, or block duplicates. 
// Orphaned/duplicate records corrupt data.
// Validate sale existence, enforce positive amounts, and detect duplicate refunds.

export const ordersDal = {
  listByMerchant(
    merchantId: string,
    opts: {
      from?: string;
      to?: string;
      limit?: number;
      customer_email?: string;
      status?: string;
      type?: string;
      amount_min?: number;
      amount_max?: number;
    } = {},
  ): OrderRow[] {
    const limit = opts.limit ?? 100;
    const conditions: string[] = ['merchant_id = ?'];
    const params: (string | number)[] = [merchantId];

    if (opts.from)           { conditions.push('created_at >= ?');    params.push(opts.from); }
    if (opts.to)             { conditions.push('created_at < ?');     params.push(opts.to); }
    if (opts.customer_email) { conditions.push('customer_email = ?'); params.push(opts.customer_email); }
    if (opts.status)         { conditions.push('status = ?');         params.push(opts.status); }
    if (opts.type)           { conditions.push('type = ?');           params.push(opts.type); }
    if (opts.amount_min !== undefined) { conditions.push('total_amount >= ?'); params.push(opts.amount_min); }
    if (opts.amount_max !== undefined) { conditions.push('total_amount <= ?'); params.push(opts.amount_max); }

    params.push(limit);
    return db
      .prepare(
        `SELECT * FROM orders
         WHERE ${conditions.join(' AND ')}
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(...params) as OrderRow[];
  },

  getById(id: string): OrderRow | undefined {
    return db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as OrderRow | undefined;
  },

  create(order: Omit<OrderRow, 'created_at'>): OrderRow {
    db.prepare(
      `INSERT INTO orders (id, merchant_id, customer_email, total_amount, type, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(order.id, order.merchant_id, order.customer_email, order.total_amount, order.type, order.status);
    return this.getById(order.id)!;
  },

  /**
   * Sum total_amount over a date range for a merchant.
   * Used by the revenue endpoint.
   */
  sumAmountByMerchant(merchantId: string, from: string, to: string): number {
    const row = db
      .prepare(
        `SELECT COALESCE(SUM(CASE WHEN type = 'refund' THEN -total_amount ELSE total_amount END), 0) AS total
        FROM orders
        WHERE merchant_id = ? AND created_at >= ? AND created_at < ?`,
      )
      .get(merchantId, from, to) as { total: number };
    return row.total;
  },
};