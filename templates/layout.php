<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="csrf-token" content="<?=h($_SESSION['csrf'])?>"><title><?=h(['catalog'=>'Marketplace','cart'=>'Purchase cart','orders'=>'Purchase orders','vendor'=>'Vendor workspace','login'=>'Sign in'][$page])?> · Forma Supply</title>
<link rel="icon" href="/static/img/forma.svg"><link rel="stylesheet" href="/static/vendor/bootstrap.min.css"><link rel="stylesheet" href="/static/css/app.css">
<script defer src="/static/vendor/lucide.js"></script><script defer src="/static/vendor/bootstrap.bundle.min.js"></script><?php if($page==='vendor'):?><script defer src="/static/vendor/chart.umd.min.js"></script><?php endif;?><script defer src="/static/js/app.js"></script>
</head><body data-page="<?=h($page)?>" data-role="<?=h($user['role']??'guest')?>">
<a class="skip" href="#main">Skip to content</a>
<header class="mast"><div class="frame mast-inner"><a href="/" class="brand" aria-label="Forma Supply home"><img src="/static/img/forma.svg" alt="" width="34" height="34"><span>Forma <b>Supply</b></span></a>
<nav aria-label="Workspace" class="mainnav"><?php if(($user['role']??'')==='vendor'):?><a class="active" href="/vendor">Vendor workspace</a><?php else:?>
<a class="<?=$page==='catalog'?'active':''?>" href="/">Marketplace</a><a class="<?=$page==='orders'?'active':''?>" href="/orders">Purchase orders</a><?php endif;?></nav>
<div class="nav-actions"><?php if(($user['role']??'')!=='vendor'):?><a href="/cart" class="cart-link" aria-label="Purchase cart"><i data-lucide="shopping-bag"></i><span>Cart</span><b id="cartCount"><?=h($count)?></b></a><?php endif;?>
<?php if($user):?><button id="logout" class="account" title="Sign out of <?=h($user['name'])?>"><i data-lucide="log-out"></i><span>Sign out</span></button><?php else:?><a href="/login" class="account" aria-label="Sign in"><i data-lucide="circle-user-round"></i><span>Sign in</span></a><?php endif;?></div></div></header>
<main id="main" class="frame"><?php require __DIR__.'/'.$page.'.php';?></main>
<footer class="frame"><span>Forma Supply</span><span>Wholesale workspace supplies</span></footer>
<div class="toast-container position-fixed bottom-0 end-0 p-3"><div id="notice" class="toast" role="status" aria-live="polite"><div class="d-flex align-items-center"><div id="noticeText" class="toast-body"></div><button type="button" class="btn-close me-3" data-bs-dismiss="toast" aria-label="Close notification"></button></div></div></div>
</body></html>
