<?php
$notificationCopy = [
    'low_stock'=>['package','Low stock','is at or below its stock threshold.'],
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
      <?php if ($latestNotification): ?>
        <div class="notification-heading-actions">
        <button type="button" class="secondary" id="readNotifications" data-through="<?=h($latestNotification)?>" <?=$unreadNotifications?'':'disabled'?>>Mark all as read</button>
        <button type="button" class="secondary notification-delete-all" id="deleteAllNotifications" data-bs-toggle="modal" data-bs-target="#deleteNotificationsModal">Delete all</button>
        </div>
      <?php endif; ?>
    </div>
    <nav class="notification-filter-tabs mb-3" aria-label="Notification filters">
      <a class="notification-filter-tab" href="/notifications" <?=$unreadOnly?'':'aria-current="page"'?>>All notifications</a>
      <a class="notification-filter-tab" href="/notifications?unread=1" <?=$unreadOnly?'aria-current="page"':''?>>Unread only<?php if($unreadNotifications):?> <span class="filter-tab-count" aria-hidden="true"><?=h($unreadNotifications)?></span><?php endif;?></a>
    </nav>
    <p class="muted" id="notificationsEmpty" tabindex="-1"<?=$notifications?' hidden':''?>><?=$unreadOnly?'No unread notifications.':'Order updates will appear here.'?></p>
    <?php if ($notifications): ?>
      <ul class="notification-list">
        <?php foreach ($notifications as $item):
            [$icon,$title,$action] = $notificationCopy[$item['event_type']];
            $vendorNotice = $item['event_type'] === 'new_order';
            $stockNotice = $item['event_type'] === 'low_stock';
            $other = $stockNotice ? $item['product'] : ($vendorNotice ? $item['buyer'] : $item['vendor']);
            $target = $stockNotice ? '/vendor#inventory' : ($vendorNotice?'/vendor':'/orders').'#purchase-'.$item['order_id'];
            $targetLabel = $stockNotice ? 'Open inventory' : 'PO-'.$item['order_id'];
            $date = new DateTimeImmutable($item['created_at']);
        ?>
          <li class="notification-item<?=$item['read_at']===null?' notification-unread':''?>">
            <div class="notification-symbol notification-symbol-<?=h($item['event_type'])?>" aria-hidden="true"><i data-lucide="<?=h($icon)?>"></i></div>
            <div>
              <p class="notification-title"><?=h($title)?> <span class="notification-new"<?=$item['read_at']!==null?' hidden':''?>>Unread</span></p>
              <p class="muted"><strong><?=h($other)?></strong> <?=h($action)?></p>
              <a class="back" href="<?=h($target)?>"><?=h($targetLabel)?><i data-lucide="arrow-right" aria-hidden="true"></i></a>
            </div>
            <div class="notification-actions">
              <time datetime="<?=h($date->format(DATE_ATOM))?>" title="<?=h($date->format('M j, Y g:i A'))?>"><?=h($date->format('M j, g:i A'))?></time>
              <button type="button" class="notification-delete" data-delete-notification="<?=h($item['id'])?>"
                aria-label="<?=h('Delete '.$title.' ('.$other.', '.$targetLabel.')')?>">
                <i data-lucide="trash-2" aria-hidden="true"></i>Delete
              </button>
            </div>
          </li>
        <?php endforeach; ?>
      </ul>
    <?php endif; ?>
    <?php if ($nextNotification): ?>
      <a id="olderNotifications" class="secondary mt-3" href="/notifications?before=<?=h($nextNotification)?><?=$unreadOnly?'&amp;unread=1':''?>">Load older</a>
    <?php endif; ?>
  </section>
</div>

<?php if ($latestNotification): ?>
  <div class="modal fade" id="deleteNotificationsModal" tabindex="-1" aria-labelledby="deleteNotificationsTitle" aria-describedby="deleteNotificationsMessage">
    <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
      <div class="modal-header"><h2 id="deleteNotificationsTitle">Delete all notifications?</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
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
