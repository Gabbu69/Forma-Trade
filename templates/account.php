<?php
$isVendor = $user['role'] === 'vendor';
?>
<div class="account-page">
  <header class="page-title">
    <h1><?=$page==='profile'?'Profile':'Settings'?></h1>
    <p><?=$page==='profile'?'Manage how your name appears in Forma Trade.':'Manage your appearance and password.'?></p>
  </header>
  <div class="account-layout">
    <aside class="panel account-summary" aria-label="Your account">
      <div class="account-avatar" data-account-avatar aria-hidden="true"><?php if ($accountPhoto): ?><img src="<?=h($accountPhoto)?>" alt=""><?php else: ?><i data-lucide="circle-user-round"></i><?php endif; ?></div>
      <p class="account-display-name" data-member-name><?=h($user['name'])?></p>
      <p class="muted account-email"><?=h($user['email'])?></p>
      <p class="account-role"><?=$isVendor?'Vendor account':'Buyer account'?></p>
      <nav class="account-nav" aria-label="Account pages">
        <a href="/profile" <?=$page==='profile'?'aria-current="page"':''?>><i data-lucide="user-round" aria-hidden="true"></i>Profile</a>
        <a href="/settings" <?=$page==='settings'?'aria-current="page"':''?>><i data-lucide="settings" aria-hidden="true"></i>Settings</a>
      </nav>
    </aside>
    <div class="account-panels">
      <?php if ($page==='profile'): ?>
        <section class="panel account-panel" aria-labelledby="photoHeading">
          <h2 id="photoHeading">Profile photo</h2>
          <form class="account-form photo-form" id="profilePhotoForm" method="post" enctype="multipart/form-data" action="/api/account/photo">
            <label for="profilePhoto">Choose a photo</label>
            <input id="profilePhoto" name="photo[]" type="file" required accept="image/jpeg,image/png,image/webp" aria-describedby="photoHelp">
            <p id="photoHelp" class="muted account-help">JPEG, PNG, or WebP, up to 2 MB.</p>
            <p class="form-error" role="alert"></p>
            <div class="photo-actions">
              <button class="primary" type="submit">Save photo</button>
              <button class="secondary" type="button" id="removeProfilePhoto"<?=$accountPhoto?'':' hidden'?>>Remove photo</button>
            </div>
          </form>
        </section>
        <section class="panel account-panel" aria-labelledby="profileDetails">
          <h2 id="profileDetails">Account details</h2>
          <form class="account-form" id="profileForm" method="post" action="/api/account/profile">
            <label for="profileName">Display name</label>
            <input id="profileName" name="name" type="text" required maxlength="100" autocomplete="nickname" value="<?=h($user['name'])?>" aria-describedby="profileNameHelp">
            <p id="profileNameHelp" class="muted account-help">Your name appears on purchase orders<?=$isVendor?' and your catalog listings':''?>.</p>
            <p class="form-error" role="alert"></p>
            <button class="primary" type="submit">Save profile</button>
          </form>
        </section>
        <section class="panel account-panel" aria-labelledby="profileWorkspace">
          <h2 id="profileWorkspace">Your workspace</h2>
          <p class="muted"><?=$isVendor?'Manage your products and fulfill orders.':'Track shipments and rate completed purchases.'?></p>
          <dl class="account-activity">
            <?php foreach ($activity as $label=>$total): ?>
              <div><dt><?=h($label)?></dt><dd><?=h($total)?></dd></div>
            <?php endforeach; ?>
          </dl>
          <a class="secondary" href="<?=$isVendor?'/vendor':'/orders'?>"><?=$isVendor?'Vendor workspace':'My Purchases'?> <i data-lucide="arrow-right" aria-hidden="true"></i></a>
        </section>
      <?php else: ?>
        <section class="panel account-panel" aria-labelledby="appearanceSettings">
          <h2 id="appearanceSettings">Appearance</h2>
          <p id="themeHelp" class="muted">Choose a theme for this browser. System follows your device.</p>
          <fieldset class="appearance-options" aria-describedby="themeHelp">
            <legend class="visually-hidden">Color theme</legend>
            <?php foreach (['system'=>['monitor','System'],'light'=>['sun','Light'],'dark'=>['moon','Dark']] as $value=>[$icon,$label]): ?>
              <label class="appearance-option">
                <input type="radio" class="visually-hidden" name="theme" value="<?=h($value)?>" data-theme-choice <?=$value==='system'?'checked':''?>>
                <i data-lucide="<?=h($icon)?>" aria-hidden="true"></i><?=h($label)?>
              </label>
            <?php endforeach; ?>
          </fieldset>
          <p id="themeFeedback" class="form-error" role="status"></p>
        </section>
        <section class="panel account-panel" aria-labelledby="passwordSettings">
          <h2 id="passwordSettings">Change password</h2>
          <form class="account-form" id="passwordForm" method="post" action="/api/account/password">
            <label for="currentPassword">Current password</label>
            <input type="password" id="currentPassword" name="current_password" autocomplete="current-password" required maxlength="128">
            <label for="newPassword">New password</label>
            <input type="password" id="newPassword" name="new_password" autocomplete="new-password" required minlength="12" aria-describedby="passwordHelp">
            <p id="passwordHelp" class="muted account-help">Use at least 12 characters.</p>
            <label for="confirmPassword">Confirm new password</label>
            <input type="password" id="confirmPassword" name="confirm_password" autocomplete="new-password" required>
            <p class="form-error" role="alert"></p>
            <button type="submit" class="primary">Change password</button>
          </form>
        </section>
        <section class="panel account-panel" aria-labelledby="recoveryHeading">
          <h2 id="recoveryHeading">Recovery code</h2>
          <p class="muted">Keep a one-time code somewhere safe. Generating a new code replaces the previous one.</p>
          <form class="account-form" id="recoveryForm" method="post" action="/api/account/recovery">
            <label for="recoveryPassword">Current password</label>
            <input id="recoveryPassword" name="current_password" type="password" required autocomplete="current-password" maxlength="128">
            <p class="form-error" role="alert"></p>
            <button class="secondary" type="submit">Generate recovery code</button>
            <p id="recoveryResult" role="status" hidden>Your recovery code <code class="user-select-all"></code></p>
          </form>
        </section>
      <?php endif; ?>
    </div>
  </div>
</div>
