"use strict";

const reorderModal = $("#reorderModal");
const reorderForm = $("#reorderForm");
const reorderFeedback = $("#reorderFeedback");
let reorderReview,
  reorderTrigger,
  reorderRequest,
  reorderSubmitting = false;
let retrySelection = null;

async function openReorder(orderId, trigger) {
  reorderTrigger = trigger;
  reorderReview = null;
  retrySelection = null;
  reorderRequest = new AbortController();
  $("#reorderTitle").textContent = "Buy Again · PO-" + orderId;
  $("#reorderLines").textContent = "Checking current prices and stock…";
  $("#reorderTotal").textContent = "—";
  $("#confirmReorder").textContent = "Add selected packs to cart";
  $("#confirmReorder").disabled = true;
  reorderFeedback.replaceChildren();
  bootstrap.Modal.getOrCreateInstance(reorderModal).show();
  try {
    const review = await api(
      "orders/" + orderId + "/reorder",
      undefined,
      reorderRequest.signal,
    );
    showReorder(review);
  } catch (error) {
    if (error.name === "AbortError") return;
    $("#reorderLines").replaceChildren();
    reorderFeedback.textContent =
      error.message + " Close the review and try Buy Again.";
  }
}

reorderModal.addEventListener("hide.bs.modal", (event) => {
  if (reorderSubmitting) event.preventDefault();
  else reorderRequest?.abort();
});
reorderModal.addEventListener("hidden.bs.modal", () =>
  reorderTrigger?.focus({ preventScroll: true }),
);

function reorderLine(line) {
  const title = line.name || line.previous_name;
  const badges = [];
  if (line.price === null) {
    badges.push(element("span", { class: "badge-pill text-danger" }, "Unavailable"));
  } else {
    if (line.price !== line.previous_price)
      badges.push(element("span", { class: "badge-pill" }, "Price updated"));
    if (line.pack_size !== line.previous_pack)
      badges.push(element("span", { class: "badge-pill" }, "Pack size updated"));
    if (!line.stock)
      badges.push(element("span", { class: "badge-pill text-danger" }, "Sold out"));
    else if (line.maximum < line.previous_quantity)
      badges.push(element("span", { class: "badge-pill" }, "Stock limited"));
    if (line.cart_quantity)
      badges.push(
        element("span", { class: "badge-pill role-badge-buyer" }, line.cart_quantity + " in cart"),
      );
  }
  const card = element(
    "article",
    { class: "repeat-line", "data-line": line.line_id },
    element(
      "div",
      { class: "repeat-line-head" },
      element("h4", {}, title),
      badges.length ? element("div", { class: "repeat-badges" }, ...badges) : null,
    ),
    element(
      "p",
      { class: "muted" },
      "Previously ordered " +
        packs(line.previous_quantity) +
        " · " +
        line.previous_pack +
        " units per pack",
    ),
  );
  const details = element("dl", { class: "repeat-facts" });
  for (const [label, value] of [
    ["Previous pack price", peso(line.previous_price)],
    [
      "Current pack price",
      line.price === null ? "Unavailable" : peso(line.price),
    ],
    [
      "Current pack size",
      line.pack_size === null ? "Unavailable" : line.pack_size + " units",
    ],
    ["Current stock", line.stock === null ? "Unavailable" : packs(line.stock)],
  ])
    details.append(
      element("div", {}, element("dt", {}, label), element("dd", {}, value)),
    );
  card.append(details);
  const messages = [];
  if (line.price === null)
    messages.push("Unavailable from the original supplier.");
  else {
    if (line.price !== line.previous_price)
      messages.push("Pack price changed since purchase.");
    if (line.pack_size !== line.previous_pack)
      messages.push("Pack size changed since purchase.");
    if (!line.stock) messages.push("Sold out.");
    else if (line.maximum < line.previous_quantity)
      messages.push(
        "You can add " +
          packs(line.maximum) +
          ". " +
          (line.stock > 9999
            ? "Cart limit: 9,999 packs per item."
            : packs(line.stock) + " in stock.") +
          (line.cart_quantity
            ? " Already in cart: " + packs(line.cart_quantity) + "."
            : ""),
      );
  }
  if (line.changes.length) {
    const fields = {
      stock: "stock",
      maximum: "available quantity",
      price: "price",
      pack_size: "pack size",
      cart_quantity: "cart quantity",
      cart_price: "cart price",
      cart_pack: "cart pack size",
    };
    messages.unshift(
      "Review updated " +
        [...new Set(line.changes.map((field) => fields[field]))].join(", ") +
        ".",
    );
    card.classList.add("repeat-changed");
  }
  if (messages.length)
    card.append(element("p", { class: "repeat-warning" }, messages.join(" ")));
  const input = element("input", {
    id: "repeat-qty-" + line.line_id,
    class: "form-control",
    type: "number",
    min: 0,
    max: line.maximum,
    value: line.suggested,
    step: 1,
    required: true,
    disabled: !line.maximum,
    "aria-label": "Packs to add for " + title,
  });
  card.append(
    element(
      "div",
      { class: "repeat-choice" },
      element("label", { for: input.id }, "Packs to add"),
      input,
      element("span", { class: "repeat-line-total" }),
    ),
  );
  card.append(element("p", { class: "repeat-combined muted" }));
  return card;
}

