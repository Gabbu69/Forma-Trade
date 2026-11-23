/* Optional browser checks. Run through acceptance.py --browser on the isolated test schema. */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const base = process.argv[2];
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base))
  throw new Error("Run via the isolated acceptance suite.");
const out = path.resolve(".runtime/qa");
fs.mkdirSync(out, { recursive: true });
// Poll from Node so Chromium can keep the application's CSP intact.
async function waitForPage(page, condition, arg) {
  const deadline = Date.now() + 15000;
  do {
    if (await page.evaluate(condition, arg)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  } while (Date.now() < deadline);
  throw new Error("Page condition did not become true: " + condition);
}
async function signIn(page, account) {
  await page.goto(base + "/login");
  await page.locator("summary").click();
  await page.locator("[data-demo=" + account + "]").click();
  await page.locator("#loginForm button").click();
  await page.waitForURL(account === "north" ? base + "/" : base + "/vendor");
}
async function signOut(page) {
  await page.locator("#accountMenu").click();
  await page.locator("#logout").click();
  await page.waitForURL(base + "/login");
}

async function verifyAccountsAndNotifications(page) {
  for (const view of ["profile", "settings", "notifications"]) {
    await page.goto(base + "/" + view);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, view);
    }
  }
  const notifications = page.locator(".notification-item");
  await notifications.first().waitFor();
  const before = await notifications.count();
  assert.ok(before > 1);
  await notifications.first().getByRole("button", { name: /^Delete / }).click();
  await page.getByText("Notification deleted.", { exact: true }).waitFor();
  assert.equal(await notifications.count(), before - 1);

  const dialog = page.getByRole("dialog", { name: "Delete all notifications?" });
  const clearInbox = page.locator("#deleteAllNotifications");
  const modalColor = () => dialog.locator(".modal-content").evaluate((el) => getComputedStyle(el).backgroundColor);
  await setTheme(page, "dark");
  await clearInbox.click();
  await dialog.waitFor();
  const darkColor = await modalColor();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await notifications.count(), before - 1);
  await setTheme(page, "light");
  await clearInbox.click();
  await dialog.waitFor();
  assert.notEqual(await modalColor(), darkColor);
  await dialog.getByRole("button", { name: "Delete all" }).click();
  await page.getByText("Order updates will appear here.").waitFor();
  await page.reload();
  assert.equal(await notifications.count(), 0);
  assert.equal(await page.locator("#notificationCount").isHidden(), true);

  await signOut(page);
  await page.getByRole("link", { name: "Create account" }).click();
  const register = page.locator("#registerForm");
  await register.getByRole("radio", { name: "Buyer" }).press("ArrowRight");
  assert.ok(await register.getByRole("radio", { name: "Vendor" }).isChecked());
  const email = "browser-supplier@example.test";
  const password = "SupplierDemo-2468!";
  const replacement = "SupplierDemo-9753!";
  await register.getByLabel("Display name").fill("Browser Supplier");
  await register.getByLabel("Email address").fill(email);
  await register.getByLabel("New password", { exact: true }).fill(password);
  await register.getByLabel("Confirm password").fill(password);
  await register.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(base + "/vendor");

  await page.goto(base + "/profile");
  await page.getByLabel("Display name").fill("Test Supplier");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByText("Profile saved.", { exact: true }).waitFor();
  await page.getByLabel("Choose a photo").setInputFiles(path.resolve("static/img/keyboard.webp"));
  await page.getByRole("button", { name: "Save photo" }).click();
  await page.getByText("Profile photo saved.", { exact: true }).waitFor();
  const avatar = page.locator("#accountMenu img");
  const source = await avatar.getAttribute("src");
  await page.reload();
  await avatar.evaluate((img) => img.decode());
  assert.equal(await avatar.getAttribute("src"), source);
  assert.equal(await page.getByLabel("Display name").inputValue(), "Test Supplier");
  await page.locator("#accountMenu").click();
  assert.equal(await page.locator(".account-menu-name img").getAttribute("src"), source);
  await page.locator(".account-menu").getByRole("link", { name: "Settings" }).click();
  await page.locator(".appearance-option").filter({ hasText: "Dark" }).click();
  await page.locator('html[data-bs-theme="dark"]').waitFor();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("data-bs-theme"), "dark");
  await page.locator("#recoveryPassword").fill(password);
  await page.getByRole("button", { name: "Generate recovery code" }).click();
  const codeBox = page.locator("#recoveryResult code");
  await codeBox.waitFor();
  const code = await codeBox.textContent();

  const browser = page.context().browser();
  const otherContext = await browser.newContext();
  const resetContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await other.goto(base + "/login");
    await other.getByLabel("Email address").fill(email);
    await other.getByLabel("Password", { exact: true }).fill(password);
    await other.locator("#loginForm button").click();
    await other.waitForURL(base + "/vendor");

    const reset = await resetContext.newPage();
    await reset.goto(base + "/login");
    await reset.getByRole("link", { name: "Forgot password?" }).click();
    await reset.getByLabel("Email address").fill(email);
    await reset.getByLabel("Recovery code").fill(code);
    await reset.getByLabel("New password", { exact: true }).fill(replacement);
    await reset.getByLabel("Confirm password").fill(replacement);
    await reset.getByRole("button", { name: "Reset password" }).click();
    await reset.getByText("Password reset. Sign in with your new password.").waitFor();
    for (const signedIn of [page, other]) {
      await signedIn.goto(base + "/settings");
      await signedIn.waitForURL(base + "/login?next=%2Fsettings");
    }
    await reset.getByLabel("Email address").fill(email);
    await reset.getByLabel("Password", { exact: true }).fill(replacement);
    await reset.locator("#loginForm button").click();
    await reset.waitForURL(base + "/vendor");
  } finally {
    await otherContext.close();
    await resetContext.close();
  }
  console.log("PASS browser notification deletion in both themes, vendor signup, profile photo, settings, password recovery and sign-out");
}

