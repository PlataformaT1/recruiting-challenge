import { Router } from 'express';
import Database from 'better-sqlite3';

// TODO: Separate read-only database connection in metrics router! and never closed. 
// Mentioned in docs
// Multiple connections waste resources and don't scale.
// Use single shared database instance passed from server context.
const DB_PATH = process.env.DB_PATH ?? 'data/dashboard.db';
const metricsDb = new Database(DB_PATH, { readonly: true });

export const metricsRouter = Router();

/**
 * GET /api/metrics/summary
 *
 * Returns dashboard summary stats for the current merchant.
 */

// (Duplicate of above: separate database connection violates single connection principle.) 

metricsRouter.get('/summary', (req, res) => {
  const merchantId = req.merchantId!;

  const totalOrdersRow = metricsDb
    .prepare(`SELECT COUNT(*) AS n FROM orders WHERE merchant_id = ?`)
    .get(merchantId) as { n: number };

  const totalCustomersRow = metricsDb
    .prepare(
      `SELECT COUNT(DISTINCT customer_email) AS n FROM orders WHERE merchant_id = ?`,
    )
    .get(merchantId) as { n: number };

  const avgOrderRow = metricsDb
    .prepare(
      `SELECT COALESCE(AVG(total_amount), 0) AS avg FROM orders WHERE merchant_id = ?`,
    )
    .get(merchantId) as { avg: number };

  res.json({
    merchant_id: merchantId,
    total_orders: totalOrdersRow.n,
    unique_customers: totalCustomersRow.n,
    avg_order_value_cents: Math.round(avgOrderRow.avg),
  });
});

// TODO: Missing indexes on customer_email and calculated fields. 
// Large datasets cause slow group-by queries and full table scans.
// Add database indexes and consider materializing frequently-calculated values.

metricsRouter.get('/top-customers', (req, res) => {
  const merchantId = req.merchantId!;
  const limit = Number(req.query.limit ?? 5);

  const rows = metricsDb
    .prepare(
      `SELECT customer_email, COUNT(*) AS order_count, SUM(total_amount) AS total_spent
       FROM orders
       WHERE merchant_id = ?
       GROUP BY customer_email
       ORDER BY total_spent DESC
       LIMIT ?`,
    )
    .all(merchantId, limit) as Array<{ customer_email: string; order_count: number; total_spent: number }>;

  res.json({ customers: rows });
});
