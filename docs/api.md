# JSON API

All paths below start with `/api/`. Use the same session cookie for each request. JSON mutations accept a JSON object, the `Content-Type: application/json` header, and the current page's `csrf-token` meta value in `X-CSRF-Token`. Sign-in regenerates the session and token. Load the destination page after signing in. Responses are JSON. Errors have an `error` message.

Sign-in, registration, password reset, password change, and recovery code generation can return HTTP 429. The Retry-After header gives the number of seconds until another attempt is allowed. Audited requests include an X-Request-ID header for matching the response to the local audit log.

| Method and path | Caller | Request and response |
| --- | --- | --- |
| GET catalog | Public | Optional q, category, vendor, min, max, rating, stock=1, sort=price/high/name. Rating is a minimum from 0 to 5 inclusive. If both price bounds are set, min must be at or below max. Invalid ranges return HTTP 422. Returns matching products with supplier, category, average rating, pack price and stock. Returns the cover key in `image` and gallery keys in `images` in display order. See photo URLs below. |
| POST login | Public | email, password. Returns id, name, email, role. |
| POST register | Guest | name, email, new_password, confirm_password, role (buyer or vendor). Creates an account and signs it in. |
| POST reset-password | Public | email, code, new_password, confirm_password. Consumes a valid one-time recovery code and revokes earlier sessions. |
| POST account/profile | Signed-in session | name. Returns the saved display name. |
| POST account/password | Signed-in session | current_password, new_password, confirm_password. Changes the password and revokes other sessions. |
| POST account/recovery | Signed-in session | current_password. Returns a new one-time code and replaces the previous code. |
| POST account/photo | Signed-in session | Multipart photo[] with one supported image. Returns an account-private photo URL. |
| DELETE account/photo | Signed-in session | Empty object. Removes the current profile photo. |
| GET notifications | Signed-in session | Returns the total unread count. The inbox page at /notifications supports unread=1 and a before cursor. |
| POST notifications | Signed-in session | through. Marks notifications through that ID as read. Returns unread count. |
| DELETE notifications | Signed-in session | id or all=true. Removes notifications from the signed-in account and returns unread count. |
| POST logout | Signed-in session | Empty object. Ends session and returns ok. |
| GET cart | Guest or buyer | Returns items with quoted prices and quantities, plus checkout key. |
| POST cart | Guest or buyer | id with either an absolute quantity or a signed delta in packs. A delta is applied to the current session quantity while the session is locked. Zero removes a line. Returns refreshed cart and key. |
| POST checkout | Buyer | key from latest cart. Returns order_id. A repeated completed key returns the original ID. |
| GET orders | Buyer | Purchase lines with order_id, group_id, vendor, buyer, fulfillment status, creation date, historical pack terms and quantity. |
| GET vendor/products | Vendor | The caller’s products and edit versions. |
| POST vendor/products | Vendor | Send name, category_id, pack_size, price, stock, low_threshold and multipart photos[]. Include id and version for edits. Returns id. |
| DELETE vendor/products | Vendor | Send id and version as JSON. Removes an owned product from sale and returns ok. Past order records retain their purchase-time details. |
| GET vendor/orders | Vendor | Order lines scoped to the caller’s fulfillment groups. |
| POST vendor/orders | Vendor | id of the fulfillment group and next status, processing or fulfilled. Returns updated lines. |
| GET vendor/sales | Vendor | period=day or month. Returns ordered date, label and amount buckets. |

For product uploads, submit multipart form data with the CSRF header. Send one to three JPEG, PNG, or WebP photos of up to 2 MB each. Omitting files on edit keeps the current gallery. JSON callers may still use a bundled image key. Uploaded image keys are 32 lowercase hex characters and resolve at /media/products/{key}. Bundled keys resolve at /static/img/{key}.webp.

The vendor-only `GET /api/vendor/sales/export?period=day|month` downloads the same aggregated buckets as the sales chart. The UTF-8 CSV includes the columns `period` and `sales_php`. Dates use YYYY-MM-DD for daily totals and YYYY-MM for monthly totals.

The API returns 401 for unauthenticated protected calls, 403 for forbidden roles, ownership or CSRF, 404 for missing endpoints, 405 for unsupported methods, 409 for business conflicts and 422 for invalid fields. Protected HTML routes redirect guests to sign in. After a checkout conflict, reload the cart to obtain the current quote and key. An inventory version conflict requires reopening the product before saving.

### Example purchase

```javascript
const token = document.querySelector('meta[name=csrf-token]').content;
const headers = {'Content-Type':'application/json','X-CSRF-Token':token};
const cart = await fetch('/api/cart', {
  method:'POST', headers, body:JSON.stringify({id:1, quantity:2})
}).then(response => response.json());
const result = await fetch('/api/checkout', {
  method:'POST', headers, body:JSON.stringify({key:cart.key})
}).then(response => response.json());
```

An order's total equals the sum of purchase-time unit_price × quantity for each returned line. Both daily and monthly revenue count only fulfilled supplier portions, using fulfilled_at in Asia/Manila time.
### Reordering from purchase history

Buyers can fetch `GET /api/orders/{id}/reorder` for their own PO. The response contains a review token and historical lines with the original supplier, current catalog terms, available stock, cart quote, maximum additional packs, and suggested quantity.

Send the token and an `items` array of positive integer `line_id` and `quantity` pairs to `POST /api/orders/{id}/reorder` with the session CSRF header. Omit skipped lines. Confirmation updates the cart in one batch and returns the pack count added. An identical retry with the same token returns the same acknowledgment. A 409 response with a new review requires confirmation of updated terms. Expired tokens require opening a fresh review. Checkout separately places the new PO and deducts inventory.
