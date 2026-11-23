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
  await page.screenshot({ path: path.join(out, label + "-" + width + ".png") });
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
  const page = await context.newPage();
  try {
    await page.goto(base + "/");
    await page.locator(".product-card").first().waitFor();
    const images = await page
      .locator(".product-photo img")
      .evaluateAll((imgs) =>
        imgs.every((img) => img.complete && img.naturalWidth > 0),
      );
    assert.ok(images, "Catalog photographs loaded");
    await page.keyboard.press("Tab");
    assert.equal(await page.locator(":focus").innerText(), "Skip to content");
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await layout(page, width, "catalog");
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
    await page.getByRole("searchbox").fill("Keyboard");
    await page.waitForFunction(
      () => document.querySelectorAll(".product-card").length === 1,
    );
    await page.locator(".add").click();
    await page.waitForFunction(
      () => document.querySelector("#cartCount").textContent === "1",
    );
    await page.getByRole("searchbox").fill("Arc Task Lamp");
    await page
      .getByRole("button", { name: "Add one pack of Arc Task Lamp" })
      .click();
    await page.waitForFunction(
      () => document.querySelector("#cartCount").textContent === "2",
    );
    await page.locator(".cart-link").click();
    await page.locator(".cart-row").first().waitFor();
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 920 });
      await layout(page, width, "cart");
    }
    await page.getByRole("link", { name: "Sign in to place order" }).click();
    await page.locator("summary").click();
    await page.locator("[data-demo=north]").click();
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
        await layout(page, width, "dashboard");
      }
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
      await page.locator("[data-tab=fulfillment]").click();
      const card = page
        .locator(".order-card")
        .filter({
          has: page.getByRole("heading", { name: "PO-" + order, exact: true }),
        });
      await card.getByRole("button", { name: "Start processing" }).click();
      await card.getByRole("button", { name: "Mark fulfilled" }).click();
      await card.locator(".status.fulfilled").waitFor();
      await page.locator("[data-tab=overview]").click();
      await page.locator("#period").selectOption("month");
      await page.waitForFunction(
        () => document.querySelectorAll("#salesFigures>div").length === 6,
      );
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS browser checkout, supplier fulfillment, product creation, charts, mobile filter, keyboard skip link and viewport checks at 375/768/1440px.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
