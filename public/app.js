const select = document.getElementById('merchant-select');
const totalOrdersEl = document.getElementById('total-orders');
const uniqueCustomersEl = document.getElementById('unique-customers');
const avgOrderEl = document.getElementById('avg-order');
const revenue30dEl = document.getElementById('revenue-30d');
const ordersTbody = document.getElementById('orders-tbody');

function api(path) {
  return fetch(path, { headers: { 'X-Merchant-Id': select.value } }).then((r) => r.json());
}

function money(cents) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

// TODO: No error handling in async API calls
// failures silently result in undefined values. Users see empty dashes without knowing what failed.
// Add try-catch and error callbacks with user-visible error messages.
async function refresh() {
  const summary = await api('/api/metrics/summary');
  totalOrdersEl.textContent = summary.total_orders ?? '—';
  uniqueCustomersEl.textContent = summary.unique_customers ?? '—';
  avgOrderEl.textContent = money(summary.avg_order_value_cents ?? 0);

  const now = new Date();
  const thirtyAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const revenue = await api(`/api/revenue?from=${isoDate(thirtyAgo)}&to=${isoDate(now)}`);
  revenue30dEl.textContent = money(revenue.revenue_cents ?? 0);

  const ordersRes = await api('/api/orders?limit=10');
  ordersTbody.innerHTML = '';
  for (const o of ordersRes.orders ?? []) {
    const tr = document.createElement('tr');

    // FIX: Create each <td> individually and assign values via textContent,
    // so the browser never parses the data as HTML — eliminating XSS risk.
    const cells = [
      new Date(o.created_at).toLocaleDateString(),
      o.customer_email,
      o.type,
      money(o.total_amount),
    ];

    for (const value of cells) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }

    ordersTbody.appendChild(tr);
  }
}

select.addEventListener('change', refresh);
refresh();