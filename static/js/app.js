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
  node.append(...children.flat().filter((x) => x != null));
  return node;
}

function button(label, action, style = "secondary", attrs = {}) {
  return element(
    "button",
    { type: "button", class: style, click: action, ...attrs },
    label,
  );
}

function note(message, kind = "info") {
  const toast = $("#notice");
  toast.dataset.kind = kind;
  toast
    .querySelector(".notice-symbol")
    .replaceChildren(icon(kind === "error" ? "circle-alert" : "check"));
  $("#noticeText").textContent = message;
  $("#noticeCart").hidden = kind !== "cart";
  icons();
  bootstrap.Toast.getOrCreateInstance(toast, { delay: 5500 }).show();
}

function busy(control, label) {
  const original = [...control.childNodes];
  control.disabled = true;
  control.setAttribute("aria-busy", "true");
  control.replaceChildren(
    element("span", { class: "busy-dot", "aria-hidden": "true" }),
    label,
  );
  return () => {
    control.replaceChildren(...original);
    control.disabled = false;
    control.removeAttribute("aria-busy");
  };
}

async function api(path, body, signal, method = "POST") {
  const options = { signal, headers: { Accept: "application/json" } };
  if (body !== undefined)
    Object.assign(options, {
      method,
      headers: {
        ...options.headers,
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        "X-CSRF-Token": $("meta[name=csrf-token]").content,
      },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  let response;
  try {
    response = await fetch("/api/" + path, options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Connection interrupted. Check the local server, then try again.",
    );
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Please try again.");
    error.status = response.status;
    error.review = data.review;
    throw error;
  }
  return data;
}

function empty(title, description, link, retryAction) {
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
  if (retryAction)
    box.append(button("Try again", retryAction, "secondary"));
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

function photoUrl(key) {
  return /^[0-9a-f]{32}$/.test(key)
    ? "/media/products/" + key
    : "/static/img/" + encodeURIComponent(key) + ".webp";
}

function photo(item, cls = "thumb") {
  return element("img", {
    src: photoUrl(item.image),
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

function units(n) {
  return n + " " + (Number(n) === 1 ? "unit" : "units");
}

function unitCostCents(price, packSize) {
  const cents = Math.round(Number(price) * 100);
  const size = Math.max(1, Number(packSize) || 1);
  return Math.round(cents / size);
}

function formatDate(iso) {
  if (!iso) return "";
  const date = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function utf8Bytes(str) {
  return new TextEncoder().encode(str).length;
}

/* Shared Dual-Layer Client-Side Form Validation & Password UX */
function setFieldError(field, message, showValid = false) {
  if (!field) return true;
  field.setCustomValidity(message || "");
  field.classList.toggle("is-invalid", Boolean(message));
  field.classList.toggle("is-valid", Boolean(showValid && !message && field.value !== ""));
  const groupNode = field.closest(".field-group");
  const feedback = groupNode?.querySelector(".invalid-feedback");
  if (feedback) feedback.textContent = message || "";
  return !message;
}

function clearFormValidation(form) {
  for (const field of form.querySelectorAll("input, select")) {
    field.setCustomValidity("");
    field.classList.remove("is-invalid", "is-valid");
  }
  for (const feedback of form.querySelectorAll(".invalid-feedback")) {
    feedback.textContent = "";
  }
  const error = form.querySelector(".form-error");
  if (error) error.textContent = "";
}

function updatePasswordRules(input) {
  const rule = document.querySelector('[data-password-rule="length"][data-target="' + input.id + '"]');
  if (!rule) return;
  const val = input.value;
  if (!val) {
    delete rule.dataset.met;
    rule.querySelector("svg, i")?.replaceWith(icon("circle"));
    icons();
    return;
  }
  const met = [...val].length >= 12 && utf8Bytes(val) <= 72;
  rule.dataset.met = String(met);
  rule.querySelector("svg, i")?.replaceWith(icon(met ? "check-circle-2" : "circle-alert"));
  icons();
}

function initPasswordToggles() {
  for (const toggle of document.querySelectorAll("[data-toggle-password]")) {
    const input = document.getElementById(toggle.dataset.togglePassword);
    if (!input) continue;
    const flip = () => {
      const reveal = input.type === "password";
      input.type = reveal ? "text" : "password";
      toggle.setAttribute("aria-pressed", String(reveal));
      toggle.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      toggle.replaceChildren(icon(reveal ? "eye-off" : "eye"));
      icons();
    };
    toggle.addEventListener("click", flip);
    toggle.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        flip();
      }
    });
  }
}

function validateAuthPassword(field, { checkBytes = false } = {}) {
  const val = field.value;
  if (!val) return "Enter a password.";
  if (checkBytes) {
    if ([...val].length < 12) return "Use at least 12 characters.";
    if (utf8Bytes(val) > 72) return "Keep the password at 72 bytes or fewer.";
  }
  return "";
}

function bindLiveValidation(form, fieldValidators) {
  form.noValidate = true;
  const touched = new WeakSet();
  const runField = (field, showValid = false) => {
    const fn = fieldValidators[field.name];
    const message = fn ? fn(field, form) : field.validationMessage;
    return setFieldError(field, message, showValid);
  };
  for (const field of form.querySelectorAll("input, select")) {
    field.addEventListener("blur", () => {
      touched.add(field);
      runField(field, true);
    });
    field.addEventListener("input", () => {
      if (field.name === "new_password") updatePasswordRules(field);
      if (touched.has(field) || field.classList.contains("is-invalid")) {
        runField(field, true);
      }
      if (field.name === "new_password" && form.elements.confirm_password?.value) {
        runField(form.elements.confirm_password, true);
      }
    });
  }
  return () => {
    let firstInvalid = null;
    for (const field of form.querySelectorAll("input, select")) {
      if (field.disabled || field.type === "hidden" || field.type === "radio") continue;
      touched.add(field);
      const ok = runField(field, true);
      if (!ok && !firstInvalid) firstInvalid = field;
    }
    firstInvalid?.focus();
    return !firstInvalid;
  };
}

/* Cart State */
let cart = { items: [] };
let cartWrites = Promise.resolve();
let pendingCartEdits = 0;
let catalogItems = [];

function cartQtyFor(productId) {
  return Number(cart.items.find((p) => p.id === productId)?.quantity || 0);
}

function remember(data) {
  cart = data;
  if ($("#cartCount"))
    $("#cartCount").textContent = data.items.reduce(
      (n, p) => n + Number(p.quantity),
      0,
    );
  if (page === "catalog" && catalogItems.length) syncCatalogCartState();
}

function queueCart(payload) {
  const write = cartWrites.then(async () =>
    remember(await api("cart", payload)),
  );
  cartWrites = write.catch(() => {});
  return write;
}

async function changeCart(payload, focusId) {
  const view = $("#cartView");
  pendingCartEdits++;
  view.setAttribute("aria-busy", "true");
  if ($(".checkout")) $(".checkout").disabled = true;
  try {
    await queueCart(payload);
    renderCart();
    (document.getElementById(focusId) || view.querySelector("button,a"))?.focus(
      { preventScroll: true },
    );
  } catch (e) {
    note(e.message, "error");
  } finally {
    pendingCartEdits--;
    if (!pendingCartEdits) view.removeAttribute("aria-busy");
    if ($(".checkout")) $(".checkout").disabled = Boolean(pendingCartEdits);
  }
}

async function addPacks(item, quantity) {
  await queueCart({ id: item.id, delta: quantity });
  note("Added " + packs(quantity) + " of " + item.name, "cart");
}

/* Product Cards & Pack Preview */
function syncCatalogCartState() {
  for (const card of document.querySelectorAll(".product-card[data-product-id]")) {
    const id = Number(card.dataset.productId);
    const item = catalogItems.find((p) => p.id === id);
    if (!item) continue;
    const inCart = cartQtyFor(id);
    const maxCart = Math.min(9999, Number(item.stock));
    const badge = card.querySelector(".in-cart-badge");
    if (badge) {
      badge.hidden = inCart === 0;
      badge.textContent = inCart + " in cart";
    }
    const addBtn = card.querySelector(".add");
    if (addBtn) {
      const maxed = Number(item.stock) === 0 || inCart >= maxCart;
      addBtn.disabled = maxed;
      addBtn.title = !Number(item.stock)
        ? "Sold out"
        : inCart >= maxCart
          ? "All available packs in cart"
          : "Add a pack to cart";
    }
  }
}

function productCard(item) {
  let pendingAdds = 0,
    timer;
  const feedback = element("p", { class: "card-error", role: "alert" });
  const stockNum = Number(item.stock);
  const lowThreshold = Number(item.low_threshold ?? 0);
  const inCart = cartQtyFor(item.id);
  const available = stockNum > 0;
  const isLow = available && stockNum <= lowThreshold;
  const maxed = !available || inCart >= Math.min(9999, stockNum);
  const added = async () => {
    clearTimeout(timer);
    pendingAdds++;
    add.dataset.feedback = "pending";
    add.setAttribute("aria-busy", "true");
    feedback.textContent = "";
    let success = false;
    try {
      await addPacks(item, 1);
      success = true;
    } catch (error) {
      feedback.textContent = error.message;
      note(error.message, "error");
    } finally {
      if (--pendingAdds === 0) {
        add.removeAttribute("aria-busy");
        add.dataset.feedback = success ? "done" : "";
        if (success)
          timer = setTimeout(() => delete add.dataset.feedback, 1050);
      }
    }
  };
  const add = button(icon("shopping-cart"), added, "add", {
    title: !available
      ? "Sold out"
      : maxed
        ? "All available packs in cart"
        : "Add a pack to cart",
    "aria-label": "Add one pack of " + item.name,
    disabled: maxed,
  });
  const stockLabel = !available
    ? "Sold out"
    : isLow
      ? "Low stock · " + stockNum + " left"
      : stockNum + " packs left";
  const unitCents = unitCostCents(item.price, item.pack_size);
  const photoCount = (item.images || [item.image]).length;
  return element(
    "article",
    { class: "product-card", "data-product-id": item.id },
    element(
      "button",
      {
        type: "button",
        class: "product-photo",
        "aria-label": "Preview " + item.name,
        click: (e) => openPreview(item, e.currentTarget),
      },
      photo(item, ""),
      element(
        "span",
        {
          class: "stock-tag" + (!available ? " out" : isLow ? " low" : ""),
          title: packs(item.stock) + " available",
        },
        stockLabel,
      ),
      element(
        "span",
        { class: "in-cart-badge", hidden: inCart === 0 },
        inCart + " in cart",
      ),
      photoCount > 1
        ? element(
            "span",
            { class: "photo-count-pill", "aria-hidden": "true" },
            icon("images"),
            String(photoCount),
          )
        : null,
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
      element(
        "h3",
        {},
        button(
          item.name,
          (e) => openPreview(item, e.currentTarget),
          "product-title",
        ),
      ),
      element(
        "div",
        { class: "product-category-row" },
        element("span", { class: "badge-pill" }, item.category),
      ),
      element(
        "div",
        { class: "pack-meta" },
        icon("package"),
        "Pack of " + item.pack_size,
        element(
          "span",
          { class: "unit-cost-inline" },
          "· " + peso(unitCents / 100) + " / unit",
        ),
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
      feedback,
    ),
  );
}

let previewItem, previewTrigger;
function openPreview(item, trigger) {
  previewItem = item;
  previewTrigger = trigger;
  const thumbs = $("#previewThumbs");
  const mainPhoto = $("#previewPhoto");
  const prev = $("#previewPrevPhoto"),
    next = $("#previewNextPhoto"),
    counter = $("#previewPhotoCounter");
  const keys = item.images || [item.image];
  const views = ["Overview", "Detail", "In use"];
  let current = 0;
  const labels = keys.map(
    (_, index) =>
      item.name +
      " · " +
      (item.uploaded_photos ? "Photo " + (index + 1) : views[index]),
  );
  function selectPhoto(index) {
    current = (index + keys.length) % keys.length;
    mainPhoto.src = photoUrl(keys[current]);
    mainPhoto.alt = labels[current];
    $("#previewPhotoStatus").textContent =
      keys.length > 1 ? "Photo " + (current + 1) + " of " + keys.length : "";
    if (counter) {
      counter.hidden = keys.length < 2;
      counter.textContent = current + 1 + " / " + keys.length;
    }
    for (const [position, thumb] of [...thumbs.children].entries())
      thumb.setAttribute("aria-pressed", String(position === current));
  }
  thumbs.hidden = prev.hidden = next.hidden = keys.length < 2;
  thumbs.replaceChildren(
    ...keys.map((key, index) =>
      button(
        element("img", { src: photoUrl(key), alt: "" }),
        () => selectPhoto(index),
        "gallery-thumb",
        {
          "aria-label": labels[index],
          "aria-pressed": "false",
        },
      ),
    ),
  );
  prev.onclick = () => selectPhoto(current - 1);
  next.onclick = () => selectPhoto(current + 1);
  $(".preview-gallery").onkeydown = (event) => {
    if (keys.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key))
      return;
    event.preventDefault();
    selectPhoto(current + (event.key === "ArrowRight" ? 1 : -1));
  };
  selectPhoto(0);
  $("#previewSupplier").textContent = item.vendor;
  $("#previewCategory").textContent = item.category;
  $("#previewRating").replaceChildren(
    icon("star"),
    item.rating ? item.rating + " / 5" : "New",
  );
  $("#previewRating").setAttribute(
    "aria-label",
    item.rating ? item.rating + " out of 5 stars" : "Unrated",
  );
  $("#previewName").textContent = item.name;
  $("#previewPrice").textContent = peso(item.price);
  $("#previewSize").textContent = item.pack_size;
  const cents = Math.round(Number(item.price) * 100);
  $("#unitCostLabel").textContent =
    cents % item.pack_size ? "Approx. unit cost" : "Unit cost";
  $("#previewUnit").textContent = peso(
    Math.round(cents / item.pack_size) / 100,
  );
  $("#previewStock").textContent = packs(item.stock);
  const inCart = cartQtyFor(item.id);
  const cartNote = $("#previewCartNote");
  cartNote.hidden = inCart === 0;
  if (inCart > 0)
    cartNote.textContent =
      "Already in cart: " +
      packs(inCart) +
      " (" +
      units(inCart * Number(item.pack_size)) +
      ")";
  const limit = Math.max(0, Math.min(9999, Number(item.stock)) - inCart);
  const qty = $("#previewQty");
  qty.max = limit;
  qty.value = limit ? 1 : 0;
  qty.disabled = !limit;
  const presetsHost = $("#previewQuickQty");
  const presets = [1, 2, 5, 10].filter((n) => n <= limit);
  presetsHost.hidden = presets.length < 2;
  presetsHost.replaceChildren(
    ...presets.map((n) =>
      button(
        packs(n),
        () => {
          qty.value = String(n);
          updatePreview();
        },
        "preset-chip",
      ),
    ),
  );
  $("#previewForm .form-error").textContent = limit
    ? ""
    : item.stock
      ? "All available packs are in your cart."
      : "This item is sold out.";
  updatePreview();
  icons();
  bootstrap.Modal.getOrCreateInstance($("#packPreview")).show();
}

function updatePreview() {
  const field = $("#previewQty"),
    quantity = field.valueAsNumber;
  const valid = !field.disabled && field.validity.valid;
  $("#previewLess").disabled = !quantity || quantity <= 1;
  $("#previewMore").disabled = field.disabled || quantity >= Number(field.max);
  $("#previewUnits").textContent = valid
    ? units(quantity * previewItem.pack_size)
    : "Select available packs";
  $("#previewTotal").textContent = valid
    ? peso((Math.round(Number(previewItem.price) * 100) * quantity) / 100)
    : "—";
  $("#previewAdd").disabled = !valid;
}

function initPreview() {
  const qty = $("#previewQty"),
    form = $("#previewForm");
  qty.oninput = updatePreview;
  $("#previewLess").onclick = () => {
    qty.stepDown();
    updatePreview();
  };
  $("#previewMore").onclick = () => {
    qty.stepUp();
    updatePreview();
  };
  $("#packPreview").addEventListener("hidden.bs.modal", () =>
    previewTrigger?.focus({ preventScroll: true }),
  );
  form.onsubmit = async (e) => {
    e.preventDefault();
    const quantity = qty.valueAsNumber;
    if (!form.reportValidity() || qty.disabled) return;
    const restore = busy($("#previewAdd"), "Adding packs…");
    const modal = $("#packPreview");
    const keepOpen = (event) => event.preventDefault();
    modal.addEventListener("hide.bs.modal", keepOpen);
    qty.disabled = true;
    $("#previewLess").disabled = true;
    $("#previewMore").disabled = true;
    try {
      await addPacks(previewItem, quantity);
      modal.removeEventListener("hide.bs.modal", keepOpen);
      bootstrap.Modal.getInstance(modal).hide();
    } catch (error) {
      form.querySelector(".form-error").textContent = error.message;
    } finally {
      modal.removeEventListener("hide.bs.modal", keepOpen);
      restore();
      qty.disabled = false;
      updatePreview();
    }
  };
}

function catalogSkeletons(count = 6) {
  return Array.from({ length: count }, () =>
    element(
      "article",
      { class: "product-card product-skeleton", "aria-hidden": "true" },
      element("div", { class: "skeleton-block skeleton-photo" }),
      element(
        "div",
        { class: "product-info" },
        element("div", { class: "skeleton-block skeleton-line w-50" }),
        element("div", { class: "skeleton-block skeleton-line w-75 mt-2" }),
        element("div", { class: "skeleton-block skeleton-line w-40 mt-2" }),
        element("div", { class: "skeleton-block skeleton-line w-100 mt-3" }),
      ),
    ),
  );
}

/* Catalog Page */
async function catalogPage() {
  initPreview();
  const form = $("#filterForm"),
    list = $("#products");
  const sortToggle = $("#sort");
  const sortOptions = [...$("#sortOptions").querySelectorAll("[data-sort-value]")];
  const minField = form.elements.min;
  const maxField = form.elements.max;
  const priceError = $("#priceRangeError");
  let pending,
    timer,
    sort = "";

  function selectSort(option) {
    sort = option.dataset.sortValue;
    $("#sortValue").textContent = option.querySelector("span").textContent;
    for (const item of sortOptions)
      item.setAttribute("aria-pressed", String(item === option));
  }

  function renderActiveFilters(params) {
    const chips = [];
    const searchVal = $("#search").value.trim();
    if (searchVal)
      chips.push({
        label: 'Search: "' + searchVal + '"',
        clear: () => {
          $("#search").value = "";
        },
      });
    const cat = params.get("category");
    if (cat) {
      const catLabel =
        form.querySelector('input[name="category"]:checked')?.parentElement?.textContent?.trim() ||
        "Category";
      chips.push({
        label: catLabel,
        clear: () => {
          form.querySelector('input[name="category"][value=""]').checked = true;
        },
      });
    }
    const min = params.get("min");
    const max = params.get("max");
    if (min || max) {
      const text =
        min && max
          ? peso(min) + " – " + peso(max)
          : min
            ? "From " + peso(min)
            : "Up to " + peso(max);
      chips.push({
        label: "Price: " + text,
        clear: () => {
          minField.value = "";
          maxField.value = "";
        },
      });
    }
    const vendor = params.get("vendor");
    if (vendor) {
      const vendorLabel =
        form.elements.vendor.selectedOptions[0]?.textContent || "Supplier";
      chips.push({
        label: vendorLabel,
        clear: () => {
          form.elements.vendor.value = "";
        },
      });
    }
    const rating = params.get("rating");
    if (rating) {
      chips.push({
        label: rating + "★ and up",
        clear: () => {
          form.elements.rating.value = "";
        },
      });
    }
    if (params.get("stock") === "1") {
      chips.push({
        label: "In stock only",
        clear: () => {
          form.elements.stock.checked = false;
        },
      });
    }
    const host = $("#activeFilters");
    const mobileCount = $("#activeFilterCount");
    const drawerCount = chips.filter((c) => !c.label.startsWith("Search:")).length;
    if (mobileCount) {
      mobileCount.hidden = drawerCount === 0;
      mobileCount.textContent = String(drawerCount);
    }
    if (!chips.length) {
      host.hidden = true;
      host.replaceChildren();
      return;
    }
    host.hidden = false;
    host.replaceChildren(
      ...chips.map((chip) =>
        button(
          [chip.label, " ", icon("x")],
          () => {
            chip.clear();
            filter();
          },
          "filter-chip",
          { "aria-label": "Remove filter " + chip.label },
        ),
      ),
      button(
        "Clear all",
        () => {
          $("#reset").click();
        },
        "text-action",
      ),
    );
  }

  async function filter() {
    pending?.abort();
    pending = new AbortController();
    const signal = pending.signal;
    if (!form.reportValidity()) return;
    const params = new URLSearchParams(new FormData(form));
    const minVal = params.get("min");
    const maxVal = params.get("max");
    const badRange = Boolean(minVal && maxVal && Number(minVal) > Number(maxVal));
    minField.classList.toggle("is-invalid", badRange);
    maxField.classList.toggle("is-invalid", badRange);
    priceError.textContent = badRange
      ? "Minimum price must be at or below maximum price."
      : "";
    if (badRange) {
      $("#resultCount").textContent =
        "Minimum price must be at or below maximum price.";
      list.replaceChildren();
      return;
    }
    params.set("q", $("#search").value.trim());
    params.set("sort", sort);
    renderActiveFilters(params);
    list.setAttribute("aria-busy", "true");
    if (!catalogItems.length) list.replaceChildren(...catalogSkeletons());
    try {
      const items = await api("catalog?" + params, undefined, signal);
      if (signal.aborted) return;
      catalogItems = items;
      list.replaceChildren(...items.map(productCard));
      if (!items.length)
        list.append(
          empty(
            "No matching products",
            "Change a filter or reset your search.",
            false,
            () => $("#reset").click(),
          ),
        );
      const supplierCount = new Set(items.map((item) => item.vendor_id)).size;
      $("#resultCount").textContent =
        items.length +
        " " +
        (items.length === 1 ? "product" : "products") +
        " · " +
        supplierCount +
        " " +
        (supplierCount === 1 ? "supplier" : "suppliers");
      icons();
    } catch (e) {
      if (e.name !== "AbortError") {
        list.replaceChildren(
          empty("Catalog unavailable", e.message, false, () => filter()),
        );
        $("#resultCount").textContent = "Unable to load products";
      }
    } finally {
      list.removeAttribute("aria-busy");
    }
  }

  const schedule = () => {
    pending?.abort();
    clearTimeout(timer);
    timer = setTimeout(filter, 140);
  };
  form.addEventListener("input", schedule);
  $("#search").addEventListener("input", schedule);
  for (const option of sortOptions) {
    option.addEventListener("click", () => {
      clearTimeout(timer);
      selectSort(option);
      bootstrap.Dropdown.getOrCreateInstance(sortToggle).hide();
      sortToggle.focus();
      filter();
    });
  }
  form.addEventListener("submit", (event) => event.preventDefault());
  $("#reset").addEventListener("click", () => {
    clearTimeout(timer);
    form.reset();
    minField.classList.remove("is-invalid");
    maxField.classList.remove("is-invalid");
    priceError.textContent = "";
    $("#search").value = "";
    selectSort(sortOptions[0]);
    filter();
  });
  remember(await api("cart"));
  await filter();
}

/* Cart Page */
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
  const vendorGroups = group(cart.items, "vendor_id");
  const list = element("div");
  const summary = element(
    "aside",
    { class: "summary-card" },
    element("h2", {}, "Order summary"),
  );
  let totalPacks = 0;
  let totalUnits = 0;
  for (const items of vendorGroups) {
    const vendorSubtotal = sum(items);
    const box = element(
      "section",
      { class: "order-card" },
      element(
        "div",
        { class: "cart-vendor-header" },
        element("h3", {}, items[0].vendor),
        element("span", { class: "cart-vendor-subtotal" }, peso(vendorSubtotal)),
      ),
    );
    for (const p of items) {
      totalPacks += Number(p.quantity);
      totalUnits += Number(p.quantity) * Number(p.quoted_pack);
      const maxQty = Math.min(9999, Number(p.stock));
      const hasStockIssue = Number(p.stock) === 0 || Number(p.quantity) > Number(p.stock);
      const step = (qty, label, sign) =>
        button(
          sign,
          async () => {
            await changeCart(
              { id: p.id, delta: qty - p.quantity },
              "qty-" + p.id + "-" + sign,
            );
          },
          "",
          {
            "aria-label": label + " " + p.name,
            id: "qty-" + p.id + "-" + sign,
            disabled: sign === "+" && Number(p.quantity) >= maxQty,
          },
        );
      const qtyInput = element("input", {
        type: "number",
        class: "cart-qty-input",
        id: "qty-input-" + p.id,
        min: 1,
        max: Math.max(1, maxQty),
        step: 1,
        value: p.quantity,
        "aria-label": "Pack quantity for " + p.name,
      });
      qtyInput.addEventListener("change", async () => {
        const parsed = Number.parseInt(qtyInput.value, 10);
        if (!Number.isFinite(parsed) || parsed < 1) {
          qtyInput.value = String(p.quantity);
          note("Enter at least 1 pack, or remove the item.", "error");
          return;
        }
        const capped = maxQty > 0 ? Math.min(parsed, maxQty) : parsed;
        if (capped !== parsed) {
          note("Only " + packs(maxQty) + " available for " + p.name + ".", "error");
        }
        if (capped === Number(p.quantity)) {
          qtyInput.value = String(p.quantity);
          return;
        }
        await changeCart({ id: p.id, quantity: capped }, qtyInput.id);
      });
      box.append(
        element(
          "div",
          { class: "cart-row" + (hasStockIssue ? " cart-row-conflict" : "") },
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
            element(
              "div",
              { class: "line-submeta" },
              element(
                "span",
                { class: "muted small" },
                units(Number(p.quantity) * Number(p.quoted_pack)) +
                  " · " +
                  (Number(p.stock) > 0 ? packs(p.stock) + " in stock" : "Sold out"),
              ),
              hasStockIssue
                ? element(
                    "span",
                    { class: "badge-pill text-danger" },
                    Number(p.stock) === 0 ? "Sold out" : "Exceeds stock",
                  )
                : null,
            ),
          ),
          element(
            "div",
            { class: "quantity" },
            step(p.quantity - 1, "Decrease", "−"),
            qtyInput,
            step(p.quantity + 1, "Increase", "+"),
          ),
          element("strong", {}, peso(lineTotal(p) / 100)),
          button(
            icon("trash-2"),
            () => changeCart({ id: p.id, quantity: 0 }),
            "icon-btn",
            {
              "aria-label": "Remove " + p.name,
            },
          ),
        ),
      );
    }
    list.append(box);
    summary.append(
      element(
        "div",
        { class: "status-line mt-3" },
        items[0].vendor,
        element("strong", {}, peso(vendorSubtotal)),
      ),
    );
  }
  summary.append(
    element("hr"),
    element(
      "div",
      { class: "summary-meta-line" },
      element("span", {}, "Shipments"),
      element("span", {}, vendorGroups.length + " " + (vendorGroups.length === 1 ? "supplier" : "suppliers")),
    ),
    element(
      "div",
      { class: "summary-meta-line mb-3" },
      element("span", {}, "Volume"),
      element("span", {}, packs(totalPacks) + " · " + units(totalUnits)),
    ),
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
          if (pendingCartEdits) return;
          const restore = busy(btn, "Placing order…");
          for (const control of view.querySelectorAll(".cart-row button, .cart-row input"))
            control.disabled = true;
          try {
            await cartWrites;
            const result = await api("checkout", { key: cart.key });
            location.assign("/orders?placed=" + result.order_id);
          } catch (e) {
            if (e.status === 409) {
              try {
                remember(await api("cart"));
              } catch (refreshError) {
                note(refreshError.message, "error");
              }
            }
            renderCart(
              e.status
                ? e.message
                : "Order confirmation was interrupted. Retry to retrieve or place this same purchase order.",
            );
            $(".checkout")?.focus({ preventScroll: true });
          } finally {
            restore();
          }
        },
        "primary w-100 checkout",
      ),
    );
  summary.append(
    element(
      "div",
      { class: "summary-info-note" },
      "One purchase order creates independent fulfillment tracking per supplier.",
    ),
  );
  view.replaceChildren(element("div", { class: "cart-layout" }, list, summary));
  icons();
}

