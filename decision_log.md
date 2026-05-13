# Decision Log — Sofia Moreno

## Issues addressed

- **Issue 1 — Revenue calculation includes refunds [HIGH RISK]**

  `sumAmountByMerchant()` aggregates all order amounts regardless of type, silent correctness bug that makes every revenue figure on the dashboard wrong. Fixed by adding `WHERE type = 'sale'` to the aggregation query and adding a test that was missing. Rejected fixing this at the route layer (summing in JS) because that pulls all orders into memory and moves business logic out of the DAL where it belongs.

- **Issue 2 — No authorization check on order access [HIGH RISK]**

  The `X-Merchant-Id` header is validated in `auth.ts` but the order lookup never filters by it. Merchant A can read Merchant B's orders by guessing IDs. Broken access control at the data layer, not the middleware layer. Fixed by adding `AND merchant_id = ?` to the lookup query. Rejected a pre-query ownership check (two DB round trips vs one, and easier to accidentally bypass in future changes).

- **Issue 3 — XSS via `innerHTML` [HIGH RISK]**
  Order data inserted via `innerHTML` executes in the browser if any field contains a script payload. A real attack surface in a multi-tenant system. Fixed by replacing `innerHTML` with `textContent` and explicit DOM construction. Rejected string sanitization because regex-based sanitization has well-documented bypasses; removing `innerHTML` eliminates the surface entirely.

---

## Feature chosen — Order search with natural language interface

GET /api/orders with filters (type, date range, amount range, email, status) and UI. A plain-English query goes to parseNaturalLanguageQuery(), which calls the LLM with a scoped system prompt and parses the response into an NLFilters JSON object; that object hits the search endpoint as query params.


The model never touches query construction or business logic. That boundary keeps the pipeline testable. AI integration is the name of the job and this is the kind of boundary I think hardest about. We can talk to our client now with LLMS, what might they need?


Chose this over CSV export and webhooks (even though webhooks could be an interesting implementation) because those add ways to move data; this gives the user the tools they need to make decisions out of the box.
Cut to ship: fuzzy email (exact only), configurable sort (date desc, hardcoded), streaming, conversation history for follow-ups, different types (number vs. string on limit for example) though this is a low risk and is handled appropriately in code.

---

## Things I noticed but did NOT fix

- **Merchant ID not validated against the DB (`auth.ts`):** real fix requires a DB lookup per request and a question on architecture (e.i. move to Cognito?). Implementing JWT as suggested could be a trivial task that is already accounted for and might prove futile in future architectural changes, so I left it alone for now. Though this issue constitutes a real risk.
- **Pagination offset missing (`orders.ts`, `orders-dal.ts`):** This is not a high risk bug though it is important to consider for scalability.
- **Metrics router opens its own DB connection, never closes it (`metrics.ts`):** right fix is a shared singleton DB module; touching the connection model risks regression across all routes.
- **No date validation on `from`/`to` parameters (`revenue.ts`, `orders.ts`):** same bug in two places ; a shared `isValidISODate()` utility fixes both, didn't reach it in budget.

---

## Docs left alone deliberately

Did not update `docs/api.md` for endpoints I didn't modify. documenting routes I did not test risked introducing inaccuracies.
Did not change anything about the databse schema.


---

## What I'd do with another 6 hours

Fix the date validation utility across both routes, refactor the DB connection into a singleton, add fuzzy email matching and configurable sort to the search endpoint, and add conversation history to the NL layer so follow-up queries retain context. Overall fix the issues already identified by the TODOs.