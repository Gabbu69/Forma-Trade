"use strict";
const $ = (selector) => document.querySelector(selector);
const page = document.body.dataset.page;
const role = document.body.dataset.role;
const peso = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: Number(value) % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value);
const icons = () => window.lucide?.createIcons();
const icon = (name) =>
  element("i", { "data-lucide": name, "aria-hidden": "true" });
function element(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === "click") node.addEventListener("click", value);
    else if (key === "class") node.className = value;
    else node.setAttribute(key, value === true ? "" : String(value));
  }
  node.append(...children.filter((x) => x != null));
  return node;
}
function button(label, action, style = "secondary", attrs = {}) {
  return element(
    "button",
    { type: "button", class: style, click: action, ...attrs },
    label,
  );
}
function note(message) {
  $("#noticeText").textContent = message;
  bootstrap.Toast.getOrCreateInstance($("#notice"), { delay: 4200 }).show();
}
async function api(path, body, signal) {
  const options = { signal, headers: { Accept: "application/json" } };
  if (body !== undefined)
    Object.assign(options, {
      method: "POST",
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "X-CSRF-Token": $("meta[name=csrf-token]").content,
      },
      body: JSON.stringify(body),
    });
  const response = await fetch("/api/" + path, options);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Please try again.");
    error.status = response.status;
    throw error;
  }
  return data;
}
function empty(title, description, link) {
  const box = element(
    "div",
    { class: "empty" },
    element("h3", {}, title),
    element("p", {}, description),
  );
  if (link)
    box.append(
      element("a", { class: "primary", href: "/" }, "Browse products"),
    );
  return box;
}
function group(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row[key])) groups.set(row[key], []);
    groups.get(row[key]).push(row);
  }
  return [...groups.values()];
}
function photo(item, cls = "thumb") {
  return element("img", {
    src: "/static/img/" + encodeURIComponent(item.image) + ".webp",
    alt: item.name,
    class: cls,
    loading: "lazy",
  });
}
function lineTotal(item) {
  return (
    Math.round(Number(item.unit_price ?? item.price) * 100) *
    Number(item.quantity)
  );
}
function sum(items) {
  return items.reduce((total, item) => total + lineTotal(item), 0) / 100;
}
function packs(n) {
  return n + " " + (Number(n) === 1 ? "pack" : "packs");
}
let cart = { items: [] },
  writingCart = false;