/* Orders & Ratings */
let vendorProducts = [],
  vendorOrders = [],
  chart = null,
  editProduct = null;

function orderRating(line, onRatingSaved) {
  const rating = element(
    "fieldset",
    {
      class: "rating-stars",
      "data-rating-product": line.product_id,
    },
    element("legend", { class: "visually-hidden" }, "Rating for " + line.title),
  );
  const label = element(
    "span",
    { class: "rating-value-label" },
    line.stars != null ? line.stars + " / 5" : "Rate",
  );
  for (let stars = 1; stars <= 5; stars++) {
    const radio = element("input", {
      class: "visually-hidden",
      type: "radio",
      name: "stars",
      value: stars,
      required: true,
      checked: Number(line.stars) === stars,
      "aria-label": stars + (stars === 1 ? " star" : " stars"),
    });
    radio.addEventListener("change", () => {
      label.textContent = stars + " / 5";
    });
    rating.append(element("label", { class: "rating-star" }, radio, icon("star")));
  }
  const save = element(
    "button",
    { type: "submit", class: "secondary" },
    line.stars == null ? "Save rating" : "Update rating",
  );
  const form = element("form", { class: "order-rating" }, rating, label, save);
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const stars = Number(new FormData(form).get("stars"));
    const restore = busy(save, "Saving…");
    rating.disabled = true;
    try {
      const result = await api("orders/rating", {
        line_id: line.line_id,
        stars,
      });
      line.stars = result.stars;
      document
        .querySelectorAll('[data-rating-product="' + line.product_id + '"]')
        .forEach((group) => {
          if (group.disabled && group !== rating) return;
          group.querySelector('input[value="' + result.stars + '"]').checked = true;
          const groupForm = group.closest("form");
          if (groupForm) {
            const lbl = groupForm.querySelector(".rating-value-label");
            if (lbl) lbl.textContent = result.stars + " / 5";
            if (group !== rating)
              groupForm.querySelector("button").textContent = "Update rating";
          }
        });
      note("Rating saved.");
      onRatingSaved?.(line.product_id, result.stars);
    } catch (error) {
      note(error.message, "error");
    } finally {
      rating.disabled = false;
      restore();
      if (line.stars != null) save.textContent = "Update rating";
    }
  };
  return form;
}

