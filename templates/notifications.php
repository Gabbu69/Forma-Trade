<?php
$notificationCopy = [
    'new_order'=>['package-plus','New purchase order','placed an order from your catalog.'],
    'processing'=>['truck','Order in transit','marked your shipment in transit.'],
    'fulfilled'=>['package-check','Order completed','completed your shipment.'],
];
?>
<div class="account-page">
  <header class="page-title">
    <h1>Notifications</h1>
    <p>Updates on purchases and shipments.</p>
  </header>
  <section class="panel account-panel notification-panel" aria-labelledby="activityHeading">
    <div class="notification-heading">
      <h2 id="activityHeading">Recent activity</h2>
      <?php if ($notifications): ?>
        <div class="notification-heading-actions">
        <button type="button" class="secondary" id="readNotifications" data-through="<?=h($notifications[0]['id'])?>" <?=$unreadNotifications?'':'disabled'?>>Mark all as read</button>
        <button type="button" class="secondary notification-delete-all" id="deleteAllNotifications" data-bs-toggle="modal" data-bs-target="#deleteNotificationsModal">Delete all</button>
        </div>
      <?php endif; ?>
    </div>
    <p class="muted" id="notificationsEmpty" tabindex="-1"<?=$notifications?' hidden':''?>>Order updates will appear here.</p>
    <?php if ($notifications): ?>
      <ul class="notification-list">
        <?php foreach ($notifications as $item):
            [$icon,$title,$action] = $notificationCopy[$item['event_type']];
            $vendorNotice = $item['event_type'] === 'new_order';
            $other = $vendorNotice ? $item['buyer'] : $item['vendor'];
            $date = new DateTimeImmutable($item['created_at']);
        ?>
          <li class="notification-item<?=$item['read_at']===null?' notification-unread':''?>">
            <div class="notification-symbol" aria-hidden="true"><i data-lucide="<?=h($icon)?>"></i></div>
            <div>
              <p class="notification-title"><?=h($title)?> <span class="notification-new"<?=$item['read_at']!==null?' hidden':''?>>Unread</span></p>
              <p class="muted"><?=h($other)?> <?=h($action)?></p>
              <a class="back" href="<?=$vendorNotice?'/vendor':'/orders'?>#purchase-<?=h($item['order_id'])?>">PO-<?=h($item['order_id'])?><i data-lucide="arrow-right" aria-hidden="true"></i></a>
            </div>
            <div class="notification-actions">
              <time datetime="<?=h($date->format(DATE_ATOM))?>"><?=h($date->format('M j, g:i A'))?></time>
              <button type="button" class="notification-delete" data-delete-notification="<?=h($item['id'])?>"
                aria-label="<?=h('Delete '.$title.' for PO-'.$item['order_id'].' ('.$other.')')?>">
                <i data-lucide="trash-2" aria-hidden="true"></i>Delete
              </button>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
  </section>
</div>

<?php if ($notifications): ?>
  <div class="modal fade" id="deleteNotificationsModal" tabindex="-1" aria-labelledby="deleteNotificationsTitle" aria-describedby="deleteNotificationsMessage">
    <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h2 id="deleteNotificationsTitle">Delete all notifications?</h2></div>
      <div class="modal-body">
        <p id="deleteNotificationsMessage">This permanently clears your inbox.</p>
        <p class="form-error" role="alert"></p>
      </div>
      <div class="modal-footer">
        <button type="button" class="secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" class="danger-button" id="confirmDeleteNotifications">Delete all</button>
      </div>
    </div></div>
  </div>
<?php endif; ?>
