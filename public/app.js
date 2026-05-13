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

// ── Order filter panel ──────────────────────────────────────────────────────

const filterFields = {
  email:     document.getElementById('f-email'),
  status:    document.getElementById('f-status'),
  type:      document.getElementById('f-type'),
  dateFrom:  document.getElementById('f-date-from'),
  dateTo:    document.getElementById('f-date-to'),
  amountMin: document.getElementById('f-amount-min'),
  amountMax: document.getElementById('f-amount-max'),
  nl:        document.getElementById('f-nl'),
};

const chipsEl      = document.getElementById('active-chips');
const resultNote   = document.getElementById('filter-result-note');
const advancedEl   = document.getElementById('advanced-fields');
const toggleBtn    = document.getElementById('advanced-toggle');

// Collapse / expand advanced fields
toggleBtn.addEventListener('click', () => {
  const open = advancedEl.style.display !== 'none';
  advancedEl.style.display = open ? 'none' : '';
  toggleBtn.setAttribute('aria-expanded', String(!open));
  toggleBtn.textContent = (open ? '▸' : '▾') + ' Advanced filters';
});

/** Build the query-param object from current field values. */
function buildFilterParams() {
  const p = {};
  if (filterFields.email.value.trim())     p.customer_email = filterFields.email.value.trim();
  if (filterFields.status.value)           p.status         = filterFields.status.value;
  if (filterFields.type.value)             p.type           = filterFields.type.value;
  if (filterFields.dateFrom.value)         p.from           = filterFields.dateFrom.value;
  if (filterFields.dateTo.value)           p.to             = filterFields.dateTo.value;
  if (filterFields.amountMin.value !== '') p.amount_min     = Math.round(parseFloat(filterFields.amountMin.value) * 100);
  if (filterFields.amountMax.value !== '') p.amount_max     = Math.round(parseFloat(filterFields.amountMax.value) * 100);
  if (filterFields.nl.value.trim())        p.q              = filterFields.nl.value.trim();
  return p;
}

/** Human-readable chip label for a filter key/value pair. */
function chipLabel(key, val) {
  const names = {
    customer_email: 'Email',
    status: 'Status',
    type: 'Type',
    from: 'From',
    to: 'To',
    amount_min: 'Min',
    amount_max: 'Max',
    q: 'Search',
  };
  if (key === 'amount_min' || key === 'amount_max') {
    return `${names[key]}: $${(val / 100).toFixed(2)}`;
  }
  return `${names[key] || key}: ${val}`;
}

/** Re-render the active-filter chips. */
function renderChips(params) {
  chipsEl.innerHTML = '';
  for (const [key, val] of Object.entries(params)) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.setAttribute('role', 'listitem');
    chip.textContent = chipLabel(key, val);
    const x = document.createElement('button');
    x.className = 'chip-x';
    x.setAttribute('aria-label', `Remove ${key} filter`);
    x.textContent = '×';
    x.addEventListener('click', () => {
      clearFilterField(key);
      applyFilters();
    });
    chip.appendChild(x);
    chipsEl.appendChild(chip);
  }
}

/** Clear a single field by its API param name. */
function clearFilterField(key) {
  const map = {
    customer_email: 'email',
    status: 'status',
    type: 'type',
    from: 'dateFrom',
    to: 'dateTo',
    amount_min: 'amountMin',
    amount_max: 'amountMax',
    q: 'nl',
  };
  const f = map[key];
  if (f && filterFields[f]) filterFields[f].value = '';
}


async function applyFilters() {
  const params = buildFilterParams();
  renderChips(params);
  const count = Object.keys(params).length;
  resultNote.textContent = count ? `${count} filter${count !== 1 ? 's' : ''} active` : '';

  const qs = new URLSearchParams(params).toString();
  const url = `/api/orders?limit=10${qs ? '&' + qs : ''}`;

  try {
    const res = await fetch(url, { headers: { 'X-Merchant-Id': select.value } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderOrdersTable(data.orders ?? []);
  } catch (err) {
    resultNote.textContent = `Error loading orders: ${err.message}`;
  }
}

/** Render rows into the orders table (extracted from refresh() so filters can reuse it). */
function renderOrdersTable(orders) {
  ordersTbody.innerHTML = '';
  for (const o of orders) {
    const tr = document.createElement('tr');
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

document.getElementById('filter-search-btn').addEventListener('click', applyFilters);

document.getElementById('filter-reset-btn').addEventListener('click', () => {
  for (const f of Object.values(filterFields)) f.value = '';
  chipsEl.innerHTML = '';
  resultNote.textContent = '';
  refresh(); // reload unfiltered view
});

document.getElementById('filter-export-btn').addEventListener('click', () => {
  const params = buildFilterParams();
  const qs = new URLSearchParams(params).toString();
  // TODO (backend): add GET /api/orders/export endpoint that accepts the same params.
  const url = `/api/orders/export?merchant_id=${encodeURIComponent(select.value)}${qs ? '&' + qs : ''}`;
  window.location.href = url;
});

// Allow Enter key to trigger search from any filter input
for (const f of Object.values(filterFields)) {
  f.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') applyFilters();
  });
}