const orderStatusLabels = {
  received: "Order placed",
  processing: "In Transit",
  fulfilled: "Completed",
};

function buildStepper(status, fulfilledAt) {
  const rank = { received: 0, processing: 1, fulfilled: 2 }[status] ?? 0;
  const steps = [
    ["Order placed", "1"],
    ["In Transit", "2"],
    [fulfilledAt ? "Completed · " + formatDate(fulfilledAt) : "Completed", "3"],
  ];
  return element(
    "div",
    { class: "order-stepper", "aria-label": "Fulfillment progress" },
    ...steps.map(([text, num], index) => {
      const done = index < rank || (index === 2 && rank === 2);
      const current = index === rank && rank < 2;
      return element(
        "div",
        {
          class:
            "stepper-step" +
            (done ? " is-done" : current ? " is-current" : ""),
        },
        element("span", { class: "stepper-dot", "aria-hidden": "true" }, done ? "✓" : num),
        element("span", {}, text),
      );
    }),
  );
}

function renderOrders(rows, vendor = false, onRatingSaved, partial = false) {
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
      { class: "order-card", id: "purchase-" + first.order_id },
      element(
        "div",
        { class: "panel-title" },
        element("h3", {}, number),
        element("span", { class: "muted" }, formatDate(first.created_at)),
      ),
    );
    const vendorGroups = group(order, "group_id");
    for (const lines of vendorGroups) {
      const row = lines[0],
        header = element(
          "div",
          { class: "status-line mt-3" },
          element("strong", {}, vendor ? row.buyer : row.vendor),
          element("span", { class: "status " + row.status }, orderStatusLabels[row.status]),
        );
      box.append(header);
      box.append(buildStepper(row.status, row.fulfilled_at));
      for (const l of lines)
        box.append(
          element(
            "div",
            { class: "order-row" },
            element(
              "div",
              { class: "line-info" },
              element("strong", {}, l.title),
              element(
                "div",
                { class: "muted" },
                packs(l.quantity) +
                  " · " +
                  l.pack_size +
                  " units/pack · " +
                  peso(l.unit_price) +
                  " / pack",
              ),
            ),
            element("strong", {}, peso(lineTotal(l) / 100)),
            !vendor && row.status === "fulfilled"
              ? orderRating(l, onRatingSaved)
              : null,
          ),
        );
      if (vendorGroups.length > 1 || lines.length > 1) {
        box.append(
          element(
            "div",
            { class: "order-group-subtotal" },
            element("span", {}, (vendor ? "Your shipment" : row.vendor) + " subtotal"),
            element("strong", {}, peso(sum(lines))),
          ),
        );
      }
      if (vendor && row.status !== "fulfilled") {
        const status = row.status === "received" ? "processing" : "fulfilled";
        box.append(
          button(
            status === "processing" ? "Mark in transit" : "Mark complete",
            async (event) => {
              const restore = busy(event.currentTarget, "Updating…");
              try {
                await api("vendor/orders", { id: row.group_id, status });
                await loadVendor();
                note("Order status updated.");
                const nextAction = document.querySelector(
                  '[data-group="' + row.group_id + '"]',
                );
                (nextAction || $("[data-tab=fulfillment]")).focus({
                  preventScroll: true,
                });
              } catch (e) {
                note(e.message, "error");
                if (e.status === 409) await loadVendor();
              } finally {
                restore();
              }
            },
            "secondary mt-3",
            { "data-group": row.group_id },
          ),
        );
      }
    }
    if (vendor || order.length > 1) {
      box.append(
        element(
          "div",
          { class: "order-total" },
          (partial ? "Shown subtotal " : "Total ") + peso(sum(order)),
        ),
      );
    }
    if (!vendor) {
      box.append(
        element(
          "div",
          { class: "order-actions" },
          element(
            "a",
            {
              href: "/orders/" + first.order_id + "/print",
              class: "secondary print-order-link",
            },
            icon("printer"),
            "Print " + number,
          ),
          button(
            [icon("rotate-ccw"), "Buy Again"],
            (event) => openReorder(first.order_id, event.currentTarget),
            "secondary reorder-trigger",
            { "aria-label": "Buy Again · " + number },
          ),
        ),
      );
    }
    host.append(box);
  }
  icons();
}

