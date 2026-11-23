<section class="login-wrap">
  <div class="login-photo" aria-hidden="true"></div>
  <div class="login-panel">
    <h1>Reset password</h1>
    <p>Enter the one-time recovery code you saved from Settings.</p>
    <form id="resetPasswordForm" method="post" action="/api/reset-password">
      <label>Email address<input name="email" type="email" autocomplete="username" required maxlength="160"></label>
      <label>Recovery code<input name="code" type="text" autocomplete="off" spellcheck="false" required maxlength="32"></label>
      <label>New password<input name="new_password" type="password" autocomplete="new-password" required minlength="12"></label>
      <label>Confirm password<input name="confirm_password" type="password" autocomplete="new-password" required minlength="12"></label>
      <p class="form-error" role="alert"></p>
      <button type="submit" class="primary w-100">Reset password</button>
    </form>
    <p class="mt-3"><a class="text-action" href="/login">Back to sign in</a></p>
  </div>
</section>
