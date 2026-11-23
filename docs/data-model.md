# Relational model

```mermaid
erDiagram
    USERS ||--o{ PRODUCTS : supplies
    CATEGORIES ||--o{ PRODUCTS : classifies
    USERS ||--o{ REVIEWS : rates
    PRODUCTS ||--o{ REVIEWS : receives
    PRODUCTS ||--o{ PRODUCT_PHOTOS : displays
    PRODUCTS ||--o| RETIRED_PRODUCTS : retires
    USERS ||--o{ ORDERS : places
    ORDERS ||--|{ VENDOR_ORDERS : contains
    USERS ||--o{ VENDOR_ORDERS : fulfills
    VENDOR_ORDERS ||--|{ ORDER_LINES : contains
    PRODUCTS ||--o{ ORDER_LINES : purchased
    USERS ||--o| ACCOUNT_PHOTOS : owns
    USERS ||--o| ACCOUNT_RECOVERY : recovers
    USERS ||--o{ ACCOUNT_NOTIFICATIONS : receives
    VENDOR_ORDERS ||--o{ ACCOUNT_NOTIFICATIONS : triggers
    USERS o|--o{ SECURITY_AUDIT : acts
```

| Table | Key | Responsibility |
| --- | --- | --- |
| users | id, unique email | Buyer or supplier identity, role, bcrypt hash |
| categories | id, unique name | Reusable product categories |
| products | id | Supplier, category, pack terms, price, stock, alert threshold, edit version |
| product_photos | photo_key, unique product_id + position | Gallery order and WebP image data |
| retired_products | product_id | Catalog deletion marker that preserves historical references |
| reviews | product_id + buyer_id | One rating per buyer and product |
| orders | id, unique buyer_id + request_key | Buyer, purchase timestamp, replay identity |
| vendor_orders | id, unique order_id + vendor_id | Supplier-specific fulfillment and completion time |
| order_lines | id, unique vendor_order_id + product_id | Ordered packs and purchase-time terms |
| account_photos | user_id, unique photo_key | Private profile image keyed by account |
| account_recovery | user_id | Digest of the current one-time recovery code |
| account_notifications | id, unique user_id + vendor_order_id + event_type | Order events with account-specific read state |
| api_rate_windows | action + subject + window_start | Shared request counts and expiration |
| security_audit | id, unique request_id | Audited action, HTTP outcome, timestamp, client address, and account when known |

Foreign keys enforce references between entities. Each relation stores attributes of its own key. A supplier name and category name appear once in their respective master tables. Product scores, cart totals, order totals, and sales are derived. A purchase line's historical title, price, and pack size describe the transaction at purchase time and can differ from the current catalog.

InnoDB indexes cover catalog category and price, buyer history, per-vendor status and completion time, and all foreign keys. The exact types, indexes, and constraints are in [the schema](../backend/config/schema.sql). Quantities are measured in packs. Line items preserve the number of units per pack to keep order history meaningful.