function showPurchases(rows) {
  const views = {
    all: { heading: "Purchase history", matches: () => true },
    ship: {
      heading: "To Ship",
      matches: (row) => row.status === "received",
      empty: "No items are waiting to ship.",
    },
    receive: {
      heading: "To Receive",
      matches: (row) => row.status === "processing",
      empty: "No items are in transit.",
    },
    rate: {
      heading: "To Rate",
      matches: (row) => row.status === "fulfilled",
      empty: "Completed items will appear here for rating.",
    },
  };
  const controls = [...document.querySelectorAll("[data-purchase-view]")];
  const searchInput = $("#buyerOrderSearch");
  let active = "all";

  function updateShortcutCounts() {
    const counts = {
      all: new Set(rows.map((r) => r.order_id)).size,
      ship: new Set(rows.filter(views.ship.matches).map((r) => r.group_id)).size,
      receive: new Set(rows.filter(views.receive.matches).map((r) => r.group_id)).size,
      rate: rows.filter(views.rate.matches).length,
    };
    for (const [key, value] of Object.entries(counts)) {
      const badge = document.querySelector('[data-purchase-count="' + key + '"]');
      if (badge) badge.textContent = String(value);
    }
  }

  function ratingSaved(productId, stars) {
    for (const row of rows)
      if (row.product_id === productId) row.stars = stars;
  }

  function render() {
    const view = views[active];
    const query = (searchInput?.value || "").trim().toLowerCase();
    const viewMatches = rows.filter(view.matches);
    const matches = query
      ? viewMatches.filter(
          (row) =>
            ("po-" + row.order_id).includes(query.replace(/\s+/g, "")) ||
            row.vendor.toLowerCase().includes(query) ||
            row.title.toLowerCase().includes(query),
        )
      : viewMatches;
    $("#purchaseResults").textContent = view.heading;
    const orderTotal = new Set(matches.map((r) => r.order_id)).size;
    if ($("#buyerOrderSummary")) {
      $("#buyerOrderSummary").textContent =
        orderTotal + " " + (orderTotal === 1 ? "order" : "orders") + " shown";
    }
    if (!matches.length && (query || view.empty)) {
      $("#ordersView").replaceChildren(
        empty(
          query ? "No matching orders" : "No items",
          query
            ? "Try a different PO number, supplier, or product name."
            : view.empty,
          false,
          query
            ? () => {
                searchInput.value = "";
                render();
              }
            : null,
        ),
      );
    } else {
      renderOrders(matches, false, ratingSaved, active !== "all" || Boolean(query));
    }
  }

  updateShortcutCounts();
  for (const control of controls)
    control.onclick = () => {
      active = control.dataset.purchaseView;
      for (const item of controls)
        item.setAttribute("aria-pressed", String(item === control));
      render();
    };
  searchInput?.addEventListener("input", render);
  render();
}

