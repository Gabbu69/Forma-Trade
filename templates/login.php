<section class="login-wrap"><div class="login-photo" role="img" aria-label="Sunlit workspace with an oak desk and an adjustable task lamp"></div><div class="login-panel"><img src="/static/img/forma.svg" width="42" height="42" alt=""><h1>Sign in</h1><p>Access your buying or supplier workspace.</p>
<?php if (($_GET['reset'] ?? null) === '1'): ?><p class="success-note" role="status">Password reset. Sign in with your new password.</p><?php endif; ?><noscript><p role="alert">Enable JavaScript to sign in to Forma Trade.</p></noscript>
<form id="loginForm" method="post" action="/api/login">
  <div class="field-group">
    <label for="loginEmail">Email address</label>
    <input id="loginEmail" class="form-control" required type="email" name="email" autocomplete="username" maxlength="160" placeholder="name@company.com">
    <div class="invalid-feedback"></div>
  </div>
  <div class="field-group">
    <label for="loginPassword">Password</label>
    <div class="password-wrap">
      <input id="loginPassword" class="form-control" required type="password" name="password" autocomplete="current-password" maxlength="128">
      <span role="button" tabindex="0" class="password-toggle" data-toggle-password="loginPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
    </div>
    <div class="invalid-feedback"></div>
  </div>
  <div class="auth-row"><a class="text-action" href="/forgot-password">Forgot password?</a></div>
  <p class="form-error" role="alert"></p>
  <button class="primary w-100">Sign in</button>
</form>
<p class="auth-alternate mt-3">New to Forma Trade? <a class="text-action" href="/register">Create account</a></p>
<details class="demo"><summary>Use a demo account</summary><p>Select an account to fill the sign-in form.</p><div class="demo-list"><?php foreach(['north'=>['North Retail · Buyer','Buyer','north@forma.test'],'bay'=>['Bay Retail · Buyer','Buyer','bay@forma.test'],'form'=>['Form Studio · Vendor','Vendor','form@forma.test'],'field'=>['Field Objects · Vendor','Vendor','field@forma.test']] as $login=>[$title,$badge,$email]):?><button type="button" class="secondary demo-account-btn" data-demo="<?=h($login)?>"><span class="demo-account-main"><strong><?=h($title)?></strong><small class="muted"><?=h($email)?></small></span><span class="role-badge role-badge-<?=h(strtolower($badge))?>"><?=h($badge)?></span></button><?php endforeach;?></div></details></div></section>
