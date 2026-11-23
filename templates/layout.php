<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="<?=h($_SESSION['csrf'])?>"><title><?=h(['catalog'=>'Marketplace','cart'=>'Purchase cart','orders'=>'Purchase orders','print-order'=>'Print purchase order','vendor'=>'Vendor workspace','login'=>'Sign in','register'=>'Create account','forgot-password'=>'Reset password','profile'=>'Profile','settings'=>'Settings','notifications'=>'Notifications','error'=>'Workspace message'][$page])?> · Forma Trade</title>
<script src="/static/js/appearance.js"></script>
<link rel="preload" href="/static/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="icon" href="/static/img/forma.svg"><link rel="stylesheet" href="/static/vendor/bootstrap.min.css"><link rel="stylesheet" href="/static/css/app.css">
<script defer src="/static/vendor/lucide.js"></script><script defer src="/static/vendor/bootstrap.bundle.min.js"></script><?php if($page==='vendor'):?><script defer src="/static/vendor/chart.umd.min.js"></script><?php endif;?><script defer src="/static/js/app.js"></script>
</head><body data-page="<?=h($page)?>" data-role="<?=h($user['role']??'guest')?>">
<a class="skip" href="#main">Skip to content</a>
<header class="mast"><div class="frame mast-inner"><a href="/" class="brand" aria-label="Forma Trade home"><img src="/static/img/forma.svg" alt="" width="34" height="34"><span>Forma <b>Trade</b></span></a>
<nav aria-label="Workspace" class="mainnav">
<?php if(($user['role']??'')==='vendor'):?>
  <a href="/vendor" <?=$page==='vendor'?'aria-current="page"':''?>><i data-lucide="layout-dashboard" aria-hidden="true"></i><span>Vendor workspace</span></a>
<?php else:?>
  <a href="/" <?=$page==='catalog'?'aria-current="page"':''?>><i data-lucide="store" aria-hidden="true"></i><span>Marketplace</span></a>
  <a href="/orders" <?=$page==='orders'?'aria-current="page"':''?>><i data-lucide="clipboard-list" aria-hidden="true"></i><span>Purchase orders</span></a>
<?php endif;?>
</nav>
<div class="nav-actions"><button type="button" class="appearance" id="appearance" aria-label="Switch color theme"><i data-lucide="sun" aria-hidden="true"></i></button><?php if(($user['role']??'')!=='vendor'):?><a href="/cart" class="cart-link" aria-label="Purchase cart"><i data-lucide="shopping-bag"></i><span>Cart</span><b id="cartCount"><?=h($count)?></b></a><?php endif;?>
<?php if($user):?>
  <a href="/notifications" class="notification-link" id="notificationLink" <?=$page==='notifications'?'aria-current="page"':''?> aria-label="Notifications<?=$unreadNotifications?', '.$unreadNotifications.' unread':''?>">
    <i data-lucide="bell" aria-hidden="true"></i><b id="notificationCount" aria-hidden="true"<?=$unreadNotifications?'':' hidden'?>><?=h($unreadNotifications > 99 ? '99+' : $unreadNotifications)?></b>
  </a>
  <div class="dropdown">
    <button type="button" class="account account-trigger" id="accountMenu" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Account menu">
      <span class="account-menu-avatar" data-account-avatar aria-hidden="true"><?php if ($accountPhoto): ?><img src="<?=h($accountPhoto)?>" alt=""><?php else: ?><i data-lucide="circle-user-round"></i><?php endif; ?></span><span>Account</span><i class="account-chevron" data-lucide="chevron-down" aria-hidden="true"></i>
    </button>
    <ul class="dropdown-menu dropdown-menu-end account-menu" aria-labelledby="accountMenu">
      <li class="account-menu-name">
        <span class="account-menu-avatar" data-account-avatar aria-hidden="true"><?php if ($accountPhoto): ?><img src="<?=h($accountPhoto)?>" alt=""><?php else: ?><i data-lucide="circle-user-round"></i><?php endif; ?></span>
        <span data-member-name><?=h($user['name'])?></span>
      </li>
      <li><a class="dropdown-item" href="/profile" <?=$page==='profile'?'aria-current="page"':''?>><i data-lucide="user-round" aria-hidden="true"></i>Profile</a></li>
      <li><a class="dropdown-item" href="/settings" <?=$page==='settings'?'aria-current="page"':''?>><i data-lucide="settings" aria-hidden="true"></i>Settings</a></li>
      <li><hr class="dropdown-divider"></li>
      <li><button type="button" id="logout" class="dropdown-item"><i data-lucide="log-out" aria-hidden="true"></i>Sign out</button></li>
    </ul>
  </div>
<?php else:?><a href="/login" class="account" aria-label="Sign in"><i data-lucide="circle-user-round" aria-hidden="true"></i><span>Sign in</span></a><?php endif;?></div></div></header>
<main id="main" class="frame"><?php if($page==='error'):?><section class="page-title"><h1><?=h($status)?></h1><p><?=h($message)?></p><a class="back mt-3" href="/">Return to workspace</a></section><?php else: require __DIR__.'/'.(in_array($page,['profile','settings'],true)?'account':$page).'.php'; endif;?></main>
<footer class="frame"><span>Forma Trade</span><span>Wholesale workspace supplies</span></footer>
<div class="toast-container position-fixed bottom-0 end-0 p-3">
  <div id="notice" class="toast" role="status" aria-live="polite" aria-atomic="true">
    <span class="notice-symbol" aria-hidden="true"></span>
    <div class="notice-content"><div id="noticeText"></div><a id="noticeCart" href="/cart" hidden>View cart</a></div>
    <button type="button" class="notice-close" data-bs-dismiss="toast" aria-label="Dismiss notification"><i data-lucide="x"></i></button>
  </div>
</div>
</body></html>