/* Vendor Workspace */
let vendorFilter = "",
  chartType = "bar",
  salesRows = [];

function setTab(name, filtered = false) {
  vendorFilter = filtered && name === "inventory" ? name : "";
  if (filtered && name === "inventory") {
    $("#vendorInventoryFilters")?.reset();
  }
  if (filtered && name === "fulfillment") {
    const form = $("#vendorOrderFilters");
    form.reset();
    form.elements.status.value = "open";
    syncStatusPills();
  }
  renderVendorLists();
  for (const tab of document.querySelectorAll("[data-tab]")) {
    const active = tab.dataset.tab === name;
    tab.setAttribute("aria-pressed", String(active));
    document.getElementById(tab.dataset.tab).hidden = !active;
  }
  if (name === "overview") chart?.resize();
}

let editorTrigger, deleteTarget, deleteTrigger;
function openDelete(product, trigger) {
  deleteTarget = product;
  deleteTrigger = trigger;
  $("#deleteProductMessage").textContent =
    "Remove " +
    product.name +
    " from your catalog? Previous purchase orders will keep their records.";
  const form = $("#deleteProductForm");
  form.querySelector(".form-error").textContent = "";
  form.querySelector('[type="submit"]').disabled = false;
  bootstrap.Modal.getOrCreateInstance($("#deleteProductModal")).show();
}

function updateProductCalcPreview() {
  const form = $("#productForm");
  const preview = $("#productCalcPreview");
  if (!form || !preview) return;
  const packSize = Number(form.elements.pack_size.value);
  const price = Number(form.elements.price.value);
  const stock = Number(form.elements.stock.value);
  if (packSize > 0 && price > 0) {
    const perUnit = unitCostCents(price, packSize) / 100;
    const stockValue = Number.isFinite(stock) && stock >= 0 ? price * stock : 0;
    preview.textContent =
      "Unit cost: " +
      peso(perUnit) +
      " / unit · Inventory value at current stock: " +
      peso(stockValue);
  } else {
    preview.textContent = "";
  }
}

function openProduct(p = null) {
  editorTrigger = document.activeElement;
  editProduct = p;
  const form = $("#productForm");
  form.reset();
  clearFormValidation(form);
  $("#productModalTitle").textContent = p ? "Edit product" : "Add product";
  for (const [key, value] of Object.entries(
    p ?? { pack_size: 1, stock: 0, low_threshold: 3 },
  ))
    if (form.elements.namedItem(key))
      form.elements.namedItem(key).value = value;
  const fileInput = form.elements.namedItem("photos[]");
  fileInput.required = !p;
  fileInput.setCustomValidity("");
  const photos = $("#currentProductPhotos");
  photos.hidden = !p;
  photos.replaceChildren(
    ...(p?.images ?? []).map((image, index) =>
      element("img", {
        src: photoUrl(image),
        alt: "Current photo " + (index + 1),
      }),
    ),
  );
  const newPhotos = $("#newProductPhotos");
  newPhotos.hidden = true;
  newPhotos.replaceChildren();
  $("#photoHelp").textContent = p
    ? "Choose up to 3 photos to replace this gallery. JPEG, PNG, or WebP, 2 MB each."
    : "Add up to 3 JPEG, PNG, or WebP photos, 2 MB each. The first is the cover.";
  updateProductCalcPreview();
  bootstrap.Modal.getOrCreateInstance($("#productModal")).show();
}

function offerInventoryReview(form, latest) {
  const feedback = form.querySelector(".form-error");
  const changed = [...form.elements].filter(
    (field) =>
      field.name &&
      String(latest[field.name]) !== String(editProduct[field.name]),
  );
  feedback.textContent =
    "This product changed while you were editing. Review the current values before saving.";
  const list = element("ul");
  for (const field of changed) {
    const label =
      field.labels[0]?.firstChild?.textContent?.trim() || field.name;
    list.append(
      element(
        "li",
        {},
        label +
          " · Current: " +
          latest[field.name] +
          " · Your form: " +
          field.value,
      ),
    );
  }
  feedback.append(
    list,
    button(
      "Review and keep my edits",
      () => {
        for (const field of changed) {
          if (String(editProduct[field.name]) === field.value)
            field.value = latest[field.name];
        }
        editProduct = latest;
        feedback.textContent =
          "Latest changes reviewed. Check your values, then save.";
        updateProductCalcPreview();
        form.elements.namedItem("name").focus();
      },
      "secondary mt-2",
    ),
  );
}

async function downloadSales(event) {
  const restore = busy(event.currentTarget, "Downloading…");
  const period = $("#period").value;
  $("#period").disabled = true;
  try {
    const response = await fetch("/api/vendor/sales/export?period=" + period);
    if (!response.ok) throw new Error((await response.json()).error);
    const url = URL.createObjectURL(await response.blob());
    const link = element("a", {
      href: url,
      download: "forma-sales-" + period + ".csv",
    });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    note("Sales CSV downloaded.");
  } catch (error) {
    note(error.message + " Try downloading again.", "error");
  } finally {
    $("#period").disabled = false;
    restore();
  }
}

let salesRequest = 0,
  displayedPeriod;

