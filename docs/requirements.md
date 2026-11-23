# Forma Trade requirements

## Audience and workflows

Retail buyers compare workspace supplies sold in wholesale packs. Form Studio and Field Objects operate independent supplier accounts in the seeded demonstration. Guests can browse and build a cart. Signing in as a buyer from that cart preserves its contents. Signing out ends the session.

| Capability | Acceptance condition |
| --- | --- |
| Catalog discovery | Name and supplier search, category, supplier, minimum and maximum pack price, minimum rating, in-stock filter, and sort update the grid asynchronously. |
| Purchase cart | The server tracks integer pack quantities, quoted price, and quoted pack size in the PHP session. Changes recalculate supplier subtotals and the order total. |
| Purchase order | A buyer confirms one order across suppliers. Each supplier gets its own fulfillment record. The buyer sees the PO number and each status. |
| Inventory | A supplier creates and edits only its products, including pack size, photo, price, stock, and alert threshold. An outdated edit produces a conflict. |
| Fulfillment | Each supplier advances its own portion from received to processing to fulfilled. The fulfillment date drives recorded sales. |
| Sales | The chart and accessible data view show seven daily or six monthly buckets, including zero-sales periods, in Philippine time. |

## Consistency and access

Prices are PHP currency amounts per pack stored as SQL decimals. The browser uses integer centavos for line totals. The server reads prices, stock, vendor ownership, and fulfillment transitions directly from the database. Checkout locks products by ascending ID inside one transaction. Insufficient stock rolls back the entire purchase. A changed pack quote requires review. Idempotency keys are unique per buyer and completed submission. Historical lines retain the pack size, item name, and price accepted at purchase.

Buyer order queries are scoped by buyer ID. Vendor fulfillment, product mutations, and analytics are scoped by vendor ID. Admin database provisioning is a CLI-only operation. Session authentication uses bcrypt, session ID regeneration, HTTP-only cookies, SameSite protection, and CSRF tokens on mutations. Templates escape text, and the browser constructs data-bearing elements with DOM text nodes.

## Pack comparison and sales reports

Buyers can open a product preview and change the number of packs to compare total units and cost. Each addition updates the server-side session in click order. The cart counter and product confirmation reflect the accepted quantity.

The low-stock and awaiting-fulfillment metrics open filtered worklists. A vendor can switch back to all records. Downloadable daily and monthly CSV reports use the same vendor-scoped fulfilled sales calculation as the dashboard chart.

## Presentation and operation

The catalog opens at the root URL. The header button switches between light and dark. It follows the system appearance until you choose a theme and stores that choice locally. Inter, icons, images, and chart libraries are bundled for offline use. Its pale photo panels, graphite type, raised controls, and blue actions share styling with the cart, order history, and vendor workspace. Small viewports use a filter drawer and stacked order rows. Form controls have labels and focus indicators. Charts expose the same values as text. The database, images, libraries, and application all run locally for the defense.

Checkout records a purchase order in pesos. Fulfillment is tracked per supplier. The seed includes previously fulfilled orders and inventory counts as of the start of the demonstration.