async function layout(page, width, label) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    label + " overflows at " + width,
  );
  const theme = await page.locator("html").getAttribute("data-bs-theme");
  await page.screenshot({
    path: path.join(out, label + "-" + width + "-" + theme + ".png"),
  });
}
async function setTheme(page, theme) {
  if (await page.locator("html").getAttribute("data-bs-theme") !== theme)
    await page.locator("#appearance").click();
}
async function bothThemes(page, width, label) {
  for (const choice of ["dark", "light"]) {
    await setTheme(page, choice);
    assert.equal(
      await page.locator("html").getAttribute("data-bs-theme"),
      choice,
    );
    await layout(page, width, label);
  }
}
async function downloadAndCompare(page, period) {
  await page.locator("#period").selectOption(period);
  const size = period === "day" ? 7 : 6;
  await waitForPage(
    page,
    (n) => document.querySelectorAll("#salesFigures>div").length === n,
    size,
  );
  const output = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const download = await output;
  assert.equal(download.suggestedFilename(), "forma-sales-" + period + ".csv");
  const lines = fs
    .readFileSync(await download.path(), "utf8")
    .trim()
    .split(/\r?\n/);
  assert.equal(lines.shift(), "period,sales_php");
  const plotted = await page.evaluate(
    () =>
      Chart.getChart(document.getElementById("chart")).data.datasets[0].data,
  );
  assert.deepEqual(
    lines.map((line) => Number(line.split(",")[1])),
    plotted,
  );
}
(async () => {
  const browser = await chromium.launch({
    channel: process.env.FORMA_BROWSER || "msedge",
    headless: true,
  });
  const errors = [];
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  const remote = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (
      url.startsWith(base + "/") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    )
      return route.continue();
    remote.push(url);
    return route.abort();
  });
  const page = await context.newPage();
  try {
    const native = await browser.newContext({ javaScriptEnabled: false });
    try {
      const login = await native.newPage();
      await login.goto(base + "/login");
      assert.match(await login.locator("noscript").innerText(), /Enable JavaScript to sign in/);
      await login.getByLabel("Email address").fill("native@example.test");
      await login.getByLabel("Password", { exact: true }).fill("NativeFormFixture!");
      const request = login.waitForRequest((r) => r.url() === base + "/api/login");
      await login.locator("#loginForm button").click();
      assert.equal((await request).method(), "POST");
      await login.waitForURL(base + "/api/login");
    } finally {
      await native.close();
    }
    await page.goto(base + "/");
    await page.locator(".product-card").first().waitFor();
    await page
      .locator(".product-photo img")
      .evaluateAll((imgs) => Promise.all(imgs.map((img) => {
        img.loading = "eager";
        return img.decode();
      })));
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.fonts.check("16px Inter")));
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").innerText(), "Skip to content");
    const riser = page.getByRole("button", { name: "Preview Bridge Monitor Riser" });
    await riser.click();
    await page.getByRole("button", { name: "Previous photo" }).click();
    await page.getByRole("button", { name: "Previous photo" }).press("ArrowRight");
    assert.match(await page.locator("#previewPhoto").getAttribute("src"), /riser\.webp$/);
    await page.getByRole("button", { name: "Next photo" }).click();
    assert.match(await page.locator("#previewPhoto").getAttribute("src"), /riser-detail\.webp$/);
    await page.getByRole("button", { name: "Bridge Monitor Riser · In use" }).click();
    await page.locator("#previewPhoto").evaluate((img) => img.decode());
    assert.match(await page.locator("#previewPhoto").getAttribute("src"), /riser-workspace\.webp$/);
    await page.keyboard.press("Escape");
    await page.locator("#packPreview").waitFor({ state: "hidden" });
    await page.getByRole("button", { name: "Preview Flute Ceramic Pen Cup" }).click();
    assert.match(await page.locator("#previewPhoto").getAttribute("src"), /pen-cup\.webp$/);
    await waitForPage(page, () => document.querySelector("#packPreview").contains(document.activeElement));
    await page.keyboard.press("Escape");
    await page.locator("#packPreview").waitFor({ state: "hidden" });
    await page.getByRole("heading", { name: "Product catalog" }).click();
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "catalog");
      if (width < 992) {
        await page.locator(".mobile-filter").click();
        await page.locator("#filters.show").waitFor();
        await page.getByText("Lighting", { exact: true }).first().click();
        await page.getByRole("button", { name: "Show products" }).click();
        await waitForPage(
          page,
          () => document.querySelectorAll(".product-card").length === 5,
        );
        await page.locator(".mobile-filter").click();
        await page.locator("#reset").click();
        await page.getByRole("button", { name: "Show products" }).click();
        await waitForPage(
          page,
          () => document.querySelectorAll(".product-card").length > 1,
        );
      }
    }
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.evaluate(() => localStorage.removeItem("forma.appearance"));
    await page.reload();
    assert.equal(
      await page.locator("html").getAttribute("data-bs-theme"),
      "dark",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await waitForPage(
      page,
      () => document.documentElement.dataset.bsTheme === "light",
    );
    await setTheme(page, "dark");
    await page.reload();
    assert.equal(
      await page.locator("html").getAttribute("data-bs-theme"),
      "dark",
    );
    await page
      .locator("select[name=vendor]")
      .selectOption({ label: "Field Objects" });
    await waitForPage(
      page,
      () =>
        [...document.querySelectorAll(".supplier")]
          .filter((e) => e.closest(".product-card"))
          .every((e) => e.textContent === "Field Objects") &&
        document.querySelector(".product-card"),
    );
    await page.locator("input[name=min]").fill("4000");
    await page.locator("input[name=max]").fill("5000");
    await page.locator("select[name=rating]").selectOption("4.5");
    await page.locator("input[name=stock]").check();
    await page.locator("#sort").click();
    await page.getByRole("button", { name: "Price: low to high", exact: true }).click();
    await waitForPage(
      page,
      () =>
        document.querySelectorAll(".product-card").length === 1 &&
        document.querySelector(".product-title").textContent ===
          "Arc Task Lamp",
    );
    await page.locator("#reset").click();
    await page.getByRole("searchbox").fill("Keyboard");
    await waitForPage(
      page,
      () =>
        document.querySelectorAll(".product-card").length === 1 &&
        document.querySelector(".product-title")?.textContent ===
          "Studio Mechanical Keyboard",
    );
    await page.route("**/api/cart", async (route) => {
      if (route.request().method() === "POST")
        await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });
    await page
      .getByRole("button", {
        name: "Add one pack of Studio Mechanical Keyboard",
      })
      .dblclick();
    await waitForPage(
      page,
      () => document.querySelector("#cartCount").textContent === "2",
    );
    await page.locator("#notice .notice-close").click();
    await page.locator("#notice").waitFor({ state: "hidden" });
    await page.getByRole("searchbox").fill("Arc Task Lamp");
    const preview = page.getByRole("button", { name: "Preview Arc Task Lamp" });
    await preview.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    const detail = page.getByRole("button", { name: "Arc Task Lamp · Detail" });
    await detail.focus();
    await page.keyboard.press("Enter");
    assert.equal(await detail.getAttribute("aria-pressed"), "true");
    assert.match(await page.locator("#previewPhoto").getAttribute("src"), /lamp-detail\.webp$/);
    await page.keyboard.press("Escape");
    await page.locator("#packPreview").waitFor({ state: "hidden" });
    assert.equal(
      await preview.evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .getByRole("button", { name: "Arc Task Lamp", exact: true })
      .click();
    assert.match(await page.locator("#previewPhoto").getAttribute("src"), /lamp\.webp$/);
    await page.locator("#previewQty").fill("2");
    assert.equal(await page.locator("#previewUnits").innerText(), "4 units");
    assert.equal(await page.locator("#previewTotal").innerText(), "₱9,200");
    await page.locator("#previewMore").click();
    await page.locator("#previewLess").click();
    await page.route(
      "**/api/cart",
      (route) =>
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Stock changed. Review the pack count.",
          }),
        }),
      { times: 1 },
    );
    await page.locator("#previewAdd").click();
    await page.getByText("Stock changed. Review the pack count.").waitFor();
    assert.equal(await page.locator("#previewQty").inputValue(), "2");
    await page.locator("#previewAdd").click();
    await waitForPage(
      page,
      () => document.querySelector("#cartCount").textContent === "4",
    );
    assert.equal(
      await page.locator("#noticeText").innerText(),
      "Added 2 packs of Arc Task Lamp",
    );
    await page.getByRole("link", { name: "View cart" }).click();
    await page.locator(".cart-row").first().waitFor();
    await page
      .getByRole("button", { name: "Increase Studio Mechanical Keyboard" })
      .click();
    await waitForPage(
      page,
      () => document.getElementById("cartCount").textContent === "5",
    );
    await page
      .getByRole("button", { name: "Decrease Studio Mechanical Keyboard" })
      .click();
    await waitForPage(
      page,
      () => document.getElementById("cartCount").textContent === "4",
    );
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "cart");
    }
    await page
      .getByRole("button", { name: "Remove Studio Mechanical Keyboard" })
      .click();
    await waitForPage(
      page,
      () => document.getElementById("cartCount").textContent === "2",
    );
    await page.locator("a.back").click();
    const soldOut = page
      .locator(".product-card")
      .filter({ hasText: "Acceptance sample" });
    await soldOut.locator(".product-title").click();
    assert.ok(await page.locator("#previewAdd").isDisabled());
    await page.getByRole("button", { name: "Close pack preview" }).click();
    await page
      .getByRole("button", {
        name: "Add one pack of Studio Mechanical Keyboard",
      })
      .click();
    await waitForPage(
      page,
      () => document.getElementById("cartCount").textContent === "3",
    );
    await page.locator(".cart-link").click();
    await page.getByRole("link", { name: "Sign in to place order" }).click();
    await page.locator("summary").click();
    await page.locator("[data-demo=north]").click();
    await page.locator("input[name=password]").fill("incorrect-demo-password");
    await page.locator("#loginForm button").click();
    await page.getByText("The email or password is incorrect.").waitFor();
    assert.equal(
      await page.locator("input[name=email]").inputValue(),
      "north@forma.test",
    );
    await page.locator("[data-demo=north]").click();
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "login");
    }
    await page.locator("#loginForm button").click();
    await page.getByRole("button", { name: "Place purchase order" }).click();
    await page.locator(".success-note").waitFor();
    const order = new URL(page.url()).searchParams.get("placed");
    assert.ok(order);
    for (const account of ["form", "field"]) {
      await page.locator("#accountMenu").click();
      await page.locator("#logout").click();
      await page.waitForURL(base + "/login");
      await signIn(page, account);
      await page.getByText("View sales figures").click();
      await page.locator("#salesFigures div").first().waitFor();
      await page.getByText("View sales figures").click();
      for (const width of [375, 768, 1440]) {
        await page.setViewportSize({ width, height: 920 });
        await bothThemes(page, width, "dashboard");
      }
      await page
        .getByRole("button", { name: /Products at or below stock threshold/ })
        .click();
      assert.equal(
        await page.locator(".inv-item").count(),
        await page.locator(".inv-item .text-danger").count(),
      );
      await page.getByRole("button", { name: "Show all products" }).click();
      await page.getByRole("button", { name: "Overview", exact: true }).click();
      await page
        .getByRole("button", { name: /Open orders/ })
        .click();
      assert.equal(await page.locator("#ordersView .fulfilled").count(), 0);
      await page.getByRole("button", { name: "Show all orders" }).click();
      const orderFilters = page.locator("#vendorOrderFilters");
      await orderFilters.getByLabel("PO number").fill("PO-" + order);
      await orderFilters.getByLabel("Buyer").fill("north");
      await orderFilters.getByLabel("Status").selectOption("received");
      assert.equal(await page.locator("#ordersView .order-card").count(), 1);
      assert.equal(await page.locator("#ordersView .order-card h3").textContent(), "PO-" + order);
      await orderFilters.getByLabel("Buyer").fill("No buyer by this name");
      await page.getByText("No matching orders", { exact: true }).waitFor();
      await orderFilters.getByRole("button", { name: "Clear filters" }).click();
      assert.equal(await orderFilters.getByLabel("Buyer").inputValue(), "");
      await page.locator("[data-tab=inventory]").click();
      await page.getByRole("button", { name: "Add product" }).click();
      await page.getByRole("dialog").waitFor();
      await page
        .locator("#productForm input[name=name]")
        .fill("Demo organizer");
      await page.locator("#productForm input[name=price]").fill("450.50");
      await page.locator("#productForm input[type=file]").setInputFiles([
        path.resolve("static/img/organizer.webp"),
        path.resolve("static/img/organizer-detail.webp"),
      ]);
      await page.getByRole("button", { name: "Save product" }).click();
      await page
        .locator(".inv-item")
        .filter({ hasText: "Demo organizer" })
        .waitFor();
      await page.locator(".inv-item").filter({ hasText: "Demo organizer" }).locator("img")
        .evaluate((img) => img.decode());
      await page.getByRole("button", { name: "Edit Demo organizer" }).click();
      assert.equal(await page.locator("#currentProductPhotos img").count(), 2);
      assert.match(await page.locator("#currentProductPhotos img").first().getAttribute("src"), /^\/media\/products\/[a-f0-9]{32}$/);
      await page
        .locator("#productForm input[name=name]")
        .fill("Studio organizer");
      await page.evaluate(async () => {
        const rows = await (await fetch("/api/vendor/products")).json();
        const sample = rows.find((p) => p.name === "Demo organizer");
        const response = await fetch("/api/vendor/products", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": document.querySelector("meta[name=csrf-token]")
              .content,
          },
          body: JSON.stringify({ ...sample, stock: 5 }),
        });
        if (!response.ok)
          throw Error("Unable to prepare concurrent inventory edit");
      });
      await page.getByRole("button", { name: "Save product" }).click();
      await page
        .getByRole("button", { name: "Review and keep my edits" })
        .waitFor();
      assert.equal(
        await page.locator("#productForm input[name=name]").inputValue(),
        "Studio organizer",
      );
      await page
        .getByRole("button", { name: "Review and keep my edits" })
        .click();
      assert.equal(
        await page.locator("#productForm input[name=stock]").inputValue(),
        "5",
      );
      await page.getByRole("button", { name: "Save product" }).click();
      await page
        .getByRole("button", { name: "Edit Studio organizer" })
        .waitFor();
      await page.getByRole("button", { name: "Delete Studio organizer" }).click();
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.locator("#deleteProductModal").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "Delete Studio organizer" }).click();
      await page.getByRole("button", { name: "Delete product", exact: true }).click();
      await page.getByRole("button", { name: "Edit Studio organizer" }).waitFor({ state: "hidden" });
      await page.locator("#deleteProductModal").waitFor({ state: "hidden" });
      await page.locator("[data-tab=fulfillment]").click();
      const card = page.locator(".order-card").filter({
        has: page.getByRole("heading", { name: "PO-" + order, exact: true }),
      });
      await card.getByRole("button", { name: "Mark in transit" }).click();
      await card.getByRole("button", { name: "Mark complete" }).click();
      await card.locator(".status.fulfilled").waitFor();
      await page.locator("[data-tab=overview]").click();
      await downloadAndCompare(page, "day");
      await downloadAndCompare(page, "month");
      await waitForPage(
        page,
        () => document.querySelectorAll("#salesFigures>div").length === 6,
      );
    }
    await page.locator("#accountMenu").click();
    await page.locator("#logout").click();
    await page.waitForURL(base + "/login");
    await signIn(page, "north");
    await page.goto(base + "/orders");
    await page.reload();
    const completed = page.locator(".order-card").filter({
      has: page.getByRole("heading", { name: "PO-" + order, exact: true }),
    });
    await completed.locator(".fulfilled").first().waitFor();
    assert.equal(await completed.locator(".fulfilled").count(), 2);
    await completed.getByRole("link", { name: "Print PO-" + order }).click();
    await page.getByRole("heading", { name: "Purchase order PO-" + order }).waitFor();
    assert.equal(await page.locator(".print-lines").count(), 2);
    await page.emulateMedia({ media: "print" });
    assert.ok(await page.getByRole("button", { name: "Print purchase order" }).isHidden());
    await page.emulateMedia({ media: null });
    await page.getByRole("link", { name: "Back to purchases" }).click();
    await completed.waitFor();
    await page.getByRole("button", { name: "To Rate", exact: true }).click();
    await completed.locator(".fulfilled").first().waitFor();
    assert.equal(await completed.locator(".order-rating").count(), 2);
    assert.equal(await page.locator("#ordersView .status:not(.fulfilled)").count(), 0);
    const rating = completed.locator(".order-rating").first();
    const stars = rating.getByRole("radio", { name: "4 stars", exact: true });
    await stars.press("Space");
    const ratingResponse = page.waitForResponse(
      (response) => response.url() === base + "/api/orders/rating" && response.ok(),
    );
    await rating.getByRole("button", { name: "Update rating" }).click();
    assert.deepEqual(await (await ratingResponse).json(), { stars: 4 });
    await page.getByText("Rating saved.", { exact: true }).waitFor();
    assert.equal(await stars.isChecked(), true);
    await page.getByRole("button", { name: "History", exact: true }).click();
    assert.equal(await stars.isChecked(), true);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "history");
    }
    const repeatCard = page
      .locator(".order-card")
      .filter({
        has: page.getByRole("heading", { name: "PO-1001", exact: true }),
      });
    const buyAgain = repeatCard.getByRole("button", { name: /Buy Again/ });
    const review = page.locator("#reorderForm");
    const cartBefore = await page.evaluate(async () =>
      (await fetch("/api/cart")).json(),
    );
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      for (const theme of ["light", "dark"]) {
        await setTheme(page, theme);
        await buyAgain.focus();
        await page.keyboard.press("Enter");
        await review.locator(".repeat-line").first().waitFor();
        assert.equal(await review.locator(".repeat-vendor").count(), 2);
        assert.ok(
          await review
            .locator(".modal-body")
            .evaluate((el) => el.scrollWidth <= el.clientWidth),
        );
        await layout(page, width, "buy-again");
        await page.keyboard.press("Escape");
        await review.waitFor({ state: "hidden" });
        assert.ok(
          await buyAgain.evaluate((el) => el === document.activeElement),
        );
      }
    }
    assert.deepEqual(
      await page.evaluate(async () => (await fetch("/api/cart")).json()),
      cartBefore,
    );
    await buyAgain.click();
    await review.getByRole("spinbutton", { name: /Keyboard/ }).fill("1");
    const supplierPage = await browser.newPage();
    await signIn(supplierPage, "field");
    await supplierPage.evaluate(async () => {
      const products = await (await fetch("/api/vendor/products")).json();
      const lamp = products.find((p) => p.id === 2);
      const response = await fetch("/api/vendor/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')
            .content,
        },
        body: JSON.stringify({ ...lamp, stock: 2 }),
      });
      if (!response.ok) throw Error("Could not prepare stock change");
    });
    await supplierPage.close();
    await review
      .getByRole("button", { name: "Add selected packs to cart" })
      .click();
    await review.locator(".repeat-changed").waitFor();
    assert.equal(
      await review.getByRole("spinbutton", { name: /Lamp/ }).inputValue(),
      "2",
    );
    assert.equal(
      await review.getByRole("spinbutton", { name: /Keyboard/ }).inputValue(),
      "1",
    );
    assert.deepEqual(
      await page.evaluate(async () => (await fetch("/api/cart")).json()),
      cartBefore,
    );
    // Lose the response after the server accepted the batch, then retry in the modal.
    await page.route(
      "**/api/orders/1001/reorder",
      async (route) => {
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        await route.abort();
      },
      { times: 1 },
    );
    await review
      .getByRole("button", { name: "Add selected packs to cart" })
      .click();
    await review.getByRole("button", { name: "Retry confirmation" }).click();
    await page.waitForURL(base + "/cart");
    await page.locator(".cart-row").first().waitFor();
    assert.equal(await page.locator("#cartCount").innerText(), "3");
    await page.getByRole("button", { name: "Place purchase order" }).click();
    await page.locator(".success-note").waitFor();
    const repeated = new URL(page.url()).searchParams.get("placed");
    assert.ok(repeated && repeated !== "1001");
    assert.equal(await repeatCard.locator(".fulfilled").count(), 2);
    for (const vendor of ["form", "field"]) {
      await page.locator("#accountMenu").click();
      await page.locator("#logout").click();
      await page.waitForURL(base + "/login");
      await signIn(page, vendor);
      await page.locator("[data-tab=fulfillment]").click();
      const portion = page
        .locator(".order-card")
        .filter({
          has: page.getByRole("heading", {
            name: "PO-" + repeated,
            exact: true,
          }),
        });
      await portion.waitFor();
      assert.equal(await portion.locator(".order-row").count(), 1);
      assert.equal(
        await portion
          .locator(".status")
          .innerText()
          .then((t) => t.toLowerCase()),
        "order placed",
      );
      assert.equal(
        await page.getByRole("button", { name: /Buy Again/ }).count(),
        0,
      );
    }
    console.log(
      "PASS browser Buy Again, cancellation and focus, both themes at three widths, stock conflict, interrupted confirmation and two-vendor checkout",
    );
    await verifyAccountsAndNotifications(page);
    assert.deepEqual(remote, []);
    assert.deepEqual(errors, []);
    console.log(
      "PASS local-only browser walkthrough, queued cart clicks, pack preview, recovery, stale inventory edits, fulfillment, CSV/chart agreement, keyboard focus and both themes at 375/768/1440px.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