function renderSalesChart(data) {
  const totalSales = data.reduce((sumVal, row) => sumVal + Number(row.amount), 0);
  const peak = data.reduce(
    (best, row) => (Number(row.amount) > Number(best.amount) ? row : best),
    data[0] || { label: "—", amount: 0 },
  );
  if ($("#salesSummary")) {
    $("#salesSummary").textContent =
      "Period total: " +
      peso(totalSales) +
      (totalSales > 0 ? " · Peak: " + peak.label + " (" + peso(peak.amount) + ")" : "");
  }
  const emptyOverlay = $("#chartEmpty");
  if (emptyOverlay) emptyOverlay.hidden = totalSales > 0;
  chart?.destroy();
  chart = new Chart($("#chart"), {
    type: chartType,
    data: {
      labels: data.map((x) => x.label),
      datasets: [
        {
          label: "Sales from completed orders",
          data: data.map((x) => x.amount),
          backgroundColor: "#4774e7",
          borderColor: "#4774e7",
          borderWidth: chartType === "line" ? 2.5 : 0,
          tension: 0.32,
          fill: chartType === "line",
          pointRadius: chartType === "line" ? 4 : 0,
          pointHoverRadius: 6,
          borderRadius: 6,
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
  recolorChart();
}

async function loadSales() {
  const request = ++salesRequest;
  const select = $("#period"),
    exportButton = $("#exportSales"),
    panel = $(".chart-box");
  const period = select.value;
  exportButton.disabled = true;
  panel.setAttribute("aria-busy", "true");
  let data;
  try {
    data = await api("vendor/sales?period=" + period);
  } catch (error) {
    if (request !== salesRequest) return;
    if (displayedPeriod) select.value = displayedPeriod;
    exportButton.disabled = !displayedPeriod;
    panel.removeAttribute("aria-busy");
    throw error;
  }
  if (request !== salesRequest) return;
  salesRows = data;
  displayedPeriod = period;
  exportButton.disabled = false;
  panel.removeAttribute("aria-busy");
  $("#salesFigures").replaceChildren(
    ...data.map((d) =>
      element("div", { class: "status-line" }, d.label, peso(d.amount)),
    ),
  );
  renderSalesChart(data);
  renderVendorMetrics();
}

function recolorChart() {
  if (!chart) return;
  const style = getComputedStyle(document.documentElement);
  const ink = style.getPropertyValue("--muted").trim(),
    line = style.getPropertyValue("--line").trim(),
    blue = style.getPropertyValue("--blue").trim(),
    wash = style.getPropertyValue("--blue-wash").trim();
  for (const scale of Object.values(chart.options.scales)) {
    scale.ticks.color = ink;
    scale.grid.color = line;
    scale.border.color = line;
  }
  chart.data.datasets[0].borderColor = blue;
  chart.data.datasets[0].backgroundColor = chartType === "line" ? wash : blue;
  chart.update("none");
}
window.addEventListener("forma:appearance", recolorChart);

function renderVendorMetrics() {
  const pending = group(
    vendorOrders.filter((r) => r.status !== "fulfilled"),
    "group_id",
  ).length;
  const lowItems = vendorProducts.filter(
    (p) => Number(p.stock) <= Number(p.low_threshold),
  );
  const low = lowItems.length;
  const periodSales = salesRows.reduce((acc, row) => acc + Number(row.amount), 0);
  const totalPacks = vendorProducts.reduce((acc, p) => acc + Number(p.stock), 0);
  const metric = (n, title, tab) =>
    button(
      element("span", {}, element("strong", {}, String(n)), title),
      () => {
        setTab(tab, true);
        document.querySelector("[data-tab=" + tab + "]").focus();
      },
      "panel metric-button",
    );
  const staticMetric = (value, label) =>
    element(
      "div",
      { class: "panel metric-card-static" },
      element("strong", {}, value),
      element("span", {}, label),
    );
  const host = $("#metrics");
  host.removeAttribute("aria-busy");
  host.replaceChildren(
    metric(pending, "Open orders", "fulfillment"),
    metric(low, "Products at or below stock threshold", "inventory"),
    staticMetric(
      salesRows.length ? peso(periodSales) : "—",
      displayedPeriod === "month"
        ? "Completed sales · 6 months"
        : "Completed sales · 7 days",
    ),
    staticMetric(
      String(vendorProducts.length),
      "Active products · " + packs(totalPacks) + " total",
    ),
  );
  const banner = $("#lowStockBanner");
  if (banner) {
    banner.hidden = low === 0;
    if (low > 0) {
      const names = lowItems.slice(0, 3).map((p) => p.name);
      const more = low - names.length;
      $("#lowStockBannerText").textContent =
        names.join(", ") +
        (more > 0 ? " and " + more + " more" : "") +
        (low === 1 ? " needs restocking." : " need restocking.");
    }
  }
}

async function loadVendor() {
  [vendorProducts, vendorOrders] = await Promise.all([
    api("vendor/products"),
    api("vendor/orders"),
  ]);
  renderVendorLists();
  await loadSales();
}

function renderVendorLists() {
  renderVendorMetrics();
  $("#inventoryFilter").hidden = vendorFilter !== "inventory";
  const filtersForm = $("#vendorInventoryFilters");
  const q = filtersForm?.elements.q.value.trim().toLowerCase() || "";
  const category = filtersForm?.elements.category.value || "";
  const health = filtersForm?.elements.health.value || "";
  const sortMode = filtersForm?.elements.sort.value || "default";

  let inventory =
    vendorFilter === "inventory"
      ? vendorProducts.filter((p) => Number(p.stock) <= Number(p.low_threshold))
      : [...vendorProducts];

  if (q) inventory = inventory.filter((p) => p.name.toLowerCase().includes(q));
  if (category)
    inventory = inventory.filter((p) => String(p.category_id) === category);
  if (health === "low")
    inventory = inventory.filter(
      (p) => Number(p.stock) > 0 && Number(p.stock) <= Number(p.low_threshold),
    );
  else if (health === "out")
    inventory = inventory.filter((p) => Number(p.stock) === 0);
  else if (health === "healthy")
    inventory = inventory.filter(
      (p) => Number(p.stock) > Number(p.low_threshold),
    );

  if (sortMode === "stock-asc")
    inventory.sort((a, b) => Number(a.stock) - Number(b.stock));
  else if (sortMode === "price-desc")
    inventory.sort((a, b) => Number(b.price) - Number(a.price));
  else if (sortMode === "name")
    inventory.sort((a, b) => a.name.localeCompare(b.name));

  if ($("#vendorInventoryCount")) {
    $("#vendorInventoryCount").textContent =
      inventory.length +
      " " +
      (inventory.length === 1 ? "product" : "products");
  }

  $("#inventoryView").replaceChildren(
    ...inventory.map((p) => {
      const stockNum = Number(p.stock);
      const thresholdNum = Number(p.low_threshold);
      const isLow = stockNum <= thresholdNum;
      const isOut = stockNum === 0;
      const meterMax = Math.max(1, thresholdNum * 3, stockNum);
      const pct = Math.min(100, Math.round((stockNum / meterMax) * 100));
      const perUnit = unitCostCents(p.price, p.pack_size) / 100;
      return element(
        "article",
        { class: "inv-item" },
        photo(p),
        element(
          "div",
          { class: "line-info" },
          element(
            "div",
            { class: "d-flex flex-wrap align-items-center gap-2" },
            element("strong", {}, p.name),
            element("span", { class: "badge-pill" }, p.category),
          ),
          element(
            "div",
            { class: "muted" },
            peso(p.price) +
              " / pack · Pack of " +
              p.pack_size +
              " (" +
              peso(perUnit) +
              " / unit)",
          ),
        ),
        element(
          "div",
          { class: "inventory-stock" },
          element("strong", {}, packs(p.stock)),
          element(
            "div",
            { class: "stock-health-bar", "aria-hidden": "true" },
            element("div", {
              class:
                "stock-health-fill" +
                (isOut ? " is-out" : isLow ? " is-low" : ""),
              style: "width:" + pct + "%",
            }),
          ),
          element(
            "small",
            { class: "d-block text-muted mt-1" },
            "Alert at ≤ " + p.low_threshold,
          ),
          isLow
            ? element(
                "small",
                { class: "d-block text-danger fw-semibold" },
                isOut ? "Sold out" : "Low stock",
              )
            : null,
        ),
        element(
          "div",
          { class: "inventory-actions" },
          button("Edit", () => openProduct(p), "secondary", {
            "aria-label": "Edit " + p.name,
          }),
          button(
            icon("trash-2"),
            (event) => openDelete(p, event.currentTarget),
            "danger-button",
            {
              "aria-label": "Delete " + p.name,
              title: "Delete product",
            },
          ),
        ),
      );
    }),
  );
  if (!inventory.length)
    $("#inventoryView").append(
      empty(
        "No matching products",
        vendorFilter === "inventory"
          ? "All products are above their stock threshold."
          : q || category || health
            ? "Try adjusting your inventory search or filters."
            : "Add a product to start your catalog.",
      ),
    );
  renderVendorOrders();
  icons();
}

function syncStatusPills() {
  const status = $("#vendorOrderFilters")?.elements.status.value ?? "";
  for (const pill of document.querySelectorAll("[data-status-pill]")) {
    pill.setAttribute("aria-pressed", String(pill.dataset.statusPill === status));
  }
}

function renderVendorOrders() {
  const fields = $("#vendorOrderFilters").elements;
  const po = fields.po.value.trim().toLowerCase().replace(/\s+/g, "");
  const buyer = fields.buyer.value.trim().toLowerCase();
  const status = fields.status.value;
  syncStatusPills();
  const orders = vendorOrders.filter((row) => {
    const matchesStatus =
      status === "open"
        ? row.status !== "fulfilled"
        : !status || row.status === status;
    return (
      matchesStatus &&
      ("po-" + row.order_id).includes(po) &&
      row.buyer.toLowerCase().includes(buyer)
    );
  });
  const count = new Set(orders.map((row) => row.order_id)).size;
  $("#vendorOrderCount").textContent =
    count + (count === 1 ? " order" : " orders");
  $("#ordersFilter").hidden = status !== "open";
  if (orders.length || !(po || buyer || status)) {
    renderOrders(orders, true);
  } else {
    const openOnly = status === "open" && !po && !buyer;
    $("#ordersView").replaceChildren(
      openOnly
        ? empty("All caught up", "There are no open orders.")
        : empty(
            "No matching orders",
            "Try a different PO number, buyer, or status.",
          ),
    );
  }
}

/* Profile & Account Settings */
function initProfilePhoto() {
  const form = $("#profilePhotoForm");
  const input = $("#profilePhoto");
  const save = form.querySelector("button[type=submit]");
  const remove = $("#removeProfilePhoto");
  const error = form.querySelector(".form-error");
  const preview = $("#profilePhotoPreview");
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    setFieldError(input, "");
    if (!file) return;
    if (!allowedTypes.has(file.type)) {
      setFieldError(input, "Choose a JPEG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFieldError(input, "The profile photo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        preview?.replaceChildren(element("img", { src: reader.result, alt: "" }));
      }
    };
    reader.readAsDataURL(file);
  });

  async function changePhoto(buttonEl, body, method) {
    if (buttonEl === save && !input.files?.length) {
      setFieldError(input, "Choose a JPEG, PNG, or WebP photo.");
      input.focus();
      return;
    }
    if (buttonEl === save && input.validationMessage) {
      input.focus();
      return;
    }
    const restore = busy(buttonEl, buttonEl === save ? "Saving…" : "Removing…");
    const other = buttonEl === save ? remove : save;
    other.disabled = input.disabled = true;
    error.textContent = "";
    try {
      const { photo } = await api("account/photo", body, undefined, method);
      for (const avatar of document.querySelectorAll("[data-account-avatar]")) {
        avatar.replaceChildren(
          photo
            ? element("img", { src: photo, alt: "" })
            : icon("circle-user-round"),
        );
      }
      preview?.replaceChildren(
        photo
          ? element("img", { src: photo, alt: "" })
          : icon("circle-user-round"),
      );
      form.reset();
      setFieldError(input, "");
      remove.hidden = !photo;
      icons();
      note(photo ? "Profile photo saved." : "Profile photo removed.");
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      other.disabled = input.disabled = false;
      restore();
      if (remove.hidden && buttonEl === remove) input.focus();
    }
  }

  form.noValidate = true;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!save.disabled) changePhoto(save, new FormData(form), "POST");
  });
  remove.addEventListener("click", () => changePhoto(remove, {}, "DELETE"));
}

