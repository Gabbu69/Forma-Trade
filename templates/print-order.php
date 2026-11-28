<?php
$order = $orderLines[0];
$suppliers = [];
foreach ($orderLines as $line) $suppliers[$line['group_id']][] = $line;
$peso = static fn(int $cents): string => '₱'.number_format(intdiv($cents, 100)).'.'.str_pad((string)($cents % 100), 2, '0', STR_PAD_LEFT);
$statusLabels = ['received'=>'Order placed','processing'=>'In Transit','fulfilled'=>'Completed'];
$total = 0;
$totalPacks = 0;
$totalUnits = 0;
?>
<article class="purchase-print account-page">
  <header class="page-title print-header">
    <div>
      <p class="print-brand">Forma Trade · Wholesale Purchase Order</p>
      <h1>Purchase order PO-<?=h($order['order_id'])?></h1>
      <p><?=h($order['buyer'])?> · Issued <?=h(substr($order['created_at'],0,10))?> · <?=h(count($suppliers))?> <?=count($suppliers)===1?'supplier':'suppliers'?></p>
    </div>
    <div class="print-actions">
      <a class="secondary" href="/orders#purchase-<?=h($order['order_id'])?>">Back to purchases</a>
      <button class="primary" id="printOrder" type="button">Print purchase order</button>
    </div>
  </header>
  <?php foreach ($suppliers as $lines):
      $supplierSubtotal = 0;
      $supplierStatus = $lines[0]['status'];
  ?>
    <section class="panel print-supplier-section">
      <div class="status-line mb-3">
        <h2><?=h($lines[0]['vendor'])?></h2>
        <span class="status <?=h($supplierStatus)?>"><?=h($statusLabels[$supplierStatus] ?? $supplierStatus)?></span>
      </div>
      <div class="print-table-wrap">
        <table class="print-lines">
          <thead><tr><th scope="col">Product</th><th scope="col">Units / pack</th><th scope="col">Packs</th><th scope="col">Total units</th><th scope="col">Pack price</th><th scope="col">Amount</th></tr></thead>
          <tbody>
          <?php foreach ($lines as $line):
              $price = (int)str_replace('.', '', $line['unit_price']);
              $amount = $price * $line['quantity'];
              $units = (int)$line['pack_size'] * (int)$line['quantity'];
              $supplierSubtotal += $amount;
              $total += $amount;
              $totalPacks += (int)$line['quantity'];
              $totalUnits += $units;
          ?>
            <tr><th scope="row"><?=h($line['title'])?></th><td><?=h($line['pack_size'])?></td><td><?=h($line['quantity'])?></td><td><?=h($units)?></td><td><?=h($peso($price))?></td><td><?=h($peso($amount))?></td></tr>
          <?php endforeach; ?>
          </tbody>
          <tfoot>
            <tr><th scope="row" colspan="5" class="text-end muted">Supplier subtotal</th><td><strong><?=h($peso($supplierSubtotal))?></strong></td></tr>
          </tfoot>
        </table>
      </div>
    </section>
  <?php endforeach; ?>
  <section class="panel purchase-print-summary">
    <div class="muted"><?=h($totalPacks)?> <?=h($totalPacks===1?'pack':'packs')?> · <?=h($totalUnits)?> total units</div>
    <p class="purchase-print-total mb-0">Order total <strong><?=h($peso($total))?></strong></p>
  </section>
</article>
