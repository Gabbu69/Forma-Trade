<div class="page-title"><div class="overline"><?=h($user['name'])?></div><h1>Vendor workspace</h1><p>Manage your inventory, purchase orders, and sales.</p></div>
<div class="tabs" role="group" aria-label="Vendor workspace views"><button type="button" data-tab="overview" aria-pressed="true">Overview</button><button type="button" data-tab="inventory" aria-pressed="false">Inventory</button><button type="button" data-tab="fulfillment" aria-pressed="false">Orders</button></div>
<section id="overview">
  <div class="metrics" id="metrics" aria-busy="true">
    <div class="panel metric-skeleton" aria-hidden="true"><div class="skeleton-block skeleton-line w-40"></div><div class="skeleton-block skeleton-line w-75 mt-2"></div></div>
    <div class="panel metric-skeleton" aria-hidden="true"><div class="skeleton-block skeleton-line w-40"></div><div class="skeleton-block skeleton-line w-75 mt-2"></div></div>
  </div>
  <div class="alert-banner panel" id="lowStockBanner" hidden role="region" aria-label="Low stock alert summary">
    <div class="alert-banner-copy">
      <i data-lucide="triangle-alert" aria-hidden="true"></i>
      <div><strong>Low stock attention needed</strong><p class="muted mb-0" id="lowStockBannerText"></p></div>
    </div>
    <button type="button" class="secondary" id="reviewLowStock">Review low stock</button>
  </div>
  <div class="panel">
    <div class="panel-title">
      <div><h2>Sales from completed orders</h2><p class="muted mb-0" id="salesSummary">Loading sales metrics…</p></div>
      <div class="report-tools">
        <div class="chart-type-toggle" role="group" aria-label="Chart type">
          <button type="button" class="chart-type-btn" id="chartTypeBar" data-chart-type="bar" aria-pressed="true"><i data-lucide="bar-chart-3" aria-hidden="true"></i>Bar</button>
          <button type="button" class="chart-type-btn" id="chartTypeLine" data-chart-type="line" aria-pressed="false"><i data-lucide="trending-up" aria-hidden="true"></i>Line</button>
        </div>
        <select class="form-select" id="period" aria-label="Sales interval"><option value="day">Daily · 7 days</option><option value="month">Monthly · 6 months</option></select>
        <button type="button" id="exportSales" class="secondary" disabled><i data-lucide="download" aria-hidden="true"></i> Download CSV</button>
      </div>
    </div>
    <div class="chart-box">
      <canvas id="chart" aria-label="Sales from completed orders by period" role="img"></canvas>
      <div id="chartEmpty" class="chart-empty" hidden><i data-lucide="bar-chart-2" aria-hidden="true"></i><p>No completed sales recorded in this period yet.</p></div>
    </div>
    <details class="chart-data"><summary>View sales figures</summary><div id="salesFigures"></div></details>
  </div>
</section>
<section id="inventory" hidden>
  <div class="panel-title"><h2>Product inventory</h2><button type="button" id="addProduct" class="primary"><i data-lucide="plus" aria-hidden="true"></i> Add product</button></div>
  <div class="view-filter" id="inventoryFilter" hidden>Showing low-stock products <button class="text-action" type="button">Show all products</button></div>
  <form class="panel vendor-inventory-filters" id="vendorInventoryFilters" aria-label="Filter inventory">
    <label>Search product<input class="form-control" type="search" name="q" maxlength="100" placeholder="Search by name"></label>
    <label>Category<select class="form-select" name="category"><option value="">All categories</option><?php foreach($categories as $c):?><option value="<?=h($c['id'])?>"><?=h($c['name'])?></option><?php endforeach;?></select></label>
    <label>Stock status<select class="form-select" name="health"><option value="">All stock</option><option value="low">Low stock</option><option value="out">Sold out</option><option value="healthy">Healthy stock</option></select></label>
    <label>Sort by<select class="form-select" name="sort"><option value="default">Default order</option><option value="stock-asc">Lowest stock first</option><option value="price-desc">Price: high to low</option><option value="name">Name: A to Z</option></select></label>
    <p class="muted vendor-order-count mb-0" id="vendorInventoryCount" role="status"></p>
  </form>
  <div id="inventoryView"></div>