/* Notifications */
function initNotifications() {
  const link = $("#notificationLink");
  if (!link) return;
  const badge = $("#notificationCount");
  const markRead = $("#readNotifications");
  const deleteAll = $("#deleteAllNotifications");
  const list = $(".notification-list");
  let changing = false;
  let requestVersion = 0;

  function updateBadge(unread) {
    badge.textContent = unread > 99 ? "99+" : unread;
    badge.hidden = unread === 0;
    link.setAttribute(
      "aria-label",
      unread ? "Notifications, " + unread + " unread" : "Notifications",
    );
    const tabCount = document.querySelector(".filter-tab-count");
    if (tabCount) {
      tabCount.hidden = unread === 0;
      tabCount.textContent = String(unread);
    }
  }

  async function refreshBadge() {
    if (document.hidden || changing) return;
    const version = ++requestVersion;
    try {
      const { unread } = await api("notifications");
      if (version === requestVersion) updateBadge(unread);
    } catch {}
  }

  window.setInterval(refreshBadge, 30000);
  document.addEventListener("visibilitychange", refreshBadge);

  async function changeNotifications(control, label, body, method, feedback) {
    changing = true;
    ++requestVersion;
    const otherControls = [
      ...document.querySelectorAll(
        "#readNotifications, #deleteAllNotifications, [data-delete-notification]",
      ),
    ].filter((buttonEl) => buttonEl !== control && !buttonEl.disabled);
    for (const buttonEl of otherControls) buttonEl.disabled = true;
    const restore = busy(control, label);
    try {
      const result = await api("notifications", body, undefined, method);
      updateBadge(result.unread);
      return result;
    } catch (error) {
      if (feedback) feedback.textContent = error.message;
      else note(error.message, "error");
      return null;
    } finally {
      restore();
      for (const buttonEl of otherControls) buttonEl.disabled = false;
      changing = false;
    }
  }

  function showEmptyInbox() {
    if (list) list.hidden = true;
    if (markRead) markRead.hidden = true;
    if (deleteAll) deleteAll.hidden = true;
    const emptyEl = $("#notificationsEmpty");
    emptyEl.hidden = false;
    emptyEl.focus();
  }

  markRead?.addEventListener("click", async () => {
    const result = await changeNotifications(
      markRead,
      "Marking as read…",
      { through: markRead.dataset.through },
      "POST",
    );
    if (!result) return;
    if (new URLSearchParams(location.search).has("unread")) {
      location.reload();
      return;
    }
    for (const item of list?.querySelectorAll(".notification-unread") ?? []) {
      item.classList.remove("notification-unread");
      item.querySelector(".notification-new").hidden = true;
    }
    markRead.disabled = true;
    note("Notifications marked as read.");
  });

  const dialog = $("#deleteNotificationsModal");
  if (dialog) {
    const cancel = dialog.querySelector('.modal-footer [data-bs-dismiss="modal"]');
    const confirm = $("#confirmDeleteNotifications");
    const feedback = dialog.querySelector(".form-error");
    dialog.addEventListener("shown.bs.modal", () => {
      feedback.textContent = "";
      cancel.focus();
    });
    dialog.addEventListener("hide.bs.modal", (event) => {
      if (changing) event.preventDefault();
    });
    confirm.addEventListener("click", async () => {
      feedback.textContent = "";
      cancel.disabled = true;
      const result = await changeNotifications(
        confirm,
        "Deleting…",
        { all: true },
        "DELETE",
        feedback,
      );
      cancel.disabled = false;
      if (!result) return;
      list?.replaceChildren();
      $("#olderNotifications")?.remove();
      deleteAll.hidden = true;
      dialog.addEventListener(
        "hidden.bs.modal",
        () => {
          showEmptyInbox();
          note("All notifications deleted.");
        },
        { once: true },
      );
      bootstrap.Modal.getOrCreateInstance(dialog).hide();
    });
  }

  list?.addEventListener("click", async (event) => {
    const control = event.target.closest("[data-delete-notification]");
    if (!control || changing) return;
    const item = control.closest("li");
    const neighbor = item.nextElementSibling || item.previousElementSibling;
    const result = await changeNotifications(
      control,
      "Deleting…",
      { id: control.dataset.deleteNotification },
      "DELETE",
    );
    if (!result) return;
    item.remove();
    if (markRead) markRead.disabled = result.unread === 0;
    if (neighbor) {
      neighbor.querySelector("[data-delete-notification]").focus();
    } else if ($("#olderNotifications") || location.search) {
      location.reload();
      return;
    } else {
      showEmptyInbox();
    }
    note("Notification deleted.");
  });
}

function initAccountForm() {
  const profile = page === "profile";
  const form = $(profile ? "#profileForm" : "#passwordForm");
  const error = form.querySelector(".form-error");
  const fields = [...form.querySelectorAll("input")];
  const validate = bindLiveValidation(
    form,
    profile
      ? {
          name: (f) => {
            const v = f.value.trim();
            if (!v) return "Enter a display name.";
            if ([...v].length > 100)
              return "Keep your display name at 100 characters or fewer.";
            return "";
          },
        }
      : {
          current_password: (f) =>
            f.value ? "" : "Enter your current password.",
          new_password: (f) => validateAuthPassword(f, { checkBytes: true }),
          confirm_password: (f, frm) => {
            if (!f.value) return "Confirm your new password.";
            if (f.value !== frm.elements.new_password.value)
              return "The new passwords do not match.";
            return "";
          },
        },
  );
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validate()) return;
    const buttonEl = form.querySelector("button[type=submit]");
    if (buttonEl.disabled) return;
    const body = Object.fromEntries(new FormData(form));
    const restore = busy(buttonEl, "Saving…");
    error.textContent = "";
    for (const field of fields) field.readOnly = true;
    try {
      if (profile) {
        const result = await api("account/profile", body);
        $("#profileName").value = result.name;
        for (const label of document.querySelectorAll("[data-member-name]")) {
          label.textContent = result.name;
        }
        clearFormValidation(form);
        note("Profile saved.");
      } else {
        await api("account/password", body);
        form.reset();
        clearFormValidation(form);
        updatePasswordRules($("#newPassword"));
        note("Password changed.");
      }
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      for (const field of fields) field.readOnly = false;
      restore();
    }
  });
}

