// Set DB_PATH before importing the db module — the connection is created on import.
if (!process.env.DB_PATH) process.env.DB_PATH = ':memory:';

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initSchema, db } from '../src/db.js';
import { ordersDal } from '../src/dal/orders-dal.js';

// Fix: reset database state before each test to prevent state leaking between tests.
beforeEach(() => {
  initSchema();
  db.exec(`DELETE FROM orders; DELETE FROM merchants;`);
  db.prepare(`INSERT OR IGNORE INTO merchants (id, name) VALUES ('m_test', 'Test')`).run();
});

test('orders DAL: create + listByMerchant returns the order', () => {
  const created = ordersDal.create({
    id: 'o1',
    merchant_id: 'm_test',
    customer_email: 'a@b.com',
    total_amount: 5000,
    type: 'sale',
    status: 'completed',
  });

  assert.equal(created.id, 'o1');

  const list = ordersDal.listByMerchant('m_test');
  assert.equal(list.length, 1);
  assert.equal(list[0]!.total_amount, 5000);
});

test('orders DAL: getById returns the order', () => {
  ordersDal.create({
    id: 'o2',
    merchant_id: 'm_test',
    customer_email: 'c@d.com',
    total_amount: 1200,
    type: 'sale',
    status: 'completed',
  });

  const got = ordersDal.getById('o2');
  assert.equal(got?.total_amount, 1200);
});

// --- sumAmountByMerchant tests ---

test('sumAmountByMerchant: counts only sales when there are no refunds', () => {
  ordersDal.create({ id: 'o3', merchant_id: 'm_test', customer_email: 'x@y.com', total_amount: 3000, type: 'sale', status: 'completed' });
  ordersDal.create({ id: 'o4', merchant_id: 'm_test', customer_email: 'x@y.com', total_amount: 2000, type: 'sale', status: 'completed' });

  const total = ordersDal.sumAmountByMerchant('m_test', '2000-01-01', '2099-01-01');
  assert.equal(total, 5000);
});

test('sumAmountByMerchant: refunds are subtracted from revenue, not added', () => {
  ordersDal.create({ id: 'o5', merchant_id: 'm_test', customer_email: 'x@y.com', total_amount: 10000, type: 'sale',   status: 'completed' });
  ordersDal.create({ id: 'o6', merchant_id: 'm_test', customer_email: 'x@y.com', total_amount: 2500,  type: 'refund', status: 'completed' });

  const total = ordersDal.sumAmountByMerchant('m_test', '2000-01-01', '2099-01-01');
  // A buggy SUM() would return 12500; correct behaviour is 10000 - 2500 = 7500.
  assert.equal(total, 7500);
});

test('sumAmountByMerchant: returns 0 when refunds equal sales', () => {
  ordersDal.create({ id: 'o7', merchant_id: 'm_test', customer_email: 'x@y.com', total_amount: 4000, type: 'sale',   status: 'completed' });
  ordersDal.create({ id: 'o8', merchant_id: 'm_test', customer_email: 'x@y.com', total_amount: 4000, type: 'refund', status: 'completed' });

  const total = ordersDal.sumAmountByMerchant('m_test', '2000-01-01', '2099-01-01');
  assert.equal(total, 0);
});

// --- hasSaleForCustomer tests (Issue 20: refund validation) ---

test('hasSaleForCustomer: returns true when a completed sale exists', () => {
  ordersDal.create({ id: 'o9', merchant_id: 'm_test', customer_email: 'alice@example.com', total_amount: 5000, type: 'sale', status: 'completed' });

  const hasSale = ordersDal.hasSaleForCustomer('m_test', 'alice@example.com');
  assert.equal(hasSale, true);
});

test('hasSaleForCustomer: returns false when no sale exists for that customer', () => {
  const hasSale = ordersDal.hasSaleForCustomer('m_test', 'bob@example.com');
  assert.equal(hasSale, false);
});

test('hasSaleForCustomer: returns false when only a refund exists (no prior sale)', () => {
  ordersDal.create({ id: 'o10', merchant_id: 'm_test', customer_email: 'charlie@example.com', total_amount: 3000, type: 'refund', status: 'completed' });

  const hasSale = ordersDal.hasSaleForCustomer('m_test', 'charlie@example.com');
  assert.equal(hasSale, false);
});

test('hasSaleForCustomer: returns false for different customer (tenant isolation)', () => {
  db.prepare(`INSERT OR IGNORE INTO merchants (id, name) VALUES ('m_other', 'Other')`).run();
  ordersDal.create({ id: 'o11', merchant_id: 'm_other', customer_email: 'diana@example.com', total_amount: 5000, type: 'sale', status: 'completed' });

  const hasSale = ordersDal.hasSaleForCustomer('m_test', 'diana@example.com');
  assert.equal(hasSale, false);
});

test('hasSaleForCustomer: returns true even if multiple sales exist', () => {
  ordersDal.create({ id: 'o12', merchant_id: 'm_test', customer_email: 'eve@example.com', total_amount: 2000, type: 'sale', status: 'completed' });
  ordersDal.create({ id: 'o13', merchant_id: 'm_test', customer_email: 'eve@example.com', total_amount: 3000, type: 'sale', status: 'completed' });

  const hasSale = ordersDal.hasSaleForCustomer('m_test', 'eve@example.com');
  assert.equal(hasSale, true);
});

test('hasSaleForCustomer: returns false if sale exists but status is not completed', () => {
  // Insert a sale with a different status directly
  db.prepare(
    `INSERT INTO orders (id, merchant_id, customer_email, total_amount, type, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('o14', 'm_test', 'frank@example.com', 5000, 'sale', 'pending');

  const hasSale = ordersDal.hasSaleForCustomer('m_test', 'frank@example.com');
  assert.equal(hasSale, false);
});