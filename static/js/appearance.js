(() => {
  const storageKey = "forma.appearance";
  const system = window.matchMedia("(prefers-color-scheme: dark)");
  function read() {
    try {
      return localStorage.getItem(storageKey);
    } catch {
      return "system";
    }
  }
  function apply(value) {
    const choice = ["light", "dark"].includes(value) ? value : "system";
    const root = document.documentElement;
    root.dataset.appearance = choice;
    root.dataset.bsTheme =
      choice === "system" ? (system.matches ? "dark" : "light") : choice;
    for (const option of document.querySelectorAll("[data-theme-choice]")) {
      option.checked = option.value === choice;
    }
    const control = document.getElementById("appearance");
    if (control) {
      const dark = root.dataset.bsTheme === "dark";
      control.title = dark ? "Switch to light mode" : "Switch to dark mode";
      control.setAttribute("aria-label", control.title);
      const glyph = document.createElement("i");
      glyph.dataset.lucide = dark ? "moon" : "sun";
      glyph.setAttribute("aria-hidden", "true");
      control.replaceChildren(glyph);
      window.lucide?.createIcons({ root: control });
    }
    window.dispatchEvent(new Event("forma:appearance"));
  }
  function select(choice) {
    const feedback = document.getElementById("themeFeedback");
    if (feedback) feedback.textContent = "";
    try {
      localStorage.setItem(storageKey, choice);
    } catch {
      if (feedback) feedback.textContent = "This browser couldn't save your theme.";
    }
    apply(choice);
  }
  apply(read());
  system.addEventListener("change", () =>
    apply(document.documentElement.dataset.appearance),
  );
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey || event.key === null) apply(read());
  });
  document.addEventListener("DOMContentLoaded", () => {
    const control = document.getElementById("appearance");
    apply(document.documentElement.dataset.appearance);
    control?.addEventListener("click", () => {
      select(document.documentElement.dataset.bsTheme === "dark" ? "light" : "dark");
    });
    for (const option of document.querySelectorAll("[data-theme-choice]")) {
      option.addEventListener("change", () => select(option.value));
    }
  });
})();
