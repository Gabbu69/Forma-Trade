<div class="page-title"><h1>My Purchases</h1><p><?=h($user['name'])?></p></div>
<div id="confirmation"></div>
<section class="panel purchase-shortcuts" aria-label="Filter purchases">
  <div class="purchase-shortcuts-grid">
    <button type="button" class="purchase-shortcut" data-purchase-view="all" aria-pressed="true" aria-controls="ordersView"><i data-lucide="history" aria-hidden="true"></i><span>History</span></button>
    <button type="button" class="purchase-shortcut" data-purchase-view="ship" aria-pressed="false" aria-controls="ordersView"><i data-lucide="package" aria-hidden="true"></i><span>To Ship</span></button>
    <button type="button" class="purchase-shortcut" data-purchase-view="receive" aria-pressed="false" aria-controls="ordersView"><i data-lucide="truck" aria-hidden="true"></i><span>To Receive</span></button>
    <button type="button" class="purchase-shortcut" data-purchase-view="rate" aria-pressed="false" aria-controls="ordersView"><i data-lucide="star" aria-hidden="true"></i><span>To Rate</span></button>
  </div>
</section>
<h2 class="visually-hidden" id="purchaseResults" aria-live="polite">Purchase history</h2>
<div id="ordersView" role="region" aria-labelledby="purchaseResults"></div>
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
