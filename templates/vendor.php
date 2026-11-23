<div class="page-title"><div class="overline"><?=h($user['name'])?></div><h1>Vendor workspace</h1><p>Manage your inventory, purchase orders, and sales.</p></div>
<div class="tabs" role="group" aria-label="Vendor workspace views"><button data-tab="overview" aria-pressed="true">Overview</button><button data-tab="inventory" aria-pressed="false">Inventory</button><button data-tab="fulfillment" aria-pressed="false">Orders</button></div>
<section id="overview"><div class="metrics" id="metrics"></div><div class="panel"><div class="panel-title"><h2>Sales from completed orders</h2><div class="report-tools"><select id="period" aria-label="Sales interval"><option value="day">Daily · 7 days</option><option value="month">Monthly · 6 months</option></select><button id="exportSales" class="secondary" disabled><i data-lucide="download"></i> Download CSV</button></div></div><div class="chart-box"><canvas id="chart" aria-label="Sales from completed orders by period" role="img"></canvas></div><details class="chart-data"><summary>View sales figures</summary><div id="salesFigures"></div></details></div></section>
<section id="inventory" hidden><div class="panel-title"><h2>Product inventory</h2><button id="addProduct" class="primary"><i data-lucide="plus"></i> Add product</button></div><div class="view-filter" id="inventoryFilter" hidden>Showing low-stock products <button class="text-action" type="button">Show all products</button></div><div id="inventoryView"></div></section>
<section id="fulfillment" hidden><h2>Orders</h2><div class="view-filter" id="ordersFilter" hidden>Showing open orders <button class="text-action" type="button">Show all orders</button></div><div id="ordersView"></div></section>
<div class="modal fade" id="productModal" tabindex="-1" aria-labelledby="productModalTitle"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-header"><h2 id="productModalTitle">Product details</h2><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><form id="productForm" class="modal-body">
<label>Product name<input name="name" required maxlength="100"></label>
<div class="row g-3">
  <label class="col-12 col-sm-6">Category<select name="category_id"><?php foreach($categories as $c):?><option value="<?=h($c['id'])?>"><?=h($c['name'])?></option><?php endforeach;?></select></label>
  <label class="col-12 col-sm-6">Product photos<input name="photos[]" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="photoHelp"></label>
</div>
<p class="muted photo-help" id="photoHelp">Add up to 3 JPEG, PNG, or WebP photos, 2 MB each. The first is the cover.</p>
<div class="editor-photos" id="currentProductPhotos" hidden></div>
<div class="form-pair"><label>Units per pack<input name="pack_size" type="number" min="1" max="9999" required></label><label>Pack price (₱)<input name="price" type="number" min=".01" max="99999999.99" step=".01" required></label></div><div class="form-pair"><label>Available packs<input name="stock" type="number" min="0" max="999999" required></label><label>Low-stock threshold<input name="low_threshold" type="number" min="0" max="999999" required></label></div><p class="form-error" role="alert"></p><button type="submit" class="primary w-100">Save product</button></form></div></div></div>
<div class="modal fade" id="deleteProductModal" tabindex="-1" aria-labelledby="deleteProductTitle">
  <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <form id="deleteProductForm">
      <div class="modal-header"><h2 id="deleteProductTitle">Delete product?</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body"><p id="deleteProductMessage"></p><p class="form-error" role="alert"></p></div>
      <div class="modal-footer"><button type="button" class="secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="danger-button">Delete product</button></div>
    </form>
  </div></div>
</div>
