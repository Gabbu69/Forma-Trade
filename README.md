# Forma Supply

Forma Supply is a local wholesale marketplace for workspace products. Retail buyers order packs in Philippine pesos. Each supplier manages its catalog, inventory, fulfillment queue, and sales chart.

## Windows quick start

1. Install PHP 8.1 or newer with PDO MySQL and mbstring, and a Windows MariaDB distribution with the server and database initializer. PHP must be on PATH. This PC has PHP 8.5 and a working XAMPP MariaDB installation.
2. Double-click **start.cmd**. On first launch it creates the ignored local configuration, initializes a private database under `.runtime/mysql`, seeds the catalog, and starts the web server. Subsequent launches retain your orders. Allow the first initialization to finish.
3. Open **http://127.0.0.1:8077/**. The catalog, images, Bootstrap, icons, and charts work offline.

To keep the browser closed or choose the web port, use `powershell -ExecutionPolicy Bypass -File .\start.ps1 -NoBrowser -Port 8080`. The launcher loads PDO MySQL per PHP process. Set `FORMA_MARIADB_BIN` to a MariaDB bin folder for a custom installation. The automatic search checks Program Files and C:\xampp. The dedicated database uses TCP port 33317 on loopback. The web server runs in the launch window. Ctrl+C stops the web server. The private database process can stay running between demos.

For an existing MySQL 8 or MariaDB server, create a dedicated empty UTF-8 database and app user. Before first launch, copy `.env.example` to `.env` and enter its connection settings. Grant the application SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX, and REFERENCES on that database. Run `php -d extension=pdo_mysql backend/setup.php` and then the launcher. Setup preserves previously seeded records. Demo credentials and purchase orders are intended for local presentation.

## Demo accounts

Choose **Sign in → Use a demo account**, select an account, then sign in. All four demo passwords are `FormaDemo24!`. Database credentials are generated separately and stored outside Git.

| Account | Role | Email |
| --- | --- | --- |
| North Retail | Buyer | north@forma.test |
| Bay Retail | Buyer | bay@forma.test |
| Form Studio | Vendor | form@forma.test |
| Field Objects | Vendor | field@forma.test |

## Defense walkthrough

1. Open the catalog. Filter by category, price, or rating, then reset. Add one Studio Mechanical Keyboard pack and one Arc Task Lamp pack.
2. Open the cart. The original seed prices give subtotals of ₱8,900 and ₱4,600, for ₱13,500 in total. Sign in as North Retail from the cart and place the order. Read its PO number and the two supplier statuses.
3. Sign in as Form Studio. Open **Orders**, locate the PO, start processing, and mark it fulfilled. View **Overview** and switch the sales chart between daily and monthly.
4. Sign in as Field Objects. Its portion remains received. Fulfill it, then inspect the low-stock Lift Laptop Stand under **Inventory** and edit its alert threshold.
5. Return to North Retail’s **Purchase orders** and find both fulfilled portions. Use the automated checks below to demonstrate a last-pack race and a price change without altering the presentation data.

### Pack preview, appearance, and reporting

Open the product photo or name to compare its pack price, units per pack, and unit cost. Choose the number of packs to see total units and the extended price. The confirmation includes a **View cart** link. The header’s **Appearance** selector offers System, Light, and Dark. The selection persists across the buyer and vendor workspaces on the same browser.

In the vendor overview, select a metric to see only low-stock products or outstanding orders. Use **Show all** to restore the full list. After fulfilling an order, choose the daily or monthly interval and select **Download CSV**. Open the file and compare its peso amounts with **View sales figures**. Each report contains only the signed-in vendor’s fulfilled sales.

## Architecture and documentation

The PHP front controller dispatches page and JSON routes through session, role, and CSRF checks. Catalog and purchase services use PDO prepared statements and InnoDB. Templates render the layout. Vanilla JavaScript fetches data and updates catalog cards, cart lines, order statuses, and Chart.js datasets. The router serves only approved static asset types under the static directory.

- [Requirements and business rules](docs/requirements.md)
- [Database model and ER diagram](docs/data-model.md)
- [JSON API reference](docs/api.md)
- [SQL schema](backend/config/schema.sql) and [seed records](database_seed.sql)
- The locally bundled Inter font and its license are in `static/fonts`. Third-party libraries and license notices are in `static/vendor`. The bundled product and workspace photographs were generated for this demo.

## Verification

Start the private demo database with the launcher, then run `python tests/acceptance.py` from the project folder with Python 3.10 or newer. The suite creates a uniquely named test schema, seeds it, opens two independent PHP server processes, and removes its own schema after testing. Tests cover multi-supplier orders, duplicate submission, inventory contention, updated quotes, ownership, request validation, and both sales periods.

For browser checks, install Node.js and Playwright in your test environment, make the `playwright` package resolvable by Node, and install Microsoft Edge. Run `python tests/acceptance.py --browser`. Set `FORMA_BROWSER=chrome` for installed Chrome. Browser checks exercise the UI at 375, 768, and 1440 pixels and save screenshots in `.runtime/qa`. The app itself does not require Node.js or Python.

## Repository handoff

The project root contains the launcher, setup guide, and sample data. Submit the source including `backend`, `templates`, `static`, `docs`, and `tests`. The ignore file excludes local credentials, database files, and QA captures. The catalog supports six bundled photo choices for vendor-created products.