async function init() {
  icons();
  initPasswordToggles();
  $("#logout")?.addEventListener("click", async (e) => {
    const restore = busy(e.currentTarget, "Signing out…");
    try {
      await api("logout", {});
      location.replace("/login");
    } catch (e) {
      restore();
      note(e.message, "error");
    }
  });
  initNotifications();
  $("#printOrder")?.addEventListener("click", () => window.print());
  if (page === "profile") initProfilePhoto();
  if (page === "profile" || page === "settings") initAccountForm();
  const purchaseTarget = /^#purchase-\d+$/.test(location.hash)
    ? location.hash.slice(1)
    : null;
  if (page === "catalog") await catalogPage();
  if (page === "cart") {
    try {
      remember(await api("cart"));
      renderCart();
    } catch (error) {
      $("#cartView").replaceChildren(
        empty("Unable to load cart", error.message, false, () =>
          location.reload(),
        ),
      );
    }
  }
  if (page === "orders") {
    try {
      const rows = await api("orders");
      showPurchases(rows);
      if (purchaseTarget)
        document.getElementById(purchaseTarget)?.scrollIntoView();
      const placed = new URLSearchParams(location.search).get("placed");
      if (placed && rows.some((r) => String(r.order_id) === placed))
        $("#confirmation").append(
          element(
            "div",
            { class: "success-note", role: "status" },
            "Purchase order PO-" + placed + " placed successfully.",
          ),
        );
    } catch (error) {
      $("#ordersView").replaceChildren(
        empty("Unable to load purchase orders", error.message, false, () =>
          location.reload(),
        ),
      );
    }
  }
  const copyRecoveryBtn = $("#copyRecoveryCode");
  if (copyRecoveryBtn) {
    copyRecoveryBtn.addEventListener("click", async () => {
      const codeText = $("#recoveryResult code")?.textContent || "";
      if (!codeText) return;
      try {
        await navigator.clipboard.writeText(codeText);
        const span = copyRecoveryBtn.querySelector("span");
        if (span) span.textContent = "Copied";
        note("Recovery code copied to clipboard.");
        setTimeout(() => {
          if (span) span.textContent = "Copy";
        }, 2500);
      } catch {
        note("Select and copy the code manually.", "info");
      }
    });
  }
  for (const form of document.querySelectorAll(
    "#resetPasswordForm, #recoveryForm",
  )) {
    const isRecovery = form.id === "recoveryForm";
    const validate = bindLiveValidation(
      form,
      isRecovery
        ? {
            current_password: (f) =>
              f.value ? "" : "Enter your current password.",
          }
        : {
            email: (f) =>
              f.validity.valid ? "" : "Enter a valid email address.",
            code: (f) =>
              /^[a-f0-9]{32}$/i.test(f.value.trim())
                ? ""
                : "Enter your 32-character recovery code.",
            new_password: (f) => validateAuthPassword(f, { checkBytes: true }),
            confirm_password: (f, frm) => {
              if (!f.value) return "Confirm your new password.";
              if (f.value !== frm.elements.new_password.value)
                return "The new passwords do not match.";
              return "";
            },
          },
    );
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validate()) return;
      const buttonEl = form.querySelector('button[type="submit"]');
      if (buttonEl.disabled) return;
      const feedback = form.querySelector(".form-error");
      const resultBox = $("#recoveryResult");
      const restore = busy(buttonEl, "Please wait…");
      feedback.textContent = "";
      try {
        const result = await api(
          isRecovery ? "account/recovery" : "reset-password",
          Object.fromEntries(new FormData(form)),
        );
        if (resultBox) {
          form.reset();
          clearFormValidation(form);
          resultBox.querySelector("code").textContent = result.code;
          resultBox.hidden = false;
        } else {
          location.replace("/login?reset=1");
        }
      } catch (error) {
        feedback.textContent = error.message;
      } finally {
        restore();
      }
    });
  }
  if (page === "register") {
    const form = $("#registerForm");
    const validate = bindLiveValidation(form, {
      name: (f) => {
        const v = f.value.trim();
        if (!v) return "Enter a display name.";
        if ([...v].length > 100)
          return "Keep your display name at 100 characters or fewer.";
        return "";
      },
      email: (f) => (f.validity.valid ? "" : "Enter a valid email address."),
      new_password: (f) => validateAuthPassword(f, { checkBytes: true }),
      confirm_password: (f, frm) => {
        if (!f.value) return "Confirm your password.";
        if (f.value !== frm.elements.new_password.value)
          return "Passwords do not match.";
        return "";
      },
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validate()) return;
      const buttonEl = form.querySelector('button[type="submit"]');
      if (buttonEl.disabled) return;
      const feedback = form.querySelector(".form-error");
      const restore = busy(buttonEl, "Creating account…");
      feedback.textContent = "";
      try {
        const user = await api(
          "register",
          Object.fromEntries(new FormData(form)),
        );
        location.replace(user.role === "vendor" ? "/vendor" : "/");
      } catch (error) {
        feedback.textContent = error.message;
        restore();
      }
    });
  }
  if (page === "login") {
    const form = $("#loginForm");
    const validate = bindLiveValidation(form, {
      email: (f) => (f.validity.valid ? "" : "Enter a valid email address."),
      password: (f) => (f.value ? "" : "Enter your password."),
    });
    for (const opt of document.querySelectorAll("[data-demo]"))
      opt.onclick = () => {
        form.email.value = opt.dataset.demo + "@forma.test";
        form.password.value = "FormaDemo24!";
        clearFormValidation(form);
        form.querySelector("button").focus();
      };
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (!validate()) return;
      const btn = form.querySelector("button");
      const restore = busy(btn, "Signing in…");
      form.querySelector(".form-error").textContent = "";
      try {
        const user = await api("login", Object.fromEntries(new FormData(form)));
        const next = new URLSearchParams(location.search).get("next");
        const destinations =
          user.role === "vendor" ? ["/vendor"] : ["/", "/orders", "/cart"];
        location.assign(
          [
            ...destinations,
            "/profile",
            "/settings",
            "/notifications",
          ].includes(next)
            ? next
            : destinations[0],
        );
      } catch (err) {
        form.querySelector(".form-error").textContent = err.message;
        restore();
      }
    };
  }
  if (page === "vendor") {
    document
      .querySelectorAll("[data-tab]")
      .forEach((tab) => (tab.onclick = () => setTab(tab.dataset.tab)));
    $("#reviewLowStock")?.addEventListener("click", () => {
      setTab("inventory", true);
      $("[data-tab=inventory]").focus();
    });
    $("#inventoryFilter button").onclick = () => {
      setTab("inventory");
      $("[data-tab=inventory]").focus();
    };
    const invFilters = $("#vendorInventoryFilters");
    invFilters?.addEventListener("submit", (event) => event.preventDefault());
    invFilters?.addEventListener("input", renderVendorLists);
    for (const chartBtn of document.querySelectorAll("[data-chart-type]")) {
      chartBtn.addEventListener("click", () => {
        chartType = chartBtn.dataset.chartType;
        for (const btn of document.querySelectorAll("[data-chart-type]")) {
          btn.setAttribute("aria-pressed", String(btn === chartBtn));
        }
        if (salesRows.length) renderSalesChart(salesRows);
      });
    }
    const orderFilters = $("#vendorOrderFilters");
    orderFilters.addEventListener("submit", (event) => event.preventDefault());
    orderFilters.addEventListener("input", renderVendorOrders);
    orderFilters.addEventListener("reset", () =>
      requestAnimationFrame(renderVendorOrders),
    );
    for (const pill of document.querySelectorAll("[data-status-pill]")) {
      pill.addEventListener("click", () => {
        orderFilters.elements.status.value = pill.dataset.statusPill;
        renderVendorOrders();
      });
    }
    $("#ordersFilter button").onclick = () => {
      orderFilters.reset();
      $("[data-tab=fulfillment]").focus();
    };
    $("#exportSales").onclick = downloadSales;
    $("#productModal").addEventListener("hidden.bs.modal", () => {
      if (editorTrigger?.isConnected) editorTrigger.focus();
      else $("#addProduct").focus();
    });
    $("#addProduct").onclick = () => openProduct();
    const productForm = $("#productForm");
    const allowedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const validateProductPhotos = (field) => {
      const files = [...field.files];
      if (!editProduct && files.length === 0)
        return "Choose 1 to 3 product photos.";
      if (files.length > 3) return "Choose up to three photos.";
      if (files.some((file) => !allowedPhotoTypes.has(file.type)))
        return "Use JPEG, PNG, or WebP photos only.";
      if (files.some((file) => file.size > 2 * 1024 * 1024))
        return "Each photo must be 2 MB or smaller.";
      return "";
    };
    const validateProductForm = bindLiveValidation(productForm, {
      name: (f) => {
        const v = f.value.trim();
        if (!v) return "Enter a product name.";
        if ([...v].length > 100)
          return "Keep the product name at 100 characters or fewer.";
        return "";
      },
      "photos[]": validateProductPhotos,
      pack_size: (f) => {
        const n = Number(f.value);
        return Number.isInteger(n) && n >= 1 && n <= 9999
          ? ""
          : "Enter a whole pack size between 1 and 9,999.";
      },
      price: (f) => {
        const n = Number(f.value);
        return /^\d{1,8}(\.\d{1,2})?$/.test(f.value.trim()) && n > 0
          ? ""
          : "Enter a positive peso amount with up to two decimals.";
      },
      stock: (f) => {
        const n = Number(f.value);
        return f.value !== "" && Number.isInteger(n) && n >= 0 && n <= 999999
          ? ""
          : "Enter a whole stock count (0–999,999).";
      },
      low_threshold: (f) => {
        const n = Number(f.value);
        return f.value !== "" && Number.isInteger(n) && n >= 0 && n <= 999999
          ? ""
          : "Enter a whole threshold (0–999,999).";
      },
    });
    productForm.addEventListener("input", updateProductCalcPreview);
    $("#productForm input[type=file]").onchange = (event) => {
      const field = event.currentTarget;
      const files = [...field.files];
      const error = validateProductPhotos(field);
      setFieldError(field, error);
      const previewBox = $("#newProductPhotos");
      previewBox.replaceChildren();
      previewBox.hidden = !files.length || Boolean(error);
      if (!error && files.length) {
        files.forEach((file, index) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              previewBox.append(
                element("img", {
                  src: reader.result,
                  alt: "Selected photo " + (index + 1),
                }),
              );
            }
          };
          reader.readAsDataURL(file);
        });
      }
    };
    const deleteModal = $("#deleteProductModal");
    const deleteForm = $("#deleteProductForm");
    deleteModal.addEventListener("hidden.bs.modal", () => {
      if (deleteTrigger?.isConnected) deleteTrigger.focus();
      else $("#addProduct").focus();
    });
    deleteForm.onsubmit = async (event) => {
      event.preventDefault();
      const { id, version } = deleteTarget;
      const submit = deleteForm.querySelector('[type="submit"]');
      const feedback = deleteForm.querySelector(".form-error");
      const restore = busy(submit, "Deleting…");
      const holdOpen = (hide) => hide.preventDefault();
      deleteModal.addEventListener("hide.bs.modal", holdOpen);
      let refreshRequired = false;
      try {
        await api("vendor/products", { id, version }, undefined, "DELETE");
        vendorProducts = vendorProducts.filter((product) => product.id !== id);
        renderVendorLists();
        deleteModal.removeEventListener("hide.bs.modal", holdOpen);
        bootstrap.Modal.getInstance(deleteModal).hide();
        note("Product deleted.");
      } catch (error) {
        refreshRequired = [404, 409].includes(error.status);
        feedback.textContent = refreshRequired
          ? error.message + " Close this dialog to continue."
          : error.message;
        if (refreshRequired)
          await loadVendor().catch((err) => note(err.message, "error"));
      } finally {
        deleteModal.removeEventListener("hide.bs.modal", holdOpen);
        restore();
        submit.disabled = refreshRequired;
      }
    };
    $("#period").onchange = () =>
      loadSales().catch((e) => note(e.message, "error"));
    productForm.onsubmit = async (e) => {
      e.preventDefault();
      if (!validateProductForm()) return;
      const form = e.currentTarget,
        btn = form.querySelector('button[type="submit"]');
      const restore = busy(btn, "Saving product…");
      form.querySelector(".form-error").textContent = "";
      const holdOpen = (event) => event.preventDefault();
      const modal = $("#productModal");
      modal.addEventListener("hide.bs.modal", holdOpen);
      const data = new FormData(form);
      if (editProduct) {
        data.set("id", editProduct.id);
        data.set("version", editProduct.version);
      }
      try {
        await api("vendor/products", data);
        modal.removeEventListener("hide.bs.modal", holdOpen);
        bootstrap.Modal.getInstance(modal).hide();
        note("Product saved.");
        try {
          await loadVendor();
        } catch {
          note(
            "Product saved. Reload the workspace to refresh inventory.",
            "error",
          );
        }
      } catch (err) {
        form.querySelector(".form-error").textContent = err.message;
        if (err.status === 409 && editProduct) {
          try {
            await loadVendor();
            const latest = vendorProducts.find((p) => p.id === editProduct.id);
            if (latest) offerInventoryReview(form, latest);
          } catch (refreshError) {
            note(refreshError.message, "error");
          }
        }
      } finally {
        modal.removeEventListener("hide.bs.modal", holdOpen);
        restore();
      }
    };
    try {
      await loadVendor();
      if (purchaseTarget) {
        setTab("fulfillment");
        document.getElementById(purchaseTarget)?.scrollIntoView();
      } else if (location.hash === "#inventory") {
        setTab("inventory");
      }
    } catch (error) {
      $("#metrics").replaceChildren(
        empty("Unable to load vendor workspace", error.message, false, () =>
          location.reload(),
        ),
      );
    }
  }
}
init().catch((error) => note(error.message, "error"));
