<div class="page-title"><a class="back" href="/"><i data-lucide="chevron-left"></i> Marketplace</a><h1>Purchase orders</h1><p><?=h($user['name'])?> · Fulfillment by supplier</p></div><div id="confirmation"></div><div id="ordersView"></div>
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