function showReorder(review) {
  reorderReview = review;
  retrySelection = null;
  const sections = group(review.lines, "vendor_id").map((lines) =>
    element(
      "section",
      { class: "repeat-vendor" },
      element("h3", {}, lines[0].vendor),
      ...lines.map(reorderLine),
      element(
        "div",
        { class: "repeat-subtotal" },
        "Supplier subtotal",
        element("strong", { "data-subtotal": lines[0].vendor_id }),
      ),
    ),
  );
  $("#reorderLines").replaceChildren(...sections);
  updateReorderTotals();
}

function updateReorderTotals() {
  let total = 0,
    selected = 0,
    valid = true;
  const subtotals = new Map();
  for (const line of reorderReview.lines) {
    const card = reorderForm.querySelector(
      '[data-line="' + line.line_id + '"]',
    );
    const input = card.querySelector("input");
    const quantity = input.validity.valid ? Number(input.value) : 0;
    valid = valid && input.validity.valid;
    const cents = Math.round(Number(line.price) * 100) * quantity;
    total += cents;
    selected += quantity;
    subtotals.set(line.vendor_id, (subtotals.get(line.vendor_id) || 0) + cents);
    card.querySelector(".repeat-line-total").textContent = peso(cents / 100);
    const combined = line.cart_quantity + quantity;
    let summary = "";
    if (line.cart_quantity) {
      summary =
        packs(line.cart_quantity) +
        " already in cart · " +
        packs(combined) +
        " after adding.";
      if (
        quantity &&
        (line.cart_price !== line.price || line.cart_pack !== line.pack_size)
      ) {
        summary +=
          " Existing quote: " +
          peso(line.cart_price) +
          " for " +
          line.cart_pack +
          " units. All " +
          packs(combined) +
          " will use " +
          peso(line.price) +
          " for " +
          line.pack_size +
          " units per pack.";
      }
    }
    card.querySelector(".repeat-combined").textContent = summary;
  }
  for (const [vendor, cents] of subtotals)
    reorderForm.querySelector('[data-subtotal="' + vendor + '"]').textContent =
      peso(cents / 100);
  $("#reorderTotal").textContent = peso(total / 100);
  $("#confirmReorder").disabled = !valid || !selected;
}

reorderForm.addEventListener("input", updateReorderTotals);
reorderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (reorderSubmitting || !reorderReview || !reorderForm.reportValidity())
    return;
  const items = reorderReview.lines
    .map((line) => ({
      line_id: line.line_id,
      quantity: Number($("#repeat-qty-" + line.line_id).value),
    }))
    .filter((item) => item.quantity > 0);
  if (!items.length) return;
  const body = retrySelection || { token: reorderReview.token, items };
  reorderSubmitting = true;
  reorderFeedback.replaceChildren();
  const submit = $("#confirmReorder");
  const restore = busy(submit, "Adding packs…");
  const inputs = [...reorderForm.querySelectorAll("input:not(:disabled)")];
  inputs.forEach((input) => (input.disabled = true));
  let accepted = false;
  try {
    await api("orders/" + reorderReview.order_id + "/reorder", body);
    accepted = true;
    location.assign("/cart");
  } catch (error) {
    if (error.review) showReorder(error.review);
    else if (!error.status) retrySelection = body;
    reorderFeedback.textContent = error.message;
    if (retrySelection)
      reorderFeedback.append(
        " Retry the same selection or ",
        element("a", { href: "/cart" }, "view your cart"),
        ".",
      );
    reorderFeedback.focus();
  } finally {
    if (!accepted) {
      reorderSubmitting = false;
      restore();
      if (retrySelection) submit.textContent = "Retry confirmation";
      else {
        inputs.forEach((input) => (input.disabled = false));
        updateReorderTotals();
      }
    }
  }
});
