<?php
$order = $orderLines[0];
$suppliers = [];
foreach ($orderLines as $line) $suppliers[$line['group_id']][] = $line;
$peso = static fn(int $cents): string => '₱'.number_format(intdiv($cents, 100)).'.'.str_pad((string)($cents % 100), 2, '0', STR_PAD_LEFT);
$total = 0;
?>
<article class="purchase-print account-page">
  <header class="page-title">
    <p class="print-brand">Forma Trade</p>
    <h1>Purchase order PO-<?=h($order['order_id'])?></h1>
    <p><?=h($order['buyer'])?> · <?=h(substr($order['created_at'],0,10))?></p>
    <div class="print-actions">
      <a class="secondary" href="/orders#purchase-<?=h($order['order_id'])?>">Back to purchases</a>
      <button class="primary" id="printOrder" type="button">Print purchase order</button>
    </div>
  </header>
  <?php foreach ($suppliers as $lines): ?>
    <section class="panel">
      <h2><?=h($lines[0]['vendor'])?></h2>
      <div class="print-table-wrap">
        <table class="print-lines">
          <thead><tr><th scope="col">Product</th><th scope="col">Units per pack</th><th scope="col">Packs</th><th scope="col">Pack price</th><th scope="col">Amount</th></tr></thead>
          <tbody>
          <?php foreach ($lines as $line):
              $price = (int)str_replace('.', '', $line['unit_price']);
              $amount = $price * $line['quantity'];
              $total += $amount;
          ?>
            <tr><th scope="row"><?=h($line['title'])?></th><td><?=h($line['pack_size'])?></td><td><?=h($line['quantity'])?></td><td><?=h($peso($price))?></td><td><?=h($peso($amount))?></td></tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </section>
  <?php endforeach; ?>
  <p class="purchase-print-total">Order total <strong><?=h($peso($total))?></strong></p>
</article>