</section>
<section id="fulfillment" hidden aria-labelledby="vendorOrdersHeading">
  <h2 id="vendorOrdersHeading">Orders</h2>
  <div class="status-pills" id="vendorStatusPills" role="group" aria-label="Quick order status filters">
    <button type="button" class="status-pill" data-status-pill="" aria-pressed="true">All</button>
    <button type="button" class="status-pill" data-status-pill="open" aria-pressed="false">Open orders</button>
    <button type="button" class="status-pill" data-status-pill="received" aria-pressed="false">Order placed</button>
    <button type="button" class="status-pill" data-status-pill="processing" aria-pressed="false">In transit</button>
    <button type="button" class="status-pill" data-status-pill="fulfilled" aria-pressed="false">Completed</button>
  </div>
  <form class="panel vendor-order-filters" id="vendorOrderFilters" aria-label="Filter vendor orders">
    <label>PO number<input class="form-control" type="search" name="po" maxlength="30" placeholder="e.g. PO-1003"></label>
    <label>Buyer<input class="form-control" type="search" name="buyer" maxlength="100" placeholder="Search by name"></label>
    <label>Status
      <select class="form-select" name="status">
        <option value="">All statuses</option>
        <option value="open">Open orders</option>
        <option value="received">Order placed</option>
        <option value="processing">In transit</option>
        <option value="fulfilled">Completed</option>
      </select>
    </label>
    <button class="secondary" type="reset">Clear filters</button>
    <p class="muted vendor-order-count" id="vendorOrderCount" role="status"></p>
  </form>
  <div class="view-filter" id="ordersFilter" hidden>Showing open orders <button class="text-action" type="button">Show all orders</button></div>
  <div id="ordersView"></div>
</section>
<div class="modal fade" id="productModal" tabindex="-1" aria-labelledby="productModalTitle"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h2 id="productModalTitle">Product details</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><form id="productForm" class="modal-body">
<div class="field-group">
  <label for="productName">Product name</label>
  <input id="productName" class="form-control" name="name" required maxlength="100" placeholder="e.g. Studio Mechanical Keyboard">
  <div class="invalid-feedback"></div>
</div>
<div class="row g-3">
  <div class="col-12 col-sm-6 field-group"><label for="productCategory">Category</label><select id="productCategory" class="form-select" name="category_id"><?php foreach($categories as $c):?><option value="<?=h($c['id'])?>"><?=h($c['name'])?></option><?php endforeach;?></select><div class="invalid-feedback"></div></div>
  <div class="col-12 col-sm-6 field-group"><label for="productPhotos">Product photos</label><input id="productPhotos" class="form-control" name="photos[]" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="photoHelp"><div class="invalid-feedback"></div></div>
</div>
<p class="muted photo-help" id="photoHelp">Add up to 3 JPEG, PNG, or WebP photos, 2 MB each. The first is the cover.</p>
<div class="editor-photos" id="currentProductPhotos" hidden></div>
<div class="editor-photos" id="newProductPhotos" hidden aria-label="Selected photos preview"></div>
<div class="form-pair">
  <div class="field-group"><label for="productPackSize">Units per pack</label><input id="productPackSize" class="form-control" name="pack_size" type="number" min="1" max="9999" required><div class="invalid-feedback"></div></div>
  <div class="field-group"><label for="productPrice">Pack price (₱)</label><input id="productPrice" class="form-control" name="price" type="number" min=".01" max="99999999.99" step=".01" required><div class="invalid-feedback"></div></div>
</div>
<div class="form-pair">
  <div class="field-group"><label for="productStock">Available packs</label><input id="productStock" class="form-control" name="stock" type="number" min="0" max="999999" required><div class="invalid-feedback"></div></div>
  <div class="field-group"><label for="productThreshold">Low-stock threshold</label><input id="productThreshold" class="form-control" name="low_threshold" type="number" min="0" max="999999" required><div class="invalid-feedback"></div></div>
</div>
<div id="productCalcPreview" class="product-calc-preview muted" aria-live="polite"></div>
<p class="form-error" role="alert"></p><button type="submit" class="primary w-100">Save product</button></form></div></div></div>
<div class="modal fade" id="deleteProductModal" tabindex="-1" aria-labelledby="deleteProductTitle">
  <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <form id="deleteProductForm">
      <div class="modal-header"><h2 id="deleteProductTitle">Delete product?</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body"><p id="deleteProductMessage"></p><p class="form-error" role="alert"></p></div>
      <div class="modal-footer"><button type="button" class="secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="danger-button">Delete product</button></div>
    </form>
  </div></div>
</div>