function remember(data) {
  cart = data;
  if ($("#cartCount"))
    $("#cartCount").textContent = data.items.reduce(
      (n, p) => n + Number(p.quantity),
      0,
    );
}
async function changeCart(id, quantity) {
  if (writingCart) return;
  writingCart = true;
  try {
    remember(await api("cart", { id, quantity }));
    if (page === "cart") renderCart();
    else note("Added to your purchase cart.");
  } catch (e) {
    note(e.message);
  } finally {
    writingCart = false;
  }
}
function productCard(item) {
  const added = () => {
    const current = cart.items.find((i) => i.id === item.id);
    return changeCart(item.id, (current?.quantity || 0) + 1);
  };
  const available = Number(item.stock) > 0;
  const add = button(icon("plus"), added, "add", {
    title: "Add a pack to cart",
    "aria-label": "Add one pack of " + item.name,
    disabled: !available,
  });
  return element(
    "article",
    { class: "product-card" },
    element(
      "div",
      { class: "product-photo" },
      photo(item, ""),
      element(
        "span",
        {
          class: "stock-tag" + (available ? "" : " out"),
          title: packs(item.stock) + " available",
        },
        available ? "In stock" : "Sold out",
      ),
    ),
    element(
      "div",
      { class: "product-info" },
      element(
        "div",
        { class: "status-line" },
        element("span", { class: "supplier" }, item.vendor),
        element(
          "span",
          {
            class: "stars",
            "aria-label": item.rating
              ? item.rating + " out of 5 stars"
              : "Unrated",
          },
          icon("star"),
          item.rating ?? "New",
        ),
      ),
      element("h3", {}, item.name),
      element(
        "div",
        { class: "pack-meta" },
        icon("package"),
        "Pack of " + item.pack_size,
      ),
      element(
        "div",
        { class: "price-line" },
        element(
          "div",
          {},
          element("span", { class: "price" }, peso(item.price)),
          element("span", { class: "per" }, "/ pack"),
        ),
        add,
      ),
    ),
  );
}
async function catalogPage() {
  const form = $("#filterForm"),
    list = $("#products");
  let pending, timer;
  async function filter() {
    pending?.abort();
    pending = new AbortController();
    if (!form.reportValidity()) return;
    const params = new URLSearchParams(new FormData(form));
    if (
      params.get("min") &&
      params.get("max") &&
      Number(params.get("min")) > Number(params.get("max"))
    ) {
      $("#resultCount").textContent =
        "Minimum price must be at or below maximum price.";
      list.replaceChildren();
      return;
    }
    params.set("q", $("#search").value.trim());
    params.set("sort", $("#sort").value);
    try {
      const items = await api("catalog?" + params, undefined, pending.signal);
      list.replaceChildren(...items.map(productCard));
      if (!items.length)
        list.append(
          empty(
            "No matching products",
            "Change a filter or reset your search.",
          ),
        );
      $("#resultCount").textContent =
        items.length +
        " " +
        (items.length === 1 ? "product" : "products") +
        " · " +
        new Set(items.map((item) => item.vendor_id)).size +
        " suppliers";
      icons();
    } catch (e) {
      if (e.name !== "AbortError") {
        list.replaceChildren(empty("Catalog unavailable", e.message));
        $("#resultCount").textContent = "Unable to load products";
      }
    }
  }
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(filter, 140);
  };
  form.addEventListener("input", schedule);
  $("#search").addEventListener("input", schedule);
  $("#sort").addEventListener("change", filter);
  form.addEventListener("submit", (event) => event.preventDefault());
  $("#reset").addEventListener("click", () => {
    form.reset();
    $("#search").value = "";
    $("#sort").value = "";
    filter();
  });
  remember(await api("cart"));
  await filter();
}
function renderCart(message = "") {
  const view = $("#cartView");
  if (!cart.items.length) {
    view.replaceChildren(
      empty(
        "Your cart is empty",
        "Add a pack from the marketplace to start a purchase order.",
        true,
      ),
    );
    return;
  }
  const list = element("div");
  const summary = element(
    "aside",
    { class: "summary-card" },
    element("h2", {}, "Order summary"),
  );
  for (const items of group(cart.items, "vendor_id")) {
    const box = element(
      "section",
      { class: "order-card" },
      element("h3", {}, items[0].vendor),
    );
    for (const p of items) {
      const step = (qty, label, sign) =>
        button(
          sign,
          async () => {
            await changeCart(p.id, qty);
            document.getElementById("qty-" + p.id + "-" + sign)?.focus();
          },
          "",
          {
            "aria-label": label + " " + p.name,
            id: "qty-" + p.id + "-" + sign,
          },
        );
      box.append(
        element(
          "div",
          { class: "cart-row" },
          photo(p),
          element(
            "div",
            { class: "line-info" },
            element("strong", {}, p.name),
            element(
              "small",
              { class: "muted" },
              "Pack of " + p.quoted_pack + " · " + peso(p.price) + " / pack",
            ),
          ),
          element(
            "div",
            { class: "quantity" },
            step(p.quantity - 1, "Decrease", "−"),
            element("span", {}, String(p.quantity)),
            step(p.quantity + 1, "Increase", "+"),
          ),
          element("strong", {}, peso(lineTotal(p) / 100)),
          button(icon("trash-2"), () => changeCart(p.id, 0), "icon-btn", {
            "aria-label": "Remove " + p.name,
          }),
        ),
      );
    }
    list.append(box);
    summary.append(
      element(
        "div",
        { class: "status-line mt-3" },
        items[0].vendor,
        element("strong", {}, peso(sum(items))),
      ),
    );
  }
  summary.append(
    element("hr"),
    element("div", { class: "muted" }, "Purchase order total"),
    element("div", { class: "summary-total" }, peso(sum(cart.items))),
  );
  if (message)
    summary.append(
      element("p", { class: "alert-note", role: "alert" }, message),
    );
  if (role === "guest")
    summary.append(
      element(
        "a",
        { class: "primary", href: "/login?next=/cart" },
        "Sign in to place order",
      ),
    );
  else
    summary.append(
      button(
        "Place purchase order",
        async (event) => {
          const btn = event.currentTarget;
          btn.disabled = true;
          try {
            const result = await api("checkout", { key: cart.key });
            location.assign("/orders?placed=" + result.order_id);
          } catch (e) {
            try {
              remember(await api("cart"));
              renderCart(e.message);
            } catch (refreshError) {
              note(refreshError.message);
            }
          } finally {
            btn.disabled = false;
          }
        },
        "primary w-100",
      ),
    );
  view.replaceChildren(element("div", { class: "cart-layout" }, list, summary));
  icons();
}
let vendorProducts = [],
  vendorOrders = [],
  chart = null,
  editProduct = null;
