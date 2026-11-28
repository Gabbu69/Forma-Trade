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
      <p class="account-role"><span class="role-badge role-badge-<?=h($user['role'])?>"><?=$isVendor?'Vendor account':'Buyer account'?></span></p>
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
            <div class="photo-preview-row">
              <div class="photo-preview-box" id="profilePhotoPreview" aria-hidden="true">
                <?php if ($accountPhoto): ?><img src="<?=h($accountPhoto)?>" alt=""><?php else: ?><i data-lucide="circle-user-round"></i><?php endif; ?>
              </div>
              <div class="field-group flex-fill">
                <label for="profilePhoto">Choose a photo</label>
                <input id="profilePhoto" class="form-control" name="photo[]" type="file" required accept="image/jpeg,image/png,image/webp" aria-describedby="photoHelp">
                <div class="invalid-feedback"></div>
                <p id="photoHelp" class="muted account-help">JPEG, PNG, or WebP, up to 2 MB.</p>
              </div>
            </div>
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
            <div class="field-group">
              <label for="profileName">Display name</label>
              <input id="profileName" class="form-control" name="name" type="text" required maxlength="100" autocomplete="nickname" value="<?=h($user['name'])?>" aria-describedby="profileNameHelp">
              <div class="invalid-feedback"></div>
              <p id="profileNameHelp" class="muted account-help">Your name appears on purchase orders<?=$isVendor?' and your catalog listings':''?>.</p>
            </div>
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
              <label class="appearance-option appearance-option-<?=h($value)?>">
                <input type="radio" class="visually-hidden" name="theme" value="<?=h($value)?>" data-theme-choice <?=$value==='system'?'checked':''?>>
                <span class="theme-swatch theme-swatch-<?=h($value)?>" aria-hidden="true"></span>
                <span class="theme-option-label"><i data-lucide="<?=h($icon)?>" aria-hidden="true"></i><?=h($label)?></span>
              </label>
            <?php endforeach; ?>
          </fieldset>
          <p id="themeFeedback" class="form-error" role="status"></p>
        </section>
        <section class="panel account-panel" aria-labelledby="passwordSettings">
          <h2 id="passwordSettings">Change password</h2>
          <form class="account-form" id="passwordForm" method="post" action="/api/account/password">
            <div class="field-group">
              <label for="currentPassword">Current password</label>
              <div class="password-wrap">
                <input type="password" class="form-control" id="currentPassword" name="current_password" autocomplete="current-password" required maxlength="128">
                <span role="button" tabindex="0" class="password-toggle" data-toggle-password="currentPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
              </div>
              <div class="invalid-feedback"></div>
            </div>
            <div class="field-group">
              <label for="newPassword">New password</label>
              <div class="password-wrap">
                <input type="password" class="form-control" id="newPassword" name="new_password" autocomplete="new-password" required minlength="12" maxlength="72" aria-describedby="passwordHelp">
                <span role="button" tabindex="0" class="password-toggle" data-toggle-password="newPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
              </div>
              <div class="invalid-feedback"></div>
              <div class="password-meter" id="passwordHelp">
                <span class="password-rule" data-password-rule="length" data-target="newPassword"><i data-lucide="circle" aria-hidden="true"></i>Use at least 12 characters</span>
              </div>
            </div>
            <div class="field-group">
              <label for="confirmPassword">Confirm new password</label>
              <div class="password-wrap">
                <input type="password" class="form-control" id="confirmPassword" name="confirm_password" autocomplete="new-password" required maxlength="72">
                <span role="button" tabindex="0" class="password-toggle" data-toggle-password="confirmPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
              </div>
              <div class="invalid-feedback"></div>
            </div>
            <p class="form-error" role="alert"></p>
            <button type="submit" class="primary">Change password</button>
          </form>
        </section>
        <section class="panel account-panel" aria-labelledby="recoveryHeading">
          <h2 id="recoveryHeading">Recovery code</h2>
          <p class="muted">Keep a one-time code somewhere safe. Generating a new code replaces the previous one.</p>
          <form class="account-form" id="recoveryForm" method="post" action="/api/account/recovery">
            <div class="field-group">
              <label for="recoveryPassword">Current password</label>
              <div class="password-wrap">
                <input id="recoveryPassword" class="form-control" name="current_password" type="password" required autocomplete="current-password" maxlength="128">
                <span role="button" tabindex="0" class="password-toggle" data-toggle-password="recoveryPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
              </div>
              <div class="invalid-feedback"></div>
            </div>
            <p class="form-error" role="alert"></p>
            <button class="secondary" type="submit">Generate recovery code</button>
            <div id="recoveryResult" class="recovery-result" role="status" hidden>
              <span>Your recovery code</span>
              <div class="recovery-code-row">
                <code class="user-select-all"></code>
                <button type="button" class="secondary btn-sm" id="copyRecoveryCode"><i data-lucide="copy" aria-hidden="true"></i><span>Copy</span></button>
              </div>
            </div>
          </form>
        </section>
      <?php endif; ?>
    </div>
  </div>
</div>
