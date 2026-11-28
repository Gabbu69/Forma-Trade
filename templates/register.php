<section class="login-wrap">
  <div class="login-photo" aria-hidden="true"></div>
  <div class="login-panel">
    <img src="/static/img/forma.svg" width="42" height="42" alt="">
    <h1>Create account</h1>
    <p>Buy wholesale or sell to retailers on Forma Trade.</p>
    <form id="registerForm" method="post" action="/api/register">
      <fieldset class="register-roles">
        <legend>Account type</legend>
        <div class="appearance-options">
          <label class="appearance-option">
            <input type="radio" name="role" value="buyer" class="visually-hidden" checked required>
            <i data-lucide="shopping-bag" aria-hidden="true"></i>
            <span>Buyer</span>
            <small class="muted">Compare &amp; order packs</small>
          </label>
          <label class="appearance-option">
            <input type="radio" name="role" value="vendor" class="visually-hidden" required>
            <i data-lucide="store" aria-hidden="true"></i>
            <span>Vendor</span>
            <small class="muted">Manage stock &amp; POs</small>
          </label>
        </div>
      </fieldset>
      <div class="field-group">
        <label for="registerName">Display name</label>
        <input id="registerName" class="form-control" required name="name" maxlength="100" autocomplete="nickname" placeholder="e.g. Harbor Office Supply">
        <div class="invalid-feedback"></div>
      </div>
      <div class="field-group">
        <label for="registerEmail">Email address</label>
        <input id="registerEmail" class="form-control" required type="email" name="email" maxlength="160" autocomplete="username" placeholder="name@company.com">
        <div class="invalid-feedback"></div>
      </div>
      <div class="field-group">
        <label for="registerPassword">New password</label>
        <div class="password-wrap">
          <input id="registerPassword" class="form-control" required type="password" name="new_password" minlength="12" maxlength="72" autocomplete="new-password" aria-describedby="registerPasswordHelp">
          <span role="button" tabindex="0" class="password-toggle" data-toggle-password="registerPassword" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
        </div>
        <div class="invalid-feedback"></div>
        <div class="password-meter" id="registerPasswordHelp">
          <span class="password-rule" data-password-rule="length" data-target="registerPassword"><i data-lucide="circle" aria-hidden="true"></i>At least 12 characters (max 72 bytes)</span>
        </div>
      </div>
      <div class="field-group">
        <label for="registerConfirm">Confirm password</label>
        <div class="password-wrap">
          <input id="registerConfirm" class="form-control" required type="password" name="confirm_password" maxlength="72" autocomplete="new-password">
          <span role="button" tabindex="0" class="password-toggle" data-toggle-password="registerConfirm" aria-label="Show password" aria-pressed="false"><i data-lucide="eye" aria-hidden="true"></i></span>
        </div>
        <div class="invalid-feedback"></div>
      </div>
      <p class="form-error" role="alert"></p>
      <button class="primary w-100" type="submit">Create account</button>
    </form>
    <p class="auth-alternate mt-3">Already have an account? <a class="text-action" href="/login">Sign in</a></p>
  </div>
</section>