function renderOrders(rows, vendor = false) {
  const host = $("#ordersView");
  host.replaceChildren();
  if (!rows.length) {
    host.append(
      empty(
        "No purchase orders yet",
        vendor
          ? "New orders will appear here."
          : "Placed orders and their fulfillment status will appear here.",
        !vendor,
      ),
    );
    return;
  }
  for (const order of group(rows, "order_id")) {
    const first = order[0],
      number = "PO-" + first.order_id;
    const box = element(
      "article",
      { class: "order-card" },
      element(
        "div",
        { class: "panel-title" },
        element("h3", {}, number),
        element("span", { class: "muted" }, first.created_at.slice(0, 10)),
      ),
    );
    for (const lines of group(order, "group_id")) {
      const row = lines[0],
        header = element(
          "div",
          { class: "status-line mt-3" },
          element("strong", {}, vendor ? row.buyer : row.vendor),
          element("span", { class: "status " + row.status }, row.status),
        );
      box.append(header);
      for (const l of lines)
        box.append(
          element(
            "div",
            { class: "order-row" },
            element(
              "div",
              { class: "line-info" },
              l.title,
              element(
                "div",
                { class: "muted" },
                packs(l.quantity) + " · " + l.pack_size + " units per pack",
              ),
            ),
            element("strong", {}, peso(lineTotal(l) / 100)),
          ),
        );
      if (vendor && row.status !== "fulfilled") {
        const status = row.status === "received" ? "processing" : "fulfilled";
        box.append(
          button(
            status === "processing" ? "Start processing" : "Mark fulfilled",
            async (event) => {
              event.currentTarget.disabled = true;
              try {
                await api("vendor/orders", { id: row.group_id, status });
                await loadVendor();
                note("Fulfillment status updated.");
              } catch (e) {
                note(e.message);
                await loadVendor();
              }
            },
            "secondary mt-3",
          ),
        );
      }
    }
    box.append(
      element("div", { class: "order-total" }, "Total " + peso(sum(order))),
    );
    host.append(box);
  }
}
function setTab(name) {
  for (const tab of document.querySelectorAll("[data-tab]")) {
    const active = tab.dataset.tab === name;
    tab.setAttribute("aria-pressed", String(active));
    document.getElementById(tab.dataset.tab).hidden = !active;
  }
  if (name === "overview") chart?.resize();
}
function openProduct(p = null) {
  editProduct = p;
  const form = $("#productForm");
  form.reset();
  form.querySelector(".form-error").textContent = "";
  $("#productModalTitle").textContent = p ? "Edit product" : "Add product";
  for (const [key, value] of Object.entries(
    p ?? { pack_size: 1, stock: 0, low_threshold: 3 },
  ))
    if (form.elements.namedItem(key))
      form.elements.namedItem(key).value = value;
  bootstrap.Modal.getOrCreateInstance($("#productModal")).show();
}
async function loadSales() {
  const period = $("#period").value;
  const data = await api("vendor/sales?period=" + period);
  if ($("#period").value !== period) return;
  $("#salesFigures").replaceChildren(
    ...data.map((d) =>
      element("div", { class: "status-line" }, d.label, peso(d.amount)),
    ),
  );
  chart?.destroy();
  chart = new Chart($("#chart"), {
    type: "bar",
    data: {
      labels: data.map((x) => x.label),
      datasets: [
        {
          label: "Fulfilled sales",
          data: data.map((x) => x.amount),
          backgroundColor: "#4774e7",
          borderRadius: 5,
          maxBarThickness: 52,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => peso(ctx.parsed.y) } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => peso(v) } },
        x: { grid: { display: false } },
      },
    },
  });
}
async function loadVendor() {
  [vendorProducts, vendorOrders] = await Promise.all([
    api("vendor/products"),
    api("vendor/orders"),
  ]);
  const pending = group(
    vendorOrders.filter((r) => r.status !== "fulfilled"),
    "group_id",
  ).length;
  const low = vendorProducts.filter(
    (p) => Number(p.stock) <= Number(p.low_threshold),
  ).length;
  const metric = (n, title, tab) =>
    button(
      element("span", {}, element("strong", {}, String(n)), title),
      () => setTab(tab),
      "panel metric-button",
    );
  $("#metrics").replaceChildren(
    metric(pending, "Orders awaiting fulfillment", "fulfillment"),
    metric(low, "Products at or below stock threshold", "inventory"),
  );
  $("#inventoryView").replaceChildren(
    ...vendorProducts.map((p) =>
      element(
        "article",
        { class: "inv-item" },
        photo(p),
        element(
          "div",
          { class: "line-info" },
          element("strong", {}, p.name),
          element(
            "div",
            { class: "muted" },
            peso(p.price) + " · Pack of " + p.pack_size,
          ),
        ),
        element(
          "span",
          { class: "inventory-stock" },
          packs(p.stock),
          Number(p.stock) <= Number(p.low_threshold)
            ? element("small", { class: "d-block text-danger" }, "Low stock")
            : null,
        ),
        button("Edit", () => openProduct(p), "secondary", {
          "aria-label": "Edit " + p.name,
        }),
      ),
    ),
  );
  renderOrders(vendorOrders, true);
  await loadSales();
  icons();
}
async function init() {
  icons();
  $("#logout")?.addEventListener("click", async () => {
    try {
      await api("logout", {});
      location.assign("/");
    } catch (e) {
      note(e.message);
    }
  });
  if (page === "catalog") await catalogPage();
  if (page === "cart") {
    remember(await api("cart"));
    renderCart();
  }
  if (page === "orders") {
    const rows = await api("orders");
    renderOrders(rows);
    const placed = new URLSearchParams(location.search).get("placed");
    if (placed && rows.some((r) => String(r.order_id) === placed))
      $("#confirmation").append(
        element(
          "div",
          { class: "success-note", role: "status" },
          "Purchase order PO-" + placed + " placed successfully.",
        ),
      );
  }
  if (page === "login") {
    const form = $("#loginForm");
    for (const opt of document.querySelectorAll("[data-demo]"))
      opt.onclick = () => {
        form.email.value = opt.dataset.demo + "@forma.test";
        form.password.value = "FormaDemo24!";
        form.querySelector("button").focus();
      };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button");
      btn.disabled = true;
      try {
        const user = await api("login", Object.fromEntries(new FormData(form)));
        const next = new URLSearchParams(location.search).get("next");
        location.assign(
          user.role === "vendor"
            ? "/vendor"
            : ["/orders", "/cart"].includes(next)
              ? next
              : "/",
        );
      } catch (err) {
        form.querySelector(".form-error").textContent = err.message;
        btn.disabled = false;
      }
    };
  }
  if (page === "vendor") {
    document
      .querySelectorAll("[data-tab]")
      .forEach((tab) => (tab.onclick = () => setTab(tab.dataset.tab)));
    $("#addProduct").onclick = () => openProduct();
    $("#period").onchange = () => loadSales().catch((e) => note(e.message));
    $("#productForm").onsubmit = async (e) => {
      e.preventDefault();
      const form = e.currentTarget,
        btn = form.querySelector("button");
      btn.disabled = true;
      const data = Object.fromEntries(new FormData(form));
      if (editProduct)
        Object.assign(data, {
          id: editProduct.id,
          version: editProduct.version,
        });
      try {
        await api("vendor/products", data);
        bootstrap.Modal.getInstance($("#productModal")).hide();
        await loadVendor();
        note("Product saved.");
      } catch (err) {
        form.querySelector(".form-error").textContent = err.message;
        if (err.status === 409) await loadVendor();
      } finally {
        btn.disabled = false;
      }
    };
    await loadVendor();
  }
}
init().catch((error) => note(error.message));
