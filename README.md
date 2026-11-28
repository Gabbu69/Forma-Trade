# Forma Trade

**ICT 07 · Web Design and Development · Senior Project Report**

Option B · Multi-Vendor B2B E-Commerce and Inventory Platform

| Submitted by | GitHub username | Profile display name |
| --- | --- | --- |
| Edgardo Gabriel L. Paclibar | [@Gabbu69](https://github.com/Gabbu69) | Gabbu_69 |
| Ruby Jean B. Solomon | [@Andyyy28](https://github.com/Andyyy28) | Ruby Jean B. Solomon |

## Project overview

When a retailer buys keyboards from one supplier and lamps from another, the buyer needs one purchase order while each supplier needs its own stock count and shipment record. We built Forma Trade around that transaction. Buyers compare wholesale packs, place an order in Philippine pesos, and track each shipment. Each vendor manages its own listings, fulfills its portion of the order, and sees revenue when that portion is complete.

![Forma Trade catalog showing pack prices, per-unit costs, and stock for products from Form Studio and Field Objects](docs/marketplace.jpg)

## Demonstration

The seeded catalog contains 18 products from two suppliers. To follow one order from checkout to sales reporting, [run the app locally](#run-locally) and use the [demo accounts](#demo-accounts).

1. **Compare pack prices.** As North Retail, add one pack of Studio Mechanical Keyboards from Form Studio (4 units for ₱8,900) and one pack of Arc Task Lamps from Field Objects (2 units for ₱4,600). The cart should show **₱13,500**.
2. **Place the purchase order.** At checkout, record the PO number. The buyer sees one order with two shipments. Each vendor sees only the items it must fulfill.
3. **Trace fulfillment into revenue.** Sign in as each vendor, find the PO, and advance its shipment to completion. Compare the daily sales chart with the CSV for the same period. Each vendor’s figures include only its own completed sales.
4. **Review the buyer’s record.** Return as North Retail to open the shipment notifications, print the purchase order, and rate a completed item. On the seeded PO-1001, **Buy Again** lets the buyer review current pack sizes and prices before reordering.

## ICT 07 requirements and evidence

| Assessment area | What to inspect |
| --- | --- |
| Backend and relational database | Checkout locks stock inside one transaction. If two buyers request the last pack, one completes the purchase and the other keeps an editable cart. Follow the relationship from order to supplier shipment to line item in the [data model](docs/data-model.md). |
| Responsive interface | The catalog displays filters beside results on desktop and in a drawer on mobile. The [browser walkthrough](tests/browser.cjs) checks horizontal overflow at 375, 768, and 1440 px, keyboard focus, and both themes. |
| Asynchronous JavaScript | Catalog filtering, cart quantities, fulfillment updates, and daily or monthly sales charts use Fetch. The [API reference](docs/api.md) describes the requests and responses behind each interaction. |
| Security and version control | The app uses bcrypt password hashes, prepared statements, role and ownership checks, and CSRF tokens. The [acceptance suite](tests/acceptance.py) checks that one vendor cannot edit another vendor’s products. |
| Documentation and oral defense | The [requirements](docs/requirements.md) define the workflows. The [defense checklist](docs/defense-checklist.md) pairs each rubric area with a demonstration. |

The two extra-credit features are **downloadable sales CSVs** and **rate limiting with audit logging**. Both database jobs passed on the application version used for this report. [MySQL 8.0 and MariaDB 10.11 test results](https://github.com/Gabbu69/Forma-Trade/actions/runs/46165671397)

## Architecture

The Bootstrap 5 interface uses vanilla JavaScript to fetch catalog and order data and Chart.js to plot sales. The PHP 8 backend handles authentication, validates requests, and reads and writes data through PDO. InnoDB saves purchase lines and deducts stock together. Each line retains the price and pack size accepted at checkout, so later catalog edits preserve the original order total. [SQL schema](backend/config/schema.sql) · [Demo seed](database_seed.sql)

## Run locally

On Windows, the default launcher requires PHP 8.1+ on PATH with PDO MySQL, mbstring, and GD with WebP support. Install MariaDB with its server and database initializer.

1. Double-click **start.cmd**, or run it from the project folder.

   ```powershell
   .\start.cmd
   ```

2. Open [http://127.0.0.1:8077/](http://127.0.0.1:8077/). The first launch creates `.env`, initializes the private database on loopback port 33317, and seeds the catalog. Later launches preserve your data.

The storefront, photos, and charts work offline. Press **Ctrl+C** in the launch window to stop the web server.

<details>
<summary>Custom port or existing database</summary>

To change the port and leave the browser closed, run:

```powershell
.\start.cmd -NoBrowser -Port 8080
```

Set `FORMA_MARIADB_BIN` if MariaDB is installed outside the folders the launcher searches. The default search checks Program Files and `C:\xampp`.

To use an existing MySQL 8 or MariaDB server, copy `.env.example` to `.env` and configure a dedicated UTF-8 database and app user. Grant SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, and REFERENCES on that database. Run:

```powershell
php -d extension=pdo_mysql backend/setup.php
.\start.cmd
```

The same setup command applies additive upgrades to an existing database. Sessions created before session versioning require a fresh sign-in after the upgrade.

</details>

## Demo accounts

On the sign-in page, open **Use a demo account** and select an account. The shared local demo password is `FormaDemo24!`.

| Account | Role | Email |
| --- | --- | --- |
| North Retail | Buyer | `north@forma.test` |
| Bay Retail | Buyer | `bay@forma.test` |
| Form Studio | Vendor | `form@forma.test` |
| Field Objects | Vendor | `field@forma.test` |

Both roles can edit their profile, choose a theme, and manage notifications. In **Settings**, a signed-in user can generate a one-time recovery code.

## Tests and audit log

[![Forma Trade automated checks on main](https://github.com/Gabbu69/Forma-Trade/actions/workflows/checks.yml/badge.svg?branch=main)](https://github.com/Gabbu69/Forma-Trade/actions/workflows/checks.yml)

Start the local database first. **Python 3.10+** runs the API acceptance suite against an isolated test database.

```powershell
python tests/acceptance.py
```

For the browser walkthrough, install Node.js and Microsoft Edge, then install Playwright in the ignored runtime folder.

```powershell
npm install --prefix .runtime/browser playwright
$env:NODE_PATH = (Resolve-Path .runtime/browser/node_modules).Path
python tests/acceptance.py --browser
```

Use `$env:FORMA_BROWSER = "chrome"` for installed Chrome. The suite checks 375, 768, and 1440 px viewports and saves screenshots in `.runtime/qa`. GitHub Actions runs syntax checks and the API suite on both MySQL 8.0 and MariaDB 10.11 for pull requests and pushes to `main`.

View the latest 50 local security events with:

```powershell
php -d extension=pdo_mysql backend/audit.php
```

The audit records include the action, outcome, timestamp, and account when known. Passwords and recovery codes are excluded. Authentication rate limits return HTTP 429 with a retry time.
