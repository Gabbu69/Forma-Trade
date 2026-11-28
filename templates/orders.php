<div class="page-title"><h1>My Purchases</h1><p><?=h($user['name'])?> · Track supplier shipments, rate completed packs, and reorder.</p></div>
<div id="confirmation"></div>
<section class="panel purchase-shortcuts" aria-label="Filter purchases">
  <div class="purchase-shortcuts-grid">
    <button type="button" class="purchase-shortcut" data-purchase-view="all" aria-label="History" aria-pressed="true" aria-controls="ordersView"><i data-lucide="history" aria-hidden="true"></i><span class="shortcut-label">History</span><span class="shortcut-count" data-purchase-count="all" aria-hidden="true">0</span></button>
    <button type="button" class="purchase-shortcut" data-purchase-view="ship" aria-label="To Ship" aria-pressed="false" aria-controls="ordersView"><i data-lucide="package" aria-hidden="true"></i><span class="shortcut-label">To Ship</span><span class="shortcut-count" data-purchase-count="ship" aria-hidden="true">0</span></button>
    <button type="button" class="purchase-shortcut" data-purchase-view="receive" aria-label="To Receive" aria-pressed="false" aria-controls="ordersView"><i data-lucide="truck" aria-hidden="true"></i><span class="shortcut-label">To Receive</span><span class="shortcut-count" data-purchase-count="receive" aria-hidden="true">0</span></button>
    <button type="button" class="purchase-shortcut" data-purchase-view="rate" aria-label="To Rate" aria-pressed="false" aria-controls="ordersView"><i data-lucide="star" aria-hidden="true"></i><span class="shortcut-label">To Rate</span><span class="shortcut-count" data-purchase-count="rate" aria-hidden="true">0</span></button>
  </div>
  <div class="orders-toolbar">
    <label class="search orders-search"><i data-lucide="search" aria-hidden="true"></i><input id="buyerOrderSearch" type="search" maxlength="100" placeholder="Search PO #, supplier, or item" aria-label="Filter purchase orders"></label>
    <p class="muted mb-0" id="buyerOrderSummary" aria-live="polite"></p>
  </div>
</section>
<h2 class="visually-hidden" id="purchaseResults" aria-live="polite">Purchase history</h2>
<div id="ordersView" role="region" aria-labelledby="purchaseResults">
  <div class="panel orders-skeleton" aria-hidden="true">
    <div class="skeleton-block skeleton-line w-35"></div>
    <div class="skeleton-block skeleton-line w-100 mt-3"></div>
    <div class="skeleton-block skeleton-line w-75 mt-2"></div>
  </div>
</div>
<script defer src="/static/js/reorder.js"></script>
<div class="modal fade" id="reorderModal" tabindex="-1" aria-labelledby="reorderTitle">
  <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"><form class="modal-content" id="reorderForm">
    <div class="modal-header"><h2 id="reorderTitle">Buy Again</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close review"></button></div>
    <div class="modal-body">
      <p class="muted">Choose packs to add to your cart. Set a quantity to zero to skip that item.</p>
      <div id="reorderFeedback" role="alert" tabindex="-1"></div><div id="reorderLines"></div>
    </div>
    <div class="modal-footer reorder-footer">
      <div class="reorder-total">Total being added <strong id="reorderTotal"></strong></div>
      <button type="button" class="secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="submit" class="primary" id="confirmReorder">Add selected packs to cart</button>
    </div>
  </form></div>
</div>
