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
async function signIn(page, account) {
  await page.goto(base + "/login");
  await page.locator("summary").click();
  await page.locator("[data-demo=" + account + "]").click();
  await page.locator("#loginForm button").click();
  await page.waitForURL(account === "north" ? base + "/" : base + "/vendor");
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
async function bothThemes(page, width, label) {
  for (const choice of ["dark", "light"]) {
    await page.locator("#appearance").selectOption(choice);
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
  await page.waitForFunction(
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
    await page.goto(base + "/");
    await page.locator(".product-card").first().waitFor();
    await page
      .locator(".product-photo img")
      .evaluateAll((imgs) => Promise.all(imgs.map((img) => img.decode())));
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.fonts.check("16px Inter")));
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").innerText(), "Skip to content");
    await page.getByRole("heading", { name: "Product catalog" }).click();
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "catalog");
      if (width < 992) {
        await page.locator(".mobile-filter").click();
        await page.locator("#filters.show").waitFor();
        await page.getByText("Lighting", { exact: true }).first().click();
        await page.getByRole("button", { name: "Show products" }).click();
        await page.waitForFunction(
          () => document.querySelectorAll(".product-card").length === 1,
        );
        await page.locator(".mobile-filter").click();
        await page.locator("#reset").click();
        await page.getByRole("button", { name: "Show products" }).click();
        await page.waitForFunction(
          () => document.querySelectorAll(".product-card").length > 1,
        );
      }
    }
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.locator("#appearance").selectOption("system");
    assert.equal(
      await page.locator("html").getAttribute("data-bs-theme"),
      "dark",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForFunction(
      () => document.documentElement.dataset.bsTheme === "light",
    );
    await page.locator("#appearance").selectOption("dark");
    await page.reload();
    assert.equal(
      await page.locator("html").getAttribute("data-bs-theme"),
      "dark",
    );
    await page
      .locator("select[name=vendor]")
      .selectOption({ label: "Field Objects" });
    await page.waitForFunction(
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
    await page.locator("#sort").selectOption("price");
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".product-card").length === 1 &&
        document.querySelector(".product-title").textContent ===
          "Arc Task Lamp",
    );
    await page.locator("#reset").click();
    await page.getByRole("searchbox").fill("Keyboard");
    await page.waitForFunction(
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
    await page.waitForFunction(
      () => document.querySelector("#cartCount").textContent === "2",
    );
    await page.locator("#notice .notice-close").click();
    await page.locator("#notice").waitFor({ state: "hidden" });
    await page.getByRole("searchbox").fill("Arc Task Lamp");
    const preview = page.getByRole("button", { name: "Preview Arc Task Lamp" });
    await preview.focus();
    await page.keyboard.press("Enter");
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.locator("#packPreview").waitFor({ state: "hidden" });
    assert.equal(
      await preview.evaluate((el) => el === document.activeElement),
      true,
    );
    await page
      .getByRole("button", { name: "Arc Task Lamp", exact: true })
      .click();
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
    await page.waitForFunction(
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
    await page.waitForFunction(
      () => document.getElementById("cartCount").textContent === "5",
    );
    await page
      .getByRole("button", { name: "Decrease Studio Mechanical Keyboard" })
      .click();
    await page.waitForFunction(
      () => document.getElementById("cartCount").textContent === "4",
    );
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "cart");
    }
    await page
      .getByRole("button", { name: "Remove Studio Mechanical Keyboard" })
      .click();
    await page.waitForFunction(
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
    await page.waitForFunction(
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
      await page.locator("#logout").click();
      await page.waitForURL(base + "/");
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
        .getByRole("button", { name: /Orders awaiting fulfillment/ })
        .click();
      assert.equal(await page.locator("#ordersView .fulfilled").count(), 0);
      await page.getByRole("button", { name: "Show all orders" }).click();
      await page.locator("[data-tab=inventory]").click();
      await page.getByRole("button", { name: "Add product" }).click();
      await page.getByRole("dialog").waitFor();
      await page
        .locator("#productForm input[name=name]")
        .fill("Demo organizer");
      await page.locator("#productForm input[name=price]").fill("450.50");
      await page.getByRole("button", { name: "Save product" }).click();
      await page
        .locator(".inv-item")
        .filter({ hasText: "Demo organizer" })
        .waitFor();
      await page.getByRole("button", { name: "Edit Demo organizer" }).click();
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
      await page.locator("[data-tab=fulfillment]").click();
      const card = page.locator(".order-card").filter({
        has: page.getByRole("heading", { name: "PO-" + order, exact: true }),
      });
      await card.getByRole("button", { name: "Start processing" }).click();
      await card.getByRole("button", { name: "Mark fulfilled" }).click();
      await card.locator(".status.fulfilled").waitFor();
      await page.locator("[data-tab=overview]").click();
      await downloadAndCompare(page, "day");
      await downloadAndCompare(page, "month");
      await page.waitForFunction(
        () => document.querySelectorAll("#salesFigures>div").length === 6,
      );
    }
    await page.locator("#logout").click();
    await page.waitForURL(base + "/");
    await signIn(page, "north");
    await page.goto(base + "/orders");
    await page.reload();
    const completed = page.locator(".order-card").filter({
      has: page.getByRole("heading", { name: "PO-" + order, exact: true }),
    });
    await completed.locator(".fulfilled").first().waitFor();
    assert.equal(await completed.locator(".fulfilled").count(), 2);
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await bothThemes(page, width, "history");
    }
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
