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
            <i data-lucide="shopping-bag" aria-hidden="true"></i>Buyer
          </label>
          <label class="appearance-option">
            <input type="radio" name="role" value="vendor" class="visually-hidden" required>
            <i data-lucide="store" aria-hidden="true"></i>Vendor
          </label>
        </div>
      </fieldset>
      <label>Display name<input required name="name" maxlength="100" autocomplete="nickname"></label>
      <label>Email address<input required type="email" name="email" maxlength="160" autocomplete="username"></label>
      <label>New password<input required type="password" name="new_password" minlength="12" autocomplete="new-password" aria-describedby="registerPasswordHelp"></label>
      <p class="muted small mb-0" id="registerPasswordHelp">Use at least 12 characters.</p>
      <label>Confirm password<input required type="password" name="confirm_password" autocomplete="new-password"></label>
      <p class="form-error" role="alert"></p>
      <button class="primary w-100" type="submit">Create account</button>
    </form>
    <p class="auth-alternate mt-3">Already have an account? <a class="text-action" href="/login">Sign in</a></p>
  </div>
</section>
