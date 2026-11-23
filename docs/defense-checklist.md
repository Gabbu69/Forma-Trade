# Forma Trade defense checklist

Start the app with `start.cmd` and open http://127.0.0.1:8077/. Use the two buyer and two vendor demo accounts from the README. Run `python tests/acceptance.py --browser` before presenting. The suite uses a temporary database and saves screenshots under `.runtime/qa`.

| ICT 07 criterion | Show during the defense | Supporting evidence |
| --- | --- | --- |
| Backend and database · 30 | Buy one pack each of the Studio Mechanical Keyboard and Arc Task Lamp. Show one PO, a ₱13,500 total at the seed prices, and two vendor portions. Show that the two requests competing for the last pack produce one successful purchase. | Data model, schema, and last-pack acceptance test |
| Frontend and UX · 25 | Open the catalog and filter drawer on mobile. Show Profile, Settings, and Notifications at 375, 768, and 1440 px. Open the print view for a completed PO. | Edge screenshots and keyboard checks |
| Async JavaScript · 20 | Filter the catalog, change cart quantities, then advance one vendor portion. Switch the sales chart from Daily to Monthly. | Fetch requests and browser walkthrough |
| Security and Git · 15 | Show that the other vendor cannot update the order. Demonstrate a rate-limited request using the isolated test suite. Run `php -d extension=pdo_mysql backend/audit.php` to show the local audit format. | Role, CSRF, session revocation, and HTTP 429 tests |
| Documentation and defense · 10 | Open the GitHub repository. Walk through setup, the ERD, the requirements, and the API. | README and `docs/` |

**Extra credit.** Compare the vendor sales CSV with the chart for the same interval. Show the shared rate limit and an audit entry without credentials. These are the two selected items.
