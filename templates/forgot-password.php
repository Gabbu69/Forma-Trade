<section class="login-wrap">
  <div class="login-photo" aria-hidden="true"></div>
  <div class="login-panel">
    <img src="/static/img/forma.svg" width="42" height="42" alt="">
    <h1>Reset password</h1>
    <p>Enter the one-time recovery code you saved from Settings.</p>
    <form id="resetPasswordForm" method="post" action="/api/reset-password">
      <div class="field-group">
        <label for="resetEmail">Email address</label>
        <input id="resetEmail" class="form-control" name="email" type="email" autocomplete="username" required maxlength="160" placeholder="name@company.com">
        <div class="invalid-feedback"></div>
      </div>
      <div class="field-group">
        <label for="resetCode">Recovery code</label>
        <input id="resetCode" class="form-control font-monospace" name="code" type="text" autocomplete="off" spellcheck="false" required maxlength="32" placeholder="32-character code from Settings">
        <div class="invalid-feedback"></div>
      </div>
      <div class="field-group">
        <label for="resetNewPassword">New password</label>
        <div class="password-wrap">
          <input id="resetNewPassword" class="form-control" name="new_password" type="password" autocomplete="new-password" required minlength="12" maxlength="72" aria-describedby="resetPasswordHelp">
          <span role="button" tabindex="0" class="password-toggle" data-toggle-password="resetNewPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
        </div>
        <div class="invalid-feedback"></div>
        <div class="password-meter" id="resetPasswordHelp">
          <span class="password-rule" data-password-rule="length" data-target="resetNewPassword"><i data-lucide="circle" aria-hidden="true"></i>At least 12 characters</span>
        </div>
      </div>
      <div class="field-group">
        <label for="resetConfirmPassword">Confirm password</label>
        <div class="password-wrap">
          <input id="resetConfirmPassword" class="form-control" name="confirm_password" type="password" autocomplete="new-password" required minlength="12" maxlength="72">
          <span role="button" tabindex="0" class="password-toggle" data-toggle-password="resetConfirmPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
        </div>
        <div class="invalid-feedback"></div>
      </div>
      <p class="form-error" role="alert"></p>
      <button type="submit" class="primary w-100">Reset password</button>
    </form>
    <p class="mt-3"><a class="text-action" href="/login">Back to sign in</a></p>
  </div>
</section>